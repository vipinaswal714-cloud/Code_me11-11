import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import server, {
  resolveClientIp,
  checkDailyQuota,
  isRateLimited,
  verifyEnvironment
} from '../server/proxy.js';

describe('Proxy Security & Gemini API Endpoints', () => {
  describe('Startup Environment Verification', () => {
    it('refuses to start when GEMINI_API_KEY is missing', () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const check = verifyEnvironment();
      assert.equal(check.valid, false);
      assert.match(check.error, /GEMINI_API_KEY is missing/i);

      process.env.GEMINI_API_KEY = originalKey || 'mock-gemini-key';
    });

    it('validates environment successfully when GEMINI_API_KEY is present', () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const check = verifyEnvironment();
      assert.equal(check.valid, true);
    });
  });

  describe('Client IP Resolution & TRUST_PROXY Protection', () => {
    it('uses socket remoteAddress by default and ignores spoofed X-Forwarded-For when TRUST_PROXY is false', () => {
      const mockReq = {
        socket: { remoteAddress: '192.168.1.50' },
        headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' }
      };

      const resolvedIp = resolveClientIp(mockReq, false);
      assert.equal(resolvedIp, '192.168.1.50', 'Must use direct socket IP when trustProxy is disabled');
    });

    it('honors X-Forwarded-For only when TRUST_PROXY is true', () => {
      const mockReq = {
        socket: { remoteAddress: '127.0.0.1' },
        headers: { 'x-forwarded-for': '203.0.113.195, 10.0.0.1' }
      };

      const resolvedIp = resolveClientIp(mockReq, true);
      assert.equal(resolvedIp, '203.0.113.195', 'Must extract first client IP when trustProxy is enabled');
    });

    it('falls back to 127.0.0.1 if socket address is missing', () => {
      const mockReq = { socket: {}, headers: {} };
      const resolvedIp = resolveClientIp(mockReq, false);
      assert.equal(resolvedIp, '127.0.0.1');
    });
  });

  describe('Daily Request & Token Cap Enforcement', () => {
    it('allows requests within daily request and token limits', () => {
      const quota = checkDailyQuota('10.0.0.1', 100, { maxRequests: 5, maxTokens: 1000 });
      assert.equal(quota.allowed, true);
      assert.equal(quota.requestsRemaining, 4);
      assert.equal(quota.tokensRemaining, 900);
    });

    it('blocks requests exceeding daily request cap', () => {
      const testIp = '10.0.0.2';
      const limits = { maxRequests: 2, maxTokens: 5000 };

      const r1 = checkDailyQuota(testIp, 50, limits);
      assert.equal(r1.allowed, true);
      const r2 = checkDailyQuota(testIp, 50, limits);
      assert.equal(r2.allowed, true);

      const r3 = checkDailyQuota(testIp, 50, limits);
      assert.equal(r3.allowed, false);
      assert.match(r3.reason, /daily request limit/i);
    });

    it('blocks requests exceeding daily token cap', () => {
      const testIp = '10.0.0.3';
      const limits = { maxRequests: 10, maxTokens: 200 };

      const r1 = checkDailyQuota(testIp, 150, limits);
      assert.equal(r1.allowed, true);

      const r2 = checkDailyQuota(testIp, 100, limits);
      assert.equal(r2.allowed, false);
      assert.match(r2.reason, /daily token limit/i);
    });
  });

  describe('Proxy Server HTTP Endpoints & Security Headers', () => {
    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'mock-gemini-key-for-test';
    });

    it('returns 200 and strict security headers for GET /api/health without leaking key', async () => {
      const res = await makeRequest(server, 'GET', '/api/health');
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['x-content-type-options'], 'nosniff');
      assert.equal(res.headers['x-frame-options'], 'DENY');
      assert.match(res.headers['content-security-policy'], /default-src 'self'/);
      assert.match(res.headers['content-security-policy'], /connect-src 'self'/);

      const body = JSON.parse(res.body);
      assert.equal(body.status, 'ok');
      assert.equal(typeof body.configured, 'boolean');
      assert.equal(body.apiKey, undefined, 'API key must never appear in response!');
    });

    it('returns 204 for preflight OPTIONS with allowed origin', async () => {
      const res = await makeRequest(server, 'OPTIONS', '/api/ai/chat', {
        Origin: 'http://localhost:5173'
      });
      assert.equal(res.statusCode, 204);
      assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
      assert.match(res.headers['access-control-allow-methods'], /POST/);
    });

    it('does not return CORS headers for unauthorized origins', async () => {
      const res = await makeRequest(server, 'OPTIONS', '/api/ai/chat', {
        Origin: 'http://malicious-site.example.com'
      });
      assert.equal(res.headers['access-control-allow-origin'], undefined);
    });

    it('rejects payloads larger than 100 KB with 413 Payload Too Large', async () => {
      const largePayload = JSON.stringify({ prompt: 'A'.repeat(105000) });
      const res = await makeRequest(server, 'POST', '/api/ai/chat', {
        'Content-Type': 'application/json'
      }, largePayload);

      assert.equal(res.statusCode, 413);
      const body = JSON.parse(res.body);
      assert.match(body.error.message, /exceeds 100 KB/i);
    });

    it('rejects invalid JSON payloads with 400 Bad Request', async () => {
      const res = await makeRequest(server, 'POST', '/api/ai/chat', {
        'Content-Type': 'application/json'
      }, '{ invalid-json');

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.match(body.error.message, /Invalid JSON format/i);
    });

    it('rejects disallowed Gemini model names with 400 Bad Request', async () => {
      const res = await makeRequest(server, 'POST', '/api/ai/chat', {
        'Content-Type': 'application/json'
      }, JSON.stringify({
        model: 'forbidden-model-xyz',
        prompt: 'test prompt'
      }));

      assert.equal(res.statusCode, 400);
      const body = JSON.parse(res.body);
      assert.match(body.error.message, /Disallowed model name/i);
    });

    it('returns 404 for unknown endpoints', async () => {
      const res = await makeRequest(server, 'GET', '/api/nonexistent');
      assert.equal(res.statusCode, 404);
    });
  });
});

// Helper to make in-memory HTTP requests directly to the server instance
function makeRequest(srv, method, path, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const tempServer = http.createServer((req, res) => srv.emit('request', req, res));
    tempServer.listen(0, '127.0.0.1', () => {
      const port = tempServer.address().port;
      const req = http.request({
        host: '127.0.0.1',
        port,
        path,
        method,
        headers
      }, (res) => {
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => {
          tempServer.close();
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8')
          });
        });
      });

      req.on('error', (err) => {
        tempServer.close();
        reject(err);
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  });
}

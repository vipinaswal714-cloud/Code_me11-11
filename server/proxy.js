/**
 * Metrica Production AI Backend Proxy Server
 *
 * Secure, hardened Node.js HTTP server for Google Gemini.
 * Loads credentials strictly from server/.env. Never sends or exposes API keys to client browsers.
 *
 * Security Features:
 *  - Stores GEMINI_API_KEY securely in server/.env (refuses startup if missing)
 *  - Zero API key leakage (never logged, printed, or sent in responses)
 *  - Origin CORS allowlisting
 *  - IP rate limiting (20 req/min per IP, real socket default, TRUST_PROXY opt-in)
 *  - Daily IP request cap (500 req/day)
 *  - Payload size ceiling (100 KB max)
 *  - Strict model allowlist (gemini-2.5-flash, etc.)
 *  - Hardened security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options)
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_GEMINI_MODEL,
  ALLOWED_GEMINI_MODELS,
  callGemini,
  checkGeminiHealth,
  mapGeminiError
} from './geminiProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads .env strictly from the server directory
 */
export function loadServerEnv() {
  const candidates = [
    path.resolve(__dirname, '.env'),
    path.resolve(__dirname, '..', 'server', '.env')
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const idx = trimmed.indexOf('=');
            if (idx !== -1) {
              const key = trimmed.slice(0, idx).trim();
              const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
              if (!process.env[key]) {
                process.env[key] = val;
              }
            }
          }
        });
        break;
      } catch {
        // Ignore read errors
      }
    }
  }
}

loadServerEnv();

/**
 * Validates that the mandatory GEMINI_API_KEY environment variable is present
 */
export function verifyEnvironment() {
  const key = process.env.GEMINI_API_KEY;
  if (!key || !key.trim()) {
    return {
      valid: false,
      error: 'GEMINI_API_KEY is missing. Please create server/.env and add your Google AI Studio API key (GEMINI_API_KEY=your_key_here).'
    };
  }
  return { valid: true };
}

const PORT = Number(process.env.PORT) || 3001;

// Parse allowed origins
const rawOrigins = process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001';
const ALLOWED_ORIGINS = new Set(rawOrigins.split(',').map(o => o.trim()).filter(Boolean));

/**
 * Resolves client IP with socket remoteAddress default and opt-in TRUST_PROXY
 */
export function resolveClientIp(req, trustProxy = (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1')) {
  if (trustProxy && req.headers?.['x-forwarded-for']) {
    const forwarded = req.headers['x-forwarded-for'].split(',')[0].trim();
    if (forwarded) return forwarded;
  }
  return req.socket?.remoteAddress || '127.0.0.1';
}

// IP Rate Limiter: In-memory sliding window (20 requests per minute)
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitMap = new Map(); // ip -> Array of timestamps

export function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

// Daily Request and Token Cap Tracker
const DEFAULT_DAILY_MAX_REQUESTS = Number(process.env.DAILY_MAX_REQUESTS) || 500;
const DEFAULT_DAILY_MAX_TOKENS = Number(process.env.DAILY_MAX_TOKENS) || 100000;
const dailyQuotaMap = new Map(); // ip -> { dateKey, requests, tokens }

export function checkDailyQuota(ip, tokensToAdd = 0, customLimits = {}) {
  const maxRequests = customLimits.maxRequests || DEFAULT_DAILY_MAX_REQUESTS;
  const maxTokens = customLimits.maxTokens || DEFAULT_DAILY_MAX_TOKENS;
  const todayKey = new Date().toISOString().slice(0, 10);

  let record = dailyQuotaMap.get(ip);
  if (!record || record.dateKey !== todayKey) {
    record = { dateKey: todayKey, requests: 0, tokens: 0 };
  }

  if (record.requests + 1 > maxRequests) {
    return {
      allowed: false,
      reason: `Daily request limit of ${maxRequests} exceeded for this IP.`,
      requestsRemaining: 0,
      tokensRemaining: Math.max(0, maxTokens - record.tokens)
    };
  }

  if (record.tokens + tokensToAdd > maxTokens) {
    return {
      allowed: false,
      reason: `Daily token limit of ${maxTokens} exceeded for this IP.`,
      requestsRemaining: Math.max(0, maxRequests - record.requests),
      tokensRemaining: 0
    };
  }

  record.requests += 1;
  record.tokens += tokensToAdd;
  dailyQuotaMap.set(ip, record);

  return {
    allowed: true,
    requestsRemaining: maxRequests - record.requests,
    tokensRemaining: maxTokens - record.tokens
  };
}

// Clean up stale rate limiter entries periodically
const cleanupTimer = setInterval(() => {
  const windowStart = Date.now() - RATE_LIMIT_WINDOW_MS;
  for (const [ip, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter(t => t > windowStart);
    if (valid.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, valid);
    }
  }
}, RATE_LIMIT_WINDOW_MS);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

// Security Headers
const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:3001 http://localhost:3001 https://sqyzsxzplfdmovqkecco.supabase.co wss://sqyzsxzplfdmovqkecco.supabase.co; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
};

function sendJson(res, statusCode, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...SECURITY_HEADERS,
    ...extraHeaders
  });
  res.end(body);
}

// Read body with 100 KB ceiling
function readRequestBody(req, maxBytes = 102400) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    let exceeded = false;

    req.on('data', chunk => {
      if (exceeded) return;
      bytes += chunk.length;
      if (bytes > maxBytes) {
        exceeded = true;
        const err = new Error('Payload Too Large: request body exceeds 100 KB');
        err.statusCode = 413;
        reject(err);
      } else {
        chunks.push(chunk);
      }
    });

    req.on('end', () => {
      if (exceeded) return;
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch {
        const err = new Error('Invalid JSON format');
        err.statusCode = 400;
        reject(err);
      }
    });

    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const clientIp = resolveClientIp(req);
  const origin = req.headers['origin'] || '';
  const corsHeaders = {};

  // Check CORS origin against strict allowlist
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    corsHeaders['Access-Control-Max-Age'] = '86400';
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...SECURITY_HEADERS, ...corsHeaders });
    res.end();
    return;
  }

  const urlPath = req.url?.split('?')[0];

  // Route: GET /api/health
  if (req.method === 'GET' && urlPath === '/api/health') {
    const keyConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    return sendJson(res, 200, {
      status: 'ok',
      configured: keyConfigured,
      model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
    }, corsHeaders);
  }

  // Apply Rate Limiting and Daily Quota for /api/ai endpoints
  if (urlPath?.startsWith('/api/ai/')) {
    if (isRateLimited(clientIp)) {
      return sendJson(res, 429, {
        error: { message: 'Too many requests. Please wait a minute before querying again.' }
      }, corsHeaders);
    }

    const quota = checkDailyQuota(clientIp);
    if (!quota.allowed) {
      return sendJson(res, 429, {
        error: { message: quota.reason }
      }, corsHeaders);
    }
  }

  // Route: POST /api/ai/health (or POST /api/ai/test)
  if (req.method === 'POST' && (urlPath === '/api/ai/health' || urlPath === '/api/ai/test')) {
    try {
      await readRequestBody(req);
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (!geminiApiKey || !geminiApiKey.trim()) {
        return sendJson(res, 401, {
          error: { message: 'GEMINI_API_KEY is not configured in server/.env.' }
        }, corsHeaders);
      }

      const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      const health = await checkGeminiHealth({ apiKey: geminiApiKey, model });

      if (!health.ok) {
        return sendJson(res, health.statusCode || 500, {
          error: { message: health.message }
        }, corsHeaders);
      }

      return sendJson(res, 200, {
        status: 'ok',
        connected: true,
        model: health.model,
        message: 'Google Gemini connected successfully'
      }, corsHeaders);
    } catch (err) {
      if (err.statusCode === 413 || err.statusCode === 400) {
        return sendJson(res, err.statusCode, {
          error: { message: err.message }
        }, corsHeaders);
      }
      const mapped = mapGeminiError(err);
      return sendJson(res, mapped.statusCode, {
        error: { message: mapped.message }
      }, corsHeaders);
    }
  }

  // Route: POST /api/ai/chat (and alias /api/ai/query)
  if (req.method === 'POST' && (urlPath === '/api/ai/chat' || urlPath === '/api/ai/query')) {
    try {
      const body = await readRequestBody(req);
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (!geminiApiKey || !geminiApiKey.trim()) {
        return sendJson(res, 401, {
          error: { message: 'GEMINI_API_KEY is missing. Please configure GEMINI_API_KEY in server/.env.' }
        }, corsHeaders);
      }

      const requestedModel = (body.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
      if (!ALLOWED_GEMINI_MODELS.has(requestedModel)) {
        return sendJson(res, 400, {
          error: { message: `Disallowed model name: "${requestedModel}". Allowed models: ${Array.from(ALLOWED_GEMINI_MODELS).join(', ')}` }
        }, corsHeaders);
      }

      // Support either direct prompt string or structured role messages array
      let userPrompt = '';
      let systemInstruction = body.systemInstruction || '';

      if (body.prompt) {
        userPrompt = body.prompt;
      } else if (Array.isArray(body.messages)) {
        const sysMsg = body.messages.find(m => m.role === 'system');
        const usrMsg = body.messages.filter(m => m.role !== 'system').map(m => m.content).join('\n\n');
        if (sysMsg && !systemInstruction) {
          systemInstruction = sysMsg.content;
        }
        userPrompt = usrMsg;
      }

      if (!userPrompt.trim()) {
        return sendJson(res, 400, { error: { message: 'Invalid request: prompt or messages content is required.' } }, corsHeaders);
      }

      const maxTokens = Math.min(Math.max(Number(body.maxTokens || body.max_tokens) || 1500, 100), 2000);

      const result = await callGemini({
        apiKey: geminiApiKey,
        model: requestedModel,
        systemInstruction,
        userPrompt,
        maxTokens
      });

      return sendJson(res, 200, {
        text: result.text,
        model: result.model,
        // For backwards compatibility with consumers expecting choices format
        choices: [
          {
            message: {
              content: result.text
            }
          }
        ]
      }, corsHeaders);

    } catch (err) {
      if (err.statusCode === 413 || err.statusCode === 400) {
        return sendJson(res, err.statusCode, {
          error: { message: err.message }
        }, corsHeaders);
      }
      const mapped = mapGeminiError(err);
      return sendJson(res, mapped.statusCode, {
        error: { message: mapped.message }
      }, corsHeaders);
    }
  }

  // Not found
  return sendJson(res, 404, { error: { message: 'Endpoint not found or method not allowed.' } }, corsHeaders);
});

const isDirectEntry = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectEntry && process.env.NODE_ENV !== 'test') {
  const envCheck = verifyEnvironment();
  if (!envCheck.valid) {
    console.error(`\n[Metrica Backend Server] FATAL ERROR: ${envCheck.error}\n`);
    process.exit(1);
  }

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[Metrica Backend Server] Secure proxy listening on http://127.0.0.1:${PORT}`);
  });
}

export default server;

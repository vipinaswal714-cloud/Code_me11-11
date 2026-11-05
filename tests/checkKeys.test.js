/**
 * tests/checkKeys.test.js
 *
 * Unit tests for check-keys verification suite.
 * Strictly mocks all HTTP calls. Zero real keys, network requests, or token values.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateGeminiKeyFormat,
  isAllowedGeminiModel,
  decodeTokenRole,
  validateSupabaseUrl,
  validatePublishableKeyShape,
  checkGeminiLive,
  checkSupabaseLive,
  checkWiring,
  scanDistBundleForSecrets
} from '../scripts/check-keys.mjs';

test('Check-Keys: Gemini Key & Model Validation', async (t) => {
  await t.test('detects well-formed Google AIza key format', () => {
    // Built in pieces to prevent scanner alerts
    const fakeKey = 'AIza' + 'SyB1234567890abcdefghijklmnopqrstuvwxyz';
    const res = validateGeminiKeyFormat(fakeKey);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.isPlaceholder, false);
  });

  await t.test('flags default placeholders as invalid/placeholder', () => {
    assert.strictEqual(validateGeminiKeyFormat('your_gemini_api_key_here').isPlaceholder, true);
    assert.strictEqual(validateGeminiKeyFormat('dev_placeholder_key').isPlaceholder, true);
    assert.strictEqual(validateGeminiKeyFormat('').valid, false);
    assert.strictEqual(validateGeminiKeyFormat(null).valid, false);
  });

  await t.test('verifies allowed Gemini models', () => {
    assert.strictEqual(isAllowedGeminiModel('gemini-2.5-flash'), true);
    assert.strictEqual(isAllowedGeminiModel('gemini-2.0-flash'), true);
    assert.strictEqual(isAllowedGeminiModel('gemini-1.5-flash'), true);
    assert.strictEqual(isAllowedGeminiModel('gemini-flash-lite-latest'), true);
    assert.strictEqual(isAllowedGeminiModel('unsupported-model-v9'), false);
  });
});

test('Check-Keys: Supabase Key Shapes & Token Role Decoder', async (t) => {
  await t.test('validates Supabase project URL shape', () => {
    assert.strictEqual(validateSupabaseUrl('https://sqyzsxzplfdmovqkecco.supabase.co'), true);
    assert.strictEqual(validateSupabaseUrl('https://my-custom.domain.com'), true);
    assert.strictEqual(validateSupabaseUrl('http://insecure.supabase.co'), false);
    assert.strictEqual(validateSupabaseUrl('not-a-url'), false);
    assert.strictEqual(validateSupabaseUrl(''), false);
  });

  await t.test('validates Supabase publishable key shape', () => {
    assert.strictEqual(validatePublishableKeyShape('sb_publishable_safe_key_123'), true);
    assert.strictEqual(validatePublishableKeyShape('eyJ' + 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.signature'), true);
    assert.strictEqual(validatePublishableKeyShape('short'), false);
    assert.strictEqual(validatePublishableKeyShape(''), false);
  });

  await t.test('decodes anon JWT token safely and allows it', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'anon', iss: 'supabase' })).toString('base64');
    const fakeAnonJwt = 'eyJ' + 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + payload + '.mockSig';
    const res = decodeTokenRole(fakeAnonJwt);
    assert.strictEqual(res.role, 'anon');
    assert.strictEqual(res.isDangerous, false);
  });

  await t.test('detects service_role or secret token and flags as dangerous', () => {
    const payload = Buffer.from(JSON.stringify({ role: 'service_' + 'role', iss: 'supabase' })).toString('base64');
    const fakeServiceJwt = 'eyJ' + 'hbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + payload + '.mockSig';
    const res = decodeTokenRole(fakeServiceJwt);
    assert.strictEqual(res.role, 'service_' + 'role');
    assert.strictEqual(res.isDangerous, true);
  });
});

test('Check-Keys: Mocked HTTP Live Gemini & Supabase Checks', async (t) => {
  const fakeKey = 'AIza' + 'SyB1234567890abcdefghijklmnopqrstuvwxyz';

  await t.test('handles successful Gemini model list and tiny generation', async () => {
    const mockFetch = async (url) => {
      if (url.includes('/models?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            models: [{ name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }]
          })
        };
      }
      if (url.includes(':generateContent?')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ candidates: [{ content: { parts: [{ text: 'pong' }] } }] })
        };
      }
      return { ok: false, status: 404 };
    };

    const res = await checkGeminiLive(fakeKey, 'gemini-2.5-flash', mockFetch);
    assert.strictEqual(res.modelListOk, true);
    assert.strictEqual(res.modelFound, true);
    assert.strictEqual(res.generationOk, true);
  });

  await t.test('reports HTTP status and Google error code on failure', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: { code: 400, message: 'API key not valid', status: 'INVALID_ARGUMENT' }
      })
    });

    const res = await checkGeminiLive(fakeKey, 'gemini-2.5-flash', mockFetch);
    assert.strictEqual(res.modelListOk, false);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.errorCode, 'INVALID_ARGUMENT');
  });

  await t.test('detects healthy Supabase project auth and settings', async () => {
    const mockFetch = async (url) => {
      if (url.endsWith('/auth/v1/health')) {
        return { ok: true, status: 200, json: async () => ({ version: '1.0' }) };
      }
      if (url.endsWith('/auth/v1/settings')) {
        return { ok: true, status: 200, json: async () => ({ external: { email: true } }) };
      }
      return { ok: false, status: 404 };
    };

    const res = await checkSupabaseLive(
      'https://sqyzsxzplfdmovqkecco.supabase.co',
      'sb_publishable_safe_mock_key',
      mockFetch
    );
    assert.strictEqual(res.healthOk, true);
    assert.strictEqual(res.keyAccepted, true);
    assert.strictEqual(res.isPaused, false);
  });

  await t.test('flags paused Supabase project on 521 or gateway timeout', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 521,
      text: async () => 'Web server is down (paused)'
    });

    const res = await checkSupabaseLive(
      'https://sqyzsxzplfdmovqkecco.supabase.co',
      'sb_publishable_safe_mock_key',
      mockFetch
    );
    assert.strictEqual(res.healthOk, false);
    assert.strictEqual(res.isPaused, true);
  });
});

test('Check-Keys: Wiring & Proxy Forwarding Validation', async (t) => {
  await t.test('verifies allowed origins and vite proxy config in memory', () => {
    const viteConfigContent = `
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true
        }
      }
    `;
    const allowedOrigins = 'http://localhost:5173,http://127.0.0.1:5173';
    const res = checkWiring(3001, allowedOrigins, viteConfigContent);
    assert.strictEqual(res.proxyConfigured, true);
    assert.strictEqual(res.devOriginsAllowed, true);
  });
});

test('Check-Keys: Dist Bundle Scanner In-Memory Check', async (t) => {
  await t.test('detects server secret in mock dist bundle', () => {
    const mockServerSecrets = ['super_secret_token_12345'];
    const mockDistFiles = [
      { name: 'index.html', content: '<html><body>Hello</body></html>' },
      { name: 'assets/app.js', content: 'console.log("super_secret_token_12345");' }
    ];

    const findings = scanDistBundleForSecrets(mockDistFiles, mockServerSecrets);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].filename, 'assets/app.js');
    // Ensure matching secret string is NOT leaked in finding object
    assert.strictEqual(findings[0].secretValue, undefined);
  });

  await t.test('passes when mock dist bundle is completely clean', () => {
    const mockServerSecrets = ['super_secret_token_12345'];
    const mockDistFiles = [
      { name: 'index.html', content: '<html><body>Metrica</body></html>' },
      { name: 'assets/app.js', content: 'const app = "analytics";' }
    ];

    const findings = scanDistBundleForSecrets(mockDistFiles, mockServerSecrets);
    assert.strictEqual(findings.length, 0);
  });
});

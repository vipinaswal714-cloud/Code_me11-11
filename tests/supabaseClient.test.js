import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  getSupabaseConfig,
  createSupabaseClient,
  checkSupabaseConnection,
  getSupabase
} from '../src/lib/supabaseClient.js';

describe('Supabase Client Module (Phase 1: Connection)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test('getSupabaseConfig reports missing variables cleanly when none are provided', () => {
    const config = getSupabaseConfig();
    assert.strictEqual(config.isConfigured, false);
    assert.ok(config.missingFields.includes('VITE_SUPABASE_URL'));
    assert.ok(config.missingFields.includes('VITE_SUPABASE_PUBLISHABLE_KEY'));
  });

  test('createSupabaseClient throws explicit error if VITE_SUPABASE_URL is missing', () => {
    assert.throws(
      () => createSupabaseClient('', 'sb_publishable_test_key'),
      /Missing required Supabase URL/i
    );
  });

  test('createSupabaseClient throws explicit error if VITE_SUPABASE_PUBLISHABLE_KEY is missing', () => {
    assert.throws(
      () => createSupabaseClient('https://test.supabase.co', ''),
      /Missing required Supabase Publishable Key/i
    );
  });

  test('createSupabaseClient throws explicit error on malformed or insecure URL', () => {
    assert.throws(
      () => createSupabaseClient('not-a-valid-url', 'sb_publishable_test_key'),
      /Invalid Supabase URL format/i
    );
  });

  test('createSupabaseClient creates client on valid URL and publishable key without holding secret keys', () => {
    const client = createSupabaseClient('https://xyzcompany.supabase.co', 'sb_publishable_valid_key_123');
    assert.ok(client);
    assert.ok(client.auth);
    // Ensure no secret keys are stored
    assert.strictEqual(client.supabaseKey, 'sb_publishable_valid_key_123');
  });

  test('checkSupabaseConnection returns not connected when unconfigured', async () => {
    const result = await checkSupabaseConnection(null);
    assert.strictEqual(result.connected, false);
    assert.match(result.error, /not configured/i);
  });

  test('checkSupabaseConnection returns connected: true when auth.getSession succeeds', async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({
          data: { session: null },
          error: null
        })
      }
    };

    const result = await checkSupabaseConnection(mockClient);
    assert.strictEqual(result.connected, true);
    assert.strictEqual(result.error, null);
  });

  test('checkSupabaseConnection returns connected: false with friendly error on failure', async () => {
    const mockClient = {
      auth: {
        getSession: async () => ({
          data: { session: null },
          error: { message: 'Failed to fetch', status: 503 }
        })
      }
    };

    const result = await checkSupabaseConnection(mockClient);
    assert.strictEqual(result.connected, false);
    assert.match(result.error, /Failed to connect to Supabase/i);
  });

  test('getSupabase returns singleton or throws informative error when unconfigured', () => {
    assert.throws(
      () => getSupabase(),
      /Supabase is not configured\. Please define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in \.env\.local/i
    );
  });

  test('getSupabaseConfig strictly ignores secret keys and only returns public fields', () => {
    process.env.VITE_SUPABASE_URL = 'https://sqyzsxzplfdmovqkecco.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_safe_key';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_do_not_leak';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_secret';

    const config = getSupabaseConfig();
    assert.strictEqual(config.url, 'https://sqyzsxzplfdmovqkecco.supabase.co');
    assert.strictEqual(config.publishableKey, 'sb_publishable_safe_key');
    assert.strictEqual(config.isConfigured, true);
    assert.strictEqual(config.secretKey, undefined);
    assert.strictEqual(config.serviceRoleKey, undefined);
  });

  test('getSupabase returns cached singleton when configured', () => {
    process.env.VITE_SUPABASE_URL = 'https://sqyzsxzplfdmovqkecco.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_safe_key';

    const clientA = getSupabase();
    const clientB = getSupabase();
    assert.strictEqual(clientA, clientB);
  });

  test('checkSupabaseConnection automatically resolves client when configured in environment', async () => {
    process.env.VITE_SUPABASE_URL = 'https://sqyzsxzplfdmovqkecco.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_safe_key';

    // Mock getSession on the singleton client
    const client = getSupabase();
    const origGetSession = client.auth.getSession;
    client.auth.getSession = async () => ({ data: { session: null }, error: null });

    const result = await checkSupabaseConnection();
    assert.strictEqual(result.connected, true);
    client.auth.getSession = origGetSession;
  });

  test('Content Security Policy in vite.config.js restricts connect-src to user project Supabase domain', async () => {
    const fs = await import('node:fs');
    const viteConfig = fs.readFileSync('vite.config.js', 'utf8');
    assert.match(viteConfig, /connect-src[^;]+https:\/\/sqyzsxzplfdmovqkecco\.supabase\.co/);
    assert.match(viteConfig, /connect-src[^;]+wss:\/\/sqyzsxzplfdmovqkecco\.supabase\.co/);
  });

  test('Content Security Policy in server/proxy.js restricts connect-src to user project Supabase domain', async () => {
    const fs = await import('node:fs');
    const proxyFile = fs.readFileSync('server/proxy.js', 'utf8');
    assert.match(proxyFile, /connect-src[^;]+https:\/\/sqyzsxzplfdmovqkecco\.supabase\.co/);
    assert.match(proxyFile, /connect-src[^;]+wss:\/\/sqyzsxzplfdmovqkecco\.supabase\.co/);
  });
});

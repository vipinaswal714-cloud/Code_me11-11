import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBlockedFilename,
  isAllowedFilename,
  scanFileContent,
  checkStagedFiles
} from '../scripts/check-secrets.mjs';

test('Secret Scanner - Filename Rules', async (t) => {
  await t.test('blocks .env files in root and subdirectories', () => {
    assert.strictEqual(isBlockedFilename('.env'), true);
    assert.strictEqual(isBlockedFilename('.env.local'), true);
    assert.strictEqual(isBlockedFilename('.env.production'), true);
    assert.strictEqual(isBlockedFilename('server/.env'), true);
    assert.strictEqual(isBlockedFilename('server/.env.staging'), true);
  });

  await t.test('allows .env.example and **/.env.example', () => {
    assert.strictEqual(isAllowedFilename('.env.example'), true);
    assert.strictEqual(isAllowedFilename('server/.env.example'), true);
    assert.strictEqual(isBlockedFilename('.env.example'), false);
    assert.strictEqual(isBlockedFilename('server/.env.example'), false);
  });

  await t.test('blocks key and certificate files', () => {
    assert.strictEqual(isBlockedFilename('server.pem'), true);
    assert.strictEqual(isBlockedFilename('privkey.key'), true);
    assert.strictEqual(isBlockedFilename('cert.p12'), true);
    assert.strictEqual(isBlockedFilename('cert.pfx'), true);
    assert.strictEqual(isBlockedFilename('id_rsa'), true);
    assert.strictEqual(isBlockedFilename('id_rsa.pub'), true);
    assert.strictEqual(isBlockedFilename('credentials.json'), true);
    assert.strictEqual(isBlockedFilename('service-account.json'), true);
    assert.strictEqual(isBlockedFilename('serviceAccountKey.json'), true);
  });

  await t.test('blocks database backups and dumps', () => {
    assert.strictEqual(isBlockedFilename('backup.dump'), true);
    assert.strictEqual(isBlockedFilename('data.sqlite'), true);
    assert.strictEqual(isBlockedFilename('app.db'), true);
  });

  await t.test('allows normal source and migration files', () => {
    assert.strictEqual(isBlockedFilename('src/App.jsx'), false);
    assert.strictEqual(isBlockedFilename('package.json'), false);
    assert.strictEqual(isBlockedFilename('supabase/migrations/20260101_init.sql'), false);
    assert.strictEqual(isBlockedFilename('supabase/config.toml'), false);
    assert.strictEqual(isBlockedFilename('README.md'), false);
  });
});

test('Secret Scanner - Content Scanning & Pattern Detection', async (t) => {
  // Built in pieces so the test file itself does not match raw static scanners
  const sampleGoogleKey = 'AIza' + 'SyB1234567890abcdefghijklmnopqrstuvwxyz';
  const sampleOpenAiKey = 'sk-' + 'proj-1234567890abcdefghijklmnopqrstuvwxyz';
  const sampleSbSecret = 'sb_' + 'secret_' + '9876543210abcdefghijklmnop';
  const sampleServiceRole = 'service_' + 'role_' + 'token_super_secret_value';
  const sampleJwt = 'eyJhbGci' + 'OiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVGVzdCJ9.sample_signature_12345';

  await t.test('detects Google AIza API keys', () => {
    const content = `const key = "${sampleGoogleKey}";`;
    const findings = scanFileContent('src/config.js', content);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 1);
    assert.strictEqual(findings[0].filename, 'src/config.js');
    // Ensure output does NOT contain the secret value
    assert.strictEqual(findings[0].match, undefined);
  });

  await t.test('detects OpenAI sk- tokens', () => {
    const content = `// auth\nconst token = "${sampleOpenAiKey}";`;
    const findings = scanFileContent('src/utils/ai.js', content);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 2);
    assert.strictEqual(findings[0].match, undefined);
  });

  await t.test('detects Supabase sb_secret_ tokens', () => {
    const content = `SUPABASE_SECRET="${sampleSbSecret}"`;
    const findings = scanFileContent('server/config.js', content);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 1);
    assert.strictEqual(findings[0].match, undefined);
  });

  await t.test('detects Supabase service role keys', () => {
    const content = `const sKey = "${sampleServiceRole}";`;
    const findings = scanFileContent('server/supabaseAdmin.js', content);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 1);
    assert.strictEqual(findings[0].match, undefined);
  });

  await t.test('detects long eyJhbGci tokens', () => {
    const content = `export const JWT = "${sampleJwt}";`;
    const findings = scanFileContent('src/auth.js', content);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].line, 1);
    assert.strictEqual(findings[0].match, undefined);
  });

  await t.test('clean file produces zero findings', () => {
    const content = `
      import React from 'react';
      export function Button({ label }) {
        return <button className="glass-panel">{label}</button>;
      }
    `;
    const findings = scanFileContent('src/Button.jsx', content);
    assert.strictEqual(findings.length, 0);
  });

  await t.test('allows obviously fake test values in test files', () => {
    // Constructed in pieces: fake test strings inside a test file
    const fakeMockKey = 'sb_' + 'secret_' + 'FAKE_FOR_TESTS_ONLY';
    const content = `
      test('mock test', () => {
        const dummyKey = "${fakeMockKey}";
        assert.ok(dummyKey);
      });
    `;
    const findings = scanFileContent('tests/dummy.test.js', content);
    assert.strictEqual(findings.length, 0);
  });

  await t.test('ignores content in .example files', () => {
    const content = `GEMINI_API_KEY=${sampleGoogleKey}\nOPENAI_API_KEY=${sampleOpenAiKey}`;
    const findings = scanFileContent('.env.example', content);
    assert.strictEqual(findings.length, 0);
  });

  await t.test('findings formatting never exposes matching secret text', () => {
    const content = `line1\nline2: secret = "${sampleGoogleKey}"`;
    const findings = scanFileContent('src/secret.js', content);
    assert.strictEqual(findings.length, 1);
    // Verified: finding object contains only filename, line, pattern name
    assert.deepStrictEqual(Object.keys(findings[0]).sort(), ['filename', 'line', 'rule'].sort());
  });
});

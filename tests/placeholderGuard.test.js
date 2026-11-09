import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  findUnresolvedPlaceholders,
  scanPrivacyNoticeFile,
  validatePrivacyNotice
} from '../src/utils/placeholderGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRIVACY_NOTICE_PATH = path.resolve(__dirname, '../src/content/privacy-notice.md');

describe('Placeholder Guard Module (Build & Test Gate)', () => {
  test('finds bracketed placeholders while ignoring markdown links', () => {
    const sample = `
# Header
**Last updated:** [date]
Check out [Metrica Website](https://metrica.app).
Hosted in [Supabase region] by [hosting provider].
    `;
    const placeholders = findUnresolvedPlaceholders(sample);
    assert.deepEqual(placeholders, ['date', 'Supabase region', 'hosting provider']);
  });

  test('returns empty array when text has no placeholders', () => {
    const cleanSample = `
# Metrica Privacy Notice
**Last updated:** November 1, 2026
**Operated by:** Metrica Analytics, India
Visit [Our Docs](https://example.com/docs).
    `;
    const placeholders = findUnresolvedPlaceholders(cleanSample);
    assert.equal(placeholders.length, 0);
  });

  test('scans src/content/privacy-notice.md and identifies existing placeholders', () => {
    const result = scanPrivacyNoticeFile(PRIVACY_NOTICE_PATH);
    assert.ok(result.placeholders.length > 0, 'Should find existing draft placeholders');
    // Ensure known placeholders like [date] or [hosting provider] are detected
    assert.ok(result.placeholders.some(p => p.toLowerCase().includes('date') || p.toLowerCase().includes('hosting')));
  });

  test('validatePrivacyNotice passes in dev/test mode with warning flag', () => {
    const result = validatePrivacyNotice(PRIVACY_NOTICE_PATH, { strict: false });
    assert.equal(result.valid, true);
    assert.equal(result.warning, true);
    assert.ok(result.unresolvedCount > 0);
  });

  test('validatePrivacyNotice fails in strict/production mode when placeholders exist', () => {
    assert.throws(
      () => {
        validatePrivacyNotice(PRIVACY_NOTICE_PATH, { strict: true });
      },
      (err) => {
        return err.name === 'PrivacyNoticePlaceholderError' &&
          err.message.includes('unresolved placeholder') &&
          Array.isArray(err.placeholders);
      }
    );
  });
});

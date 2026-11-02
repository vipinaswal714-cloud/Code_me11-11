#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanPrivacyNoticeFile, validatePrivacyNotice, PrivacyNoticePlaceholderError } from '../src/utils/placeholderGuard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRIVACY_NOTICE_PATH = path.resolve(__dirname, '../src/content/privacy-notice.md');

const args = process.argv.slice(2);
const isStrict = args.includes('--strict') ||
                 process.env.NODE_ENV === 'production' ||
                 process.env.STRICT_PLACEHOLDER_CHECK === 'true';

console.log(`[Placeholder Guard] Inspecting ${PRIVACY_NOTICE_PATH}...`);
console.log(`[Placeholder Guard] Mode: ${isStrict ? 'STRICT (Production Build Gate)' : 'DEVELOPMENT / NON-STRICT'}`);

try {
  const result = validatePrivacyNotice(PRIVACY_NOTICE_PATH, { strict: isStrict });

  if (result.warning) {
    console.warn(`\n[Placeholder Guard] WARNING: Found ${result.unresolvedCount} unresolved placeholder(s) in privacy-notice.md:`);
    result.placeholders.forEach((p, i) => {
      console.warn(`  ${i + 1}. [${p}]`);
    });
    console.warn('\nNote: In production builds (--strict), this will halt the build until filled in.\n');
  } else {
    console.log(`[Placeholder Guard] ✓ PASS: Privacy notice is complete. 0 unresolved placeholders found.\n`);
  }
  process.exit(0);
} catch (err) {
  if (err instanceof PrivacyNoticePlaceholderError) {
    console.error(`\n❌ [Placeholder Guard] FATAL: Production build blocked!`);
    console.error(err.message);
    console.error(`\nAction required: Open src/content/privacy-notice.md and replace all [brackets] with verified legal details before deployment.\n`);
    process.exit(1);
  } else {
    console.error(`[Placeholder Guard] Unexpected error:`, err);
    process.exit(1);
  }
}

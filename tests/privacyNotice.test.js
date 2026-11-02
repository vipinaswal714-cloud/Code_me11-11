import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRIVACY_NOTICE_VERSION,
  PRIVACY_NOTICE_LAST_UPDATED,
  UPLOAD_NOTICE,
  ASK_AI_NOTICE,
  SIGNUP_NOTICE,
  METRICA_ASK_AI_PRIVACY_ACK_KEY,
  hasAcknowledgedAskAi,
  recordAskAiAcknowledgment,
  clearAskAiAcknowledgment
} from '../src/constants/privacyNotices.js';
import {
  parseAndSanitizeMarkdown,
  extractTableOfContents
} from '../src/utils/markdownParser.js';

// Mock localStorage for Node test runner
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear()
};

describe('Privacy Constants & Notices', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('matches exact legal wording specified for file upload notice', () => {
    assert.equal(
      UPLOAD_NOTICE,
      'Your file is processed in your browser. It is not uploaded to our servers.'
    );
  });

  test('matches exact legal wording specified for Ask AI panel notice', () => {
    assert.equal(
      ASK_AI_NOTICE,
      'Ask AI sends your question, column names, data types, summary statistics and up to 20 sample rows to Google Gemini to generate an answer. Your full file is never sent. Don’t use Ask AI with personal or sensitive data.'
    );
  });

  test('matches exact legal wording specified for sign-up form notice', () => {
    assert.equal(
      SIGNUP_NOTICE,
      'We store your email and the rules, dashboards and preferences you save, not your spreadsheets. See our Privacy Notice for details.'
    );
  });

  test('exports version and last updated date', () => {
    assert.equal(typeof PRIVACY_NOTICE_VERSION, 'number');
    assert.ok(PRIVACY_NOTICE_VERSION >= 1);
    assert.equal(typeof PRIVACY_NOTICE_LAST_UPDATED, 'string');
    assert.ok(PRIVACY_NOTICE_LAST_UPDATED.length > 0);
  });

  test('hasAcknowledgedAskAi returns false initially', () => {
    assert.equal(hasAcknowledgedAskAi(), false);
  });

  test('recordAskAiAcknowledgment persists valid record and returns true', () => {
    recordAskAiAcknowledgment(PRIVACY_NOTICE_VERSION);
    assert.equal(hasAcknowledgedAskAi(), true);

    const raw = JSON.parse(localStorage.getItem(METRICA_ASK_AI_PRIVACY_ACK_KEY));
    assert.equal(raw.version, PRIVACY_NOTICE_VERSION);
    assert.ok(raw.acknowledgedAt);
  });

  test('re-prompts when privacy notice version is bumped', () => {
    recordAskAiAcknowledgment(1);
    assert.equal(hasAcknowledgedAskAi(1), true);
    // Version 2 requires re-acknowledgment
    assert.equal(hasAcknowledgedAskAi(2), false);
  });

  test('resilient against corrupted or malicious localStorage values', () => {
    // Corrupt JSON
    localStorage.setItem(METRICA_ASK_AI_PRIVACY_ACK_KEY, '{invalid-json');
    assert.equal(hasAcknowledgedAskAi(), false);

    // Non-object
    localStorage.setItem(METRICA_ASK_AI_PRIVACY_ACK_KEY, '"just a string"');
    assert.equal(hasAcknowledgedAskAi(), false);

    // Prototype tampering
    localStorage.setItem(METRICA_ASK_AI_PRIVACY_ACK_KEY, '{"__proto__": {"admin": true}}');
    assert.equal(hasAcknowledgedAskAi(), false);

    // Missing version
    localStorage.setItem(METRICA_ASK_AI_PRIVACY_ACK_KEY, JSON.stringify({ acknowledgedAt: '2026-01-01' }));
    assert.equal(hasAcknowledgedAskAi(), false);
  });

  test('clearAskAiAcknowledgment removes stored key', () => {
    recordAskAiAcknowledgment(1);
    assert.equal(hasAcknowledgedAskAi(1), true);
    clearAskAiAcknowledgment();
    assert.equal(hasAcknowledgedAskAi(1), false);
  });
});

describe('Markdown Parser & Sanitizer', () => {
  test('extracts table of contents from markdown headings', () => {
    const md = `
# Main Title
## 1. The Short Version
Some text
## 2. What Stays
### 2.1 Sub-item
## 3. Ask AI
    `;
    const toc = extractTableOfContents(md);
    assert.equal(toc.length, 3);
    assert.deepEqual(toc[0], { id: '1-the-short-version', title: '1. The Short Version', level: 2 });
    assert.deepEqual(toc[1], { id: '2-what-stays', title: '2. What Stays', level: 2 });
    assert.deepEqual(toc[2], { id: '3-ask-ai', title: '3. Ask AI', level: 2 });
  });

  test('parses markdown into safe HTML with IDs matching TOC', () => {
    const md = `## 1. The Short Version\n\nYour file stays **local**.`;
    const result = parseAndSanitizeMarkdown(md);
    assert.ok(result.html.includes('id="1-the-short-version"'));
    assert.ok(result.html.includes('<strong>local</strong>'));
  });

  test('neutralizes script tags and inline handlers', () => {
    const malicious = `
# Normal Header
<script>alert("pwned")</script>
<img src="x" onerror="alert(document.cookie)" />
<iframe src="javascript:alert(1)"></iframe>
    `;
    const result = parseAndSanitizeMarkdown(malicious);
    assert.ok(!result.html.includes('<script>'), 'Must not contain script tags');
    assert.ok(!result.html.includes('alert('), 'Must not contain alert execution');
    assert.ok(!result.html.includes('onerror='), 'Must not contain inline event handlers');
    assert.ok(!result.html.includes('<iframe'), 'Must not contain iframe');
  });

  test('neutralizes dangerous javascript: and data: links', () => {
    const malicious = `
[Click for free money](javascript:alert(1))
[Data URI](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)
[Safe Link](https://example.com)
    `;
    const result = parseAndSanitizeMarkdown(malicious);
    assert.ok(!result.html.includes('href="javascript:'), 'Must strip javascript: URI');
    assert.ok(!result.html.includes('href="data:'), 'Must strip data: URI');
    assert.ok(result.html.includes('href="https://example.com"'), 'Must preserve safe HTTPS link');
  });

  test('appends rel="noopener noreferrer" and target="_blank" to external links', () => {
    const md = `Read more at [Google Gemini](https://ai.google.dev).`;
    const result = parseAndSanitizeMarkdown(md);
    assert.ok(result.html.includes('target="_blank"'), 'Must have target="_blank"');
    assert.ok(result.html.includes('rel="noopener noreferrer"'), 'Must have rel="noopener noreferrer"');
  });
});

/**
 * scripts/check-secrets.mjs
 *
 * Pre-commit & CI Secret Scanner
 * Inspects staged files and blocks commits containing:
 * 1. Sensitive filenames (.env*, *.key, *.pem, *.p12, *.pfx, id_rsa*, credentials.json, etc.)
 * 2. Secret token patterns (AIza, sk-..., sb_secret_..., service_role..., eyJhbGci...)
 *
 * Rules:
 * - Never prints secret values (only filename and line number)
 * - Ignores *.example files
 * - Ignores test files containing obviously fake test values
 */

import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Secret regex patterns
export const SECRET_RULES = [
  {
    name: 'Google API Key (AIza)',
    regex: /AIza[0-9A-Za-z\-_]{35}/g
  },
  {
    name: 'Secret Key (sk-*)',
    regex: /sk-[a-zA-Z0-9_\-]{20,}/g
  },
  {
    name: 'Supabase Secret Key (sb_secret_*)',
    regex: /sb_secret_[a-zA-Z0-9_\-]+/g
  },
  {
    name: 'Supabase Service Role Key',
    regex: /service_role[a-zA-Z0-9_\-]*/g
  },
  {
    name: 'JWT / Service Token (eyJhbGci*)',
    regex: /eyJhbGci[a-zA-Z0-9_\-\.]{20,}/g
  }
];

// Blocked filename patterns
export const SENSITIVE_FILENAME_PATTERNS = [
  // .env files anywhere
  /^(?:.*\/)?\.env(?:\..+)?$/i,
  // Keys and certificates
  /\.(?:pem|key|p12|pfx|secret)$/i,
  /id_rsa/i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
  /serviceAccountKey\.json$/i,
  // Backups and dumps
  /\.(?:dump|backup|sqlite|db)$/i
];

export function isAllowedFilename(filepath) {
  if (!filepath) return false;
  const normalized = filepath.replace(/\\/g, '/');
  // Allow explicit example templates
  if (normalized.endsWith('.env.example') || normalized.endsWith('.example')) {
    return true;
  }
  return false;
}

export function isBlockedFilename(filepath) {
  if (!filepath) return false;
  if (isAllowedFilename(filepath)) return false;
  const normalized = filepath.replace(/\\/g, '/');
  return SENSITIVE_FILENAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isTestFile(filepath) {
  const normalized = filepath.replace(/\\/g, '/');
  return (
    normalized.startsWith('tests/') ||
    normalized.includes('/tests/') ||
    normalized.endsWith('.test.js') ||
    normalized.endsWith('.test.mjs') ||
    normalized.endsWith('.spec.js')
  );
}

export function isObviouslyFakeTestValue(line, match) {
  const lineLower = line.toLowerCase();
  const matchUpper = match.toUpperCase();
  // Signals that indicate an explicit mock / fake value in a test file
  return (
    lineLower.includes('fake') ||
    lineLower.includes('dummy') ||
    lineLower.includes('mock') ||
    lineLower.includes('placeholder') ||
    lineLower.includes('example') ||
    lineLower.includes('do_not_leak') ||
    matchUpper.includes('FAKE') ||
    matchUpper.includes('TEST') ||
    matchUpper.includes('DUMMY') ||
    matchUpper.includes('EXAMPLE') ||
    matchUpper.includes('MOCK')
  );
}

export function scanFileContent(filepath, content) {
  if (!content || typeof content !== 'string') return [];
  if (isAllowedFilename(filepath)) return [];

  const normalized = filepath.replace(/\\/g, '/');
  // The scanner scripts define the detection regex patterns
  if (normalized.endsWith('scripts/check-secrets.mjs') || normalized.endsWith('scripts/check-keys.mjs')) {
    return [];
  }

  const findings = [];
  const lines = content.split(/\r?\n/);
  const isTest = isTestFile(filepath);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const rule of SECRET_RULES) {
      rule.regex.lastIndex = 0;
      let match;
      while ((match = rule.regex.exec(line)) !== null) {
        const matchedText = match[0];
        // If in a test file and obviously a fake placeholder value or test suite label, skip
        if (
          isTest &&
          (isObviouslyFakeTestValue(line, matchedText) ||
            line.includes('test(') ||
            line.includes('t.test(') ||
            line.includes('describe(') ||
            line.includes('it('))
        ) {
          continue;
        }

        // Store ONLY filename, 1-based line number, and rule name. NEVER the secret value.
        findings.push({
          filename: normalized,
          line: lineIndex + 1,
          rule: rule.name
        });
      }
    }
  }

  return findings;
}

export function checkStagedFiles() {
  const findings = [];

  let stagedFilesOutput = '';
  try {
    stagedFilesOutput = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
  } catch {
    return [];
  }

  if (!stagedFilesOutput) {
    return [];
  }

  const stagedFiles = stagedFilesOutput.split(/\r?\n/).filter(Boolean);

  for (const file of stagedFiles) {
    // 1. Check filename
    if (isBlockedFilename(file)) {
      findings.push({
        filename: file.replace(/\\/g, '/'),
        line: 1,
        rule: 'Blocked Sensitive File (matches .env* or key/credential pattern)'
      });
      continue;
    }

    // 2. Check staged content
    let stagedContent = '';
    try {
      stagedContent = execSync(`git show :${JSON.stringify(file)}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
    } catch {
      continue;
    }

    const contentFindings = scanFileContent(file, stagedContent);
    findings.push(...contentFindings);
  }

  return findings;
}

export function runSecretCheck() {
  const findings = checkStagedFiles();

  if (findings.length > 0) {
    console.error('\n🚨 [SECURITY ALERT] Commit blocked: Sensitive files or secrets detected in staged changes!\n');
    for (const f of findings) {
      // Strictly print only filename and line number. NEVER the matching text.
      console.error(`  - ${f.filename}:${f.line} [${f.rule}]`);
    }
    console.error('\nAction required:');
    console.error('1. Remove real secrets and place them in .env.local (frontend) or server/.env (backend).');
    console.error('2. Unstage sensitive files using git restore --staged <file>.');
    console.error('3. Ensure template files use placeholders in .env.example only.\n');
    return false;
  }

  console.log('✓ Secret check passed: 0 sensitive files or secrets detected in staged changes.');
  return true;
}

// Direct execution CLI entrypoint
const isDirectExecution =
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()));

if (isDirectExecution) {
  const clean = runSecretCheck();
  if (!clean) {
    process.exit(1);
  }
}

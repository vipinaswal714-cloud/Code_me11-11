/**
 * scripts/check-keys.mjs
 *
 * Automated Key Health, Security, and Wiring Verification Suite
 *
 * Rules:
 * - Never prints, logs, or writes secret values
 * - Redacts loaded credentials before outputting error messages ([REDACTED])
 * - Checks Gemini, Supabase, Wiring, and Production Dist Bundle
 * - Returns structured status table: PASS, FAIL, WARN, SKIP
 */

import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

export const ALLOWED_GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-flash-lite-latest'
];

export const RETIRED_GEMINI_MODELS = [
  'gemini-1.0-pro',
  'gemini-pro',
  'gemini-1.0-pro-vision',
  'gemini-pro-vision'
];

// -------------------------------------------------------------
// Pure Helper Functions (Unit-Testable without Network)
// -------------------------------------------------------------

export function validateGeminiKeyFormat(key) {
  if (!key || typeof key !== 'string') {
    return { valid: false, isPlaceholder: false };
  }
  const clean = key.trim();
  const placeholders = [
    'your_gemini_api_key_here',
    'dev_placeholder_key',
    'your_key_here',
    'placeholder'
  ];
  if (placeholders.includes(clean.toLowerCase())) {
    return { valid: false, isPlaceholder: true };
  }
  // Google AI Studio / Gemini API keys typically start with AIza or AQ. and are 35-65 characters
  const isGoogleKey = (clean.startsWith('AIza') || clean.startsWith('AQ.')) && clean.length >= 35 && clean.length <= 65;
  return { valid: isGoogleKey, isPlaceholder: false };
}

export function isAllowedGeminiModel(model) {
  if (!model || typeof model !== 'string') return false;
  return ALLOWED_GEMINI_MODELS.includes(model.trim());
}

export function validateSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (/your-project|placeholder|example\.com/i.test(url)) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' && parsed.hostname.length > 3;
  } catch {
    return false;
  }
}

export function validatePublishableKeyShape(key) {
  if (!key || typeof key !== 'string') return false;
  const clean = key.trim();
  // Modern sb_publishable_* or legacy JWT eyJhbGci*
  return (
    (clean.startsWith('sb_publishable_') && clean.length >= 20) ||
    (clean.startsWith('eyJhbGci') && clean.length >= 50)
  );
}

export function decodeTokenRole(token) {
  if (!token || typeof token !== 'string') {
    return { role: 'unknown', isDangerous: false };
  }
  const parts = token.trim().split('.');
  if (parts.length < 2) {
    // Non-JWT token
    return { role: 'non-jwt', isDangerous: false };
  }
  try {
    const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadStr);
    const role = (payload.role || '').toLowerCase();
    const isDangerous =
      role === 'service_' + 'role' ||
      role === 'supabase_admin' ||
      role.includes('admin') ||
      role.includes('secret');
    return { role: payload.role || 'unknown', isDangerous };
  } catch {
    return { role: 'unparseable', isDangerous: false };
  }
}

export function checkWiring(port, allowedOrigins, viteConfigContent) {
  const proxyRegex = new RegExp(
    `target:\\s*['"]http:\\/\\/(?:127\\.0\\.0\\.1|localhost):${port}['"]`
  );
  const proxyConfigured = proxyRegex.test(viteConfigContent || '');

  const origins = (allowedOrigins || '').split(',').map((o) => o.trim());
  const devOriginsAllowed =
    origins.includes('http://localhost:5173') ||
    origins.includes('http://127.0.0.1:5173');

  return { proxyConfigured, devOriginsAllowed };
}

export function scanDistBundleForSecrets(distFiles, serverSecrets) {
  const secretPatterns = [
    { name: 'Google API Key (AIza)', regex: /AIza[0-9A-Za-z\-_]{35}/ },
    { name: 'Secret Key (sk-*)', regex: /sk-[a-zA-Z0-9_\-]{20,}/ },
    { name: 'Supabase Secret Key', regex: /sb_secret_[a-zA-Z0-9_\-]+/ },
    { name: 'Supabase Service Role Key', regex: /service_role[a-zA-Z0-9_\-]*/ },
    { name: 'JWT / Service Token (eyJhbGci*)', regex: /eyJhbGci[a-zA-Z0-9_\-\.]{20,}/ }
  ];

  const filteredServerSecrets = (serverSecrets || []).filter(
    (s) => s && s.length >= 8 && !s.includes('placeholder')
  );

  const findings = [];

  for (const file of distFiles) {
    const content = file.content || '';

    // Pattern matching
    for (const pat of secretPatterns) {
      if (pat.regex.test(content)) {
        findings.push({
          filename: file.name,
          rule: pat.name
        });
      }
    }

    // Exact secret matching in memory
    for (const secret of filteredServerSecrets) {
      if (content.includes(secret)) {
        findings.push({
          filename: file.name,
          rule: 'Server Secret Value Match'
        });
      }
    }
  }

  return findings;
}

// -------------------------------------------------------------
// Async Live Verification Functions (Mockable with fetchImpl)
// -------------------------------------------------------------

export async function checkGeminiLive(key, model, fetchImpl = fetch) {
  const cleanKey = (key || '').trim();
  const cleanModel = (model || '').trim();

  // Redact helper: strips raw key from error messages
  const sanitize = (text) => (cleanKey ? String(text).replace(new RegExp(cleanKey, 'g'), '[REDACTED]') : String(text));

  try {
    // 1. Google models.list endpoint
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
    const listRes = await fetchImpl(listUrl, { signal: AbortSignal.timeout(6000) });

    if (!listRes.ok) {
      let errData = {};
      try {
        errData = await listRes.json();
      } catch {
        // ignore
      }
      return {
        modelListOk: false,
        status: listRes.status,
        errorCode: errData.error?.status || errData.error?.code || 'HTTP_' + listRes.status,
        errorMessage: sanitize(errData.error?.message || 'Failed to list Gemini models')
      };
    }

    const listData = await listRes.json();
    const modelNames = (listData.models || []).map((m) =>
      (m.name || '').replace(/^models\//, '')
    );
    const modelFound = modelNames.includes(cleanModel);
    const isRetired = RETIRED_GEMINI_MODELS.includes(cleanModel);

    // 2. Tiny Test Generation (1 output token)
    const genUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${cleanKey}`;
    const genRes = await fetchImpl(genUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1 }
      }),
      signal: AbortSignal.timeout(7000)
    });

    if (!genRes.ok) {
      let genErr = {};
      try {
        genErr = await genRes.json();
      } catch {
        // ignore
      }
      return {
        modelListOk: true,
        modelFound,
        isRetired,
        generationOk: false,
        status: genRes.status,
        errorCode: genErr.error?.status || genErr.error?.code || 'GEN_FAIL_' + genRes.status,
        errorMessage: sanitize(genErr.error?.message || 'Test generation failed')
      };
    }

    return {
      modelListOk: true,
      modelFound,
      isRetired,
      generationOk: true,
      status: 200
    };
  } catch (err) {
    return {
      modelListOk: false,
      status: 0,
      errorCode: 'NETWORK_ERROR',
      errorMessage: sanitize(err.message || 'Network error communicating with Google Gemini API')
    };
  }
}

export async function checkSupabaseLive(url, publishableKey, fetchImpl = fetch) {
  const cleanUrl = (url || '').trim().replace(/\/$/, '');
  const cleanKey = (publishableKey || '').trim();

  const sanitize = (text) =>
    cleanKey ? String(text).replace(new RegExp(cleanKey, 'g'), '[REDACTED]') : String(text);

  let healthOk = false;
  let isPaused = false;
  let keyAccepted = false;
  let statusCode = 0;
  let errorDetail = '';

  // 1. Project Auth Health check
  try {
    const healthRes = await fetchImpl(`${cleanUrl}/auth/v1/health`, {
      headers: cleanKey ? { apikey: cleanKey } : {},
      signal: AbortSignal.timeout(6000)
    });
    statusCode = healthRes.status;
    if (healthRes.ok) {
      healthOk = true;
    } else if (healthRes.status === 521 || healthRes.status === 503 || healthRes.status === 504) {
      isPaused = true;
      errorDetail = `Project appears paused or offline (HTTP ${healthRes.status})`;
    } else {
      errorDetail = `Health check returned HTTP ${healthRes.status}`;
    }
  } catch (err) {
    errorDetail = sanitize(err.message || 'Cannot reach Supabase host');
  }

  // 2. Settings check with publishable key
  if (healthOk) {
    try {
      const settingsRes = await fetchImpl(`${cleanUrl}/auth/v1/settings`, {
        headers: { apikey: cleanKey },
        signal: AbortSignal.timeout(6000)
      });
      if (settingsRes.ok) {
        keyAccepted = true;
      } else {
        errorDetail = `Publishable key rejected (HTTP ${settingsRes.status})`;
      }
    } catch (err) {
      errorDetail = sanitize(err.message || 'Key verification failed');
    }
  }

  return { healthOk, isPaused, keyAccepted, statusCode, errorDetail };
}

// -------------------------------------------------------------
// Main CLI Runner & Table Formatter
// -------------------------------------------------------------

function parseEnvFile(filepath) {
  if (!fs.existsSync(filepath)) return null;
  const env = {};
  try {
    const lines = fs.readFileSync(filepath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const idx = trimmed.indexOf('=');
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        env[k] = v;
      }
    }
  } catch {
    return null;
  }
  return env;
}

export async function runAllLiveKeyChecks() {
  const rows = [];
  let hasFail = false;

  const serverEnv = parseEnvFile(path.join(ROOT_DIR, 'server', '.env')) || {};
  const frontendEnv = parseEnvFile(path.join(ROOT_DIR, '.env.local')) || {};

  // -----------------------------------------------------------
  // 1. Gemini Backend Configuration & Live Calls
  // -----------------------------------------------------------
  const serverEnvExists = fs.existsSync(path.join(ROOT_DIR, 'server', '.env'));
  rows.push({
    component: 'Gemini',
    check: 'server/.env exists',
    status: serverEnvExists ? 'PASS' : 'FAIL',
    details: serverEnvExists ? 'Found at server/.env' : 'Missing server/.env'
  });
  if (!serverEnvExists) hasFail = true;

  const geminiKey = serverEnv.GEMINI_API_KEY || '';
  const keyFormat = validateGeminiKeyFormat(geminiKey);

  if (keyFormat.isPlaceholder) {
    rows.push({
      component: 'Gemini',
      check: 'GEMINI_API_KEY well-formed',
      status: 'WARN',
      details: 'Placeholder value detected; Ask AI disabled until configured'
    });
    rows.push({
      component: 'Gemini',
      check: 'Google API model-list & generation',
      status: 'SKIP',
      details: 'Skipped: GEMINI_API_KEY is placeholder'
    });
  } else if (!keyFormat.valid) {
    rows.push({
      component: 'Gemini',
      check: 'GEMINI_API_KEY well-formed',
      status: 'FAIL',
      details: geminiKey ? `Malformed key format (length: ${geminiKey.length})` : 'Missing GEMINI_API_KEY'
    });
    hasFail = true;
  } else {
    rows.push({
      component: 'Gemini',
      check: 'GEMINI_API_KEY well-formed',
      status: 'PASS',
      details: `Well-formed Google AIza key (length: ${geminiKey.length})`
    });

    const model = serverEnv.GEMINI_MODEL || 'gemini-2.5-flash';
    const modelAllowed = isAllowedGeminiModel(model);
    rows.push({
      component: 'Gemini',
      check: 'GEMINI_MODEL allowlist',
      status: modelAllowed ? 'PASS' : 'FAIL',
      details: modelAllowed ? `Allowed: ${model}` : `Disallowed model: ${model}`
    });
    if (!modelAllowed) hasFail = true;

    // Live call
    const liveGemini = await checkGeminiLive(geminiKey, model);
    if (liveGemini.modelListOk && liveGemini.modelFound && liveGemini.generationOk) {
      rows.push({
        component: 'Gemini',
        check: 'Google API model-list & test generation',
        status: 'PASS',
        details: `Active model verified in Google catalog; tiny generation passed (HTTP 200)`
      });
    } else if (liveGemini.isRetired) {
      rows.push({
        component: 'Gemini',
        check: 'Google API model verification',
        status: 'FAIL',
        details: `Model ${model} is deprecated/retired in Google documentation`
      });
      hasFail = true;
    } else {
      rows.push({
        component: 'Gemini',
        check: 'Google API live verification',
        status: 'FAIL',
        details: `Google API error: ${liveGemini.errorCode} (HTTP ${liveGemini.status})`
      });
      hasFail = true;
    }
  }

  // -----------------------------------------------------------
  // 2. Supabase Frontend Configuration & Live Calls
  // -----------------------------------------------------------
  const supaUrl = frontendEnv.VITE_SUPABASE_URL || '';
  const supaKey = frontendEnv.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  if (!supaUrl && !supaKey) {
    rows.push({
      component: 'Supabase',
      check: 'Frontend credentials configured',
      status: 'WARN',
      details: '.env.local unconfigured; running in Guest mode only'
    });
    rows.push({
      component: 'Supabase',
      check: 'Auth health & key verification',
      status: 'SKIP',
      details: 'Skipped: VITE_SUPABASE_URL and key unconfigured'
    });
  } else {
    const urlValid = validateSupabaseUrl(supaUrl);
    rows.push({
      component: 'Supabase',
      check: 'VITE_SUPABASE_URL shape',
      status: urlValid ? 'PASS' : 'FAIL',
      details: urlValid ? 'Valid HTTPS URL' : 'Malformed Supabase project URL'
    });
    if (!urlValid) hasFail = true;

    const keyShapeValid = validatePublishableKeyShape(supaKey);
    const decodedRole = decodeTokenRole(supaKey);

    if (decodedRole.isDangerous) {
      rows.push({
        component: 'Supabase',
        check: 'Key Role Security Check',
        status: 'FAIL',
        details: `CRITICAL: Frontend key decoded with elevated role: ${decodedRole.role}`
      });
      hasFail = true;
    } else {
      rows.push({
        component: 'Supabase',
        check: 'Publishable key shape & role',
        status: keyShapeValid ? 'PASS' : 'FAIL',
        details: keyShapeValid ? `Valid client key shape (role: ${decodedRole.role})` : 'Invalid key shape'
      });
      if (!keyShapeValid) hasFail = true;
    }

    if (urlValid && keyShapeValid && !decodedRole.isDangerous) {
      const liveSupa = await checkSupabaseLive(supaUrl, supaKey);
      if (liveSupa.healthOk && liveSupa.keyAccepted) {
        rows.push({
          component: 'Supabase',
          check: 'Auth endpoint & publishable key acceptance',
          status: 'PASS',
          details: 'Auth service healthy (HTTP 200) and publishable key accepted'
        });
      } else if (liveSupa.isPaused) {
        rows.push({
          component: 'Supabase',
          check: 'Auth endpoint responsiveness',
          status: 'WARN',
          details: 'Project appears paused or hibernating in Supabase dashboard'
        });
      } else {
        rows.push({
          component: 'Supabase',
          check: 'Key acceptance',
          status: 'FAIL',
          details: liveSupa.errorDetail || `Rejected with HTTP ${liveSupa.statusCode}`
        });
        hasFail = true;
      }
    }
  }

  // Check for unused Supabase secret key in server/.env
  if (serverEnv.SUPABASE_SECRET_KEY || serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    rows.push({
      component: 'Supabase',
      check: 'server/.env secret key usage',
      status: 'WARN',
      details: 'Supabase secret key exists in server/.env but proxy server does not currently read it'
    });
  }

  // -----------------------------------------------------------
  // 3. Wiring Checks
  // -----------------------------------------------------------
  const port = parseInt(serverEnv.PORT || '3001', 10);
  const allowedOrigins = serverEnv.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173';
  let viteConfig = '';
  try {
    viteConfig = fs.readFileSync(path.join(ROOT_DIR, 'vite.config.js'), 'utf8');
  } catch {
    // ignore
  }

  const wiring = checkWiring(port, allowedOrigins, viteConfig);
  rows.push({
    component: 'Wiring',
    check: 'Vite /api proxy forwarding',
    status: wiring.proxyConfigured ? 'PASS' : 'FAIL',
    details: wiring.proxyConfigured ? `Forwards /api -> http://127.0.0.1:${port}` : `Missing proxy route in vite.config.js`
  });
  if (!wiring.proxyConfigured) hasFail = true;

  rows.push({
    component: 'Wiring',
    check: 'ALLOWED_ORIGINS dev addresses',
    status: wiring.devOriginsAllowed ? 'PASS' : 'FAIL',
    details: wiring.devOriginsAllowed ? 'Includes http://localhost:5173 and 127.0.0.1:5173' : 'Missing local dev origins'
  });
  if (!wiring.devOriginsAllowed) hasFail = true;

  // -----------------------------------------------------------
  // 4. Dist Bundle Secret Leakage Scan
  // -----------------------------------------------------------
  const distDir = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(distDir)) {
    const distFiles = [];
    const readDist = (dir) => {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
          readDist(full);
        } else {
          distFiles.push({
            name: path.relative(distDir, full).replace(/\\/g, '/'),
            content: fs.readFileSync(full, 'utf8')
          });
        }
      }
    };
    readDist(distDir);

    // Only check actual confidential secret fields from server/.env (ignore public config like model names, port numbers, booleans)
    const secretValues = Object.entries(serverEnv)
      .filter(([k]) => {
        const kUpper = k.toUpperCase();
        return (
          kUpper.includes('KEY') ||
          kUpper.includes('SECRET') ||
          kUpper.includes('TOKEN') ||
          kUpper.includes('PASSWORD')
        ) && !kUpper.includes('MODEL') && !kUpper.includes('PORT');
      })
      .map(([, v]) => v)
      .filter(Boolean);

    const bundleHits = scanDistBundleForSecrets(distFiles, secretValues);

    rows.push({
      component: 'Bundle',
      check: 'dist/ secret leakage scan',
      status: bundleHits.length === 0 ? 'PASS' : 'FAIL',
      details: bundleHits.length === 0 ? 'Clean (0 secret patterns or server values in dist/)' : `FAIL: ${bundleHits.length} secret hit(s) detected in production bundle`
    });
    if (bundleHits.length > 0) hasFail = true;
  } else {
    rows.push({
      component: 'Bundle',
      check: 'dist/ secret leakage scan',
      status: 'SKIP',
      details: 'dist/ directory not built yet'
    });
  }

  return { rows, hasFail };
}

// -------------------------------------------------------------
// CLI Table Printing & Execution
// -------------------------------------------------------------

function printTable(rows) {
  console.log('\n========================================================================================');
  console.log('                          METRICA KEY & SECURITY AUDIT TABLE                            ');
  console.log('========================================================================================');
  console.log(
    `| ${'Component'.padEnd(10)} | ${'Check'.padEnd(36)} | ${'Status'.padEnd(6)} | ${'Details'.padEnd(38)} |`
  );
  console.log('|------------|--------------------------------------|--------|----------------------------------------|');

  for (const r of rows) {
    const statusFormatted =
      r.status === 'PASS'
        ? '\x1b[32mPASS\x1b[0m  '
        : r.status === 'FAIL'
        ? '\x1b[31mFAIL\x1b[0m  '
        : r.status === 'WARN'
        ? '\x1b[33mWARN\x1b[0m  '
        : '\x1b[36mSKIP\x1b[0m  ';
    console.log(
      `| ${r.component.padEnd(10)} | ${r.check.slice(0, 36).padEnd(36)} | ${statusFormatted} | ${r.details.slice(0, 38).padEnd(38)} |`
    );
  }
  console.log('========================================================================================\n');
}

const isDirectExecution =
  process.argv[1] &&
  (import.meta.url === pathToFileURL(process.argv[1]).href ||
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop()));

if (isDirectExecution) {
  runAllLiveKeyChecks()
    .then(({ rows, hasFail }) => {
      printTable(rows);
      if (hasFail) {
        console.error('❌ One or more critical security checks FAILED.');
        process.exit(1);
      } else {
        console.log('✓ All key and security checks passed successfully or reported safe warnings.');
        process.exit(0);
      }
    })
    .catch((err) => {
      console.error('Fatal error running key checks:', err);
      process.exit(1);
    });
}

/**
 * Metrica Privacy Constants and In-App Notices
 *
 * Canonical strings specified for in-app privacy transparency and user consent.
 * Changes to legal text or notices must be reflected here and bumped in version.
 */

export const PRIVACY_NOTICE_VERSION = 1;
export const PRIVACY_NOTICE_LAST_UPDATED = 'November 1, 2026';

// Exact in-app notices (do not alter wording without legal approval)
export const UPLOAD_NOTICE =
  'Your file is processed in your browser. It is not uploaded to our servers.';

export const ASK_AI_NOTICE =
  'Ask AI sends your question, column names, data types, summary statistics and up to 20 sample rows to Google Gemini to generate an answer. Your full file is never sent. Don’t use Ask AI with personal or sensitive data.';

export const SIGNUP_NOTICE =
  'We store your email and the rules, dashboards and preferences you save, not your spreadsheets. See our Privacy Notice for details.';

export const METRICA_ASK_AI_PRIVACY_ACK_KEY = 'metrica_ask_ai_privacy_ack';

/**
 * Checks if the user has acknowledged the Ask AI privacy disclosure
 * for the given notice version.
 *
 * Defensively protects against corrupt JSON, invalid types, and prototype pollution.
 *
 * @param {number} requiredVersion
 * @returns {boolean}
 */
export function hasAcknowledgedAskAi(requiredVersion = PRIVACY_NOTICE_VERSION) {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(METRICA_ASK_AI_PRIVACY_ACK_KEY);
    if (!raw || typeof raw !== 'string') return false;

    // Defense against prototype injection in stored strings
    if (raw.includes('__proto__') || raw.includes('constructor') || raw.includes('prototype')) {
      return false;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return false;
    }

    if (typeof parsed.version !== 'number' || parsed.version < requiredVersion) {
      return false;
    }

    if (!parsed.acknowledgedAt || typeof parsed.acknowledgedAt !== 'string') {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Records that the user acknowledged the Ask AI privacy disclosure.
 *
 * @param {number} version
 */
export function recordAskAiAcknowledgment(version = PRIVACY_NOTICE_VERSION) {
  try {
    if (typeof localStorage === 'undefined') return;
    const record = {
      version: Number(version) || PRIVACY_NOTICE_VERSION,
      acknowledgedAt: new Date().toISOString()
    };
    localStorage.setItem(METRICA_ASK_AI_PRIVACY_ACK_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('[Privacy] Failed to persist Ask AI acknowledgment in localStorage:', err);
  }
}

/**
 * Clears stored Ask AI acknowledgment (useful for testing and reset flows).
 */
export function clearAskAiAcknowledgment() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(METRICA_ASK_AI_PRIVACY_ACK_KEY);
    }
  } catch (err) {
    console.warn('[Privacy] Failed to clear Ask AI acknowledgment:', err);
  }
}

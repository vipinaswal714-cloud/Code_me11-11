/**
 * Metrica Privacy Constants and In-App Notices
 *
 * Canonical strings specified for in-app privacy transparency and user consent.
 * Changes to legal text or notices must be reflected here and bumped in version.
 */

export const PRIVACY_NOTICE_VERSION = 2;
export const PRIVACY_NOTICE_LAST_UPDATED = 'November 9, 2026';

// Exact in-app notices (do not alter wording without legal approval)
export const UPLOAD_NOTICE =
  'Your file is analyzed in your browser and is not saved to Metrica’s database. You are responsible for the data you choose to upload.';

export const ASK_AI_NOTICE =
  'Ask AI sends your question, dataset summary, column information, and up to 20 real sample rows to Google Gemini. This app uses Google’s free or unpaid Gemini API tier, which may use submitted content to improve services and allow human review. Do not send personal, sensitive, confidential, or health data. See the Privacy Notice.';

export const SIGNUP_NOTICE =
  'Supabase processes your email and sign-in information. Metrica does not currently save your uploaded datasets or saved rules to your account. See the Privacy Notice.';

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

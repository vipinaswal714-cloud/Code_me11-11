import fs from 'node:fs';

export class PrivacyNoticePlaceholderError extends Error {
  constructor(message, placeholders) {
    super(message);
    this.name = 'PrivacyNoticePlaceholderError';
    this.placeholders = placeholders;
  }
}

/**
 * Scans markdown text for unresolved placeholders in square brackets like [date] or [hosting provider].
 * Ignores valid markdown links of the form [anchor](url).
 *
 * @param {string} text
 * @returns {string[]} List of unresolved placeholder strings
 */
export function findUnresolvedPlaceholders(text) {
  if (!text || typeof text !== 'string') return [];

  // Match bracketed content that is NOT followed by an open parenthesis '(' (which indicates a markdown link)
  // Also ignores checkboxes like [ ] or [x]
  const placeholderRegex = /\[([^\]\n]+)\](?!\()/g;
  const placeholders = [];
  let match;

  while ((match = placeholderRegex.exec(text)) !== null) {
    const content = match[1].trim();
    // Exclude task list checkboxes
    if (content === ' ' || content === 'x' || content === 'X') {
      continue;
    }
    placeholders.push(content);
  }

  return placeholders;
}

/**
 * Scans a file on disk for unresolved privacy notice placeholders.
 *
 * @param {string} filePath
 * @returns {{ filePath: string, placeholders: string[], totalCount: number }}
 */
export function scanPrivacyNoticeFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Privacy notice file not found at: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const placeholders = findUnresolvedPlaceholders(content);

  return {
    filePath,
    placeholders,
    totalCount: placeholders.length
  };
}

/**
 * Validates privacy notice for production readiness.
 *
 * In strict mode (production builds), throws an error if unresolved placeholders exist.
 * In non-strict mode (development/test), returns a warning flag to avoid blocking workflow.
 *
 * @param {string} filePath
 * @param {{ strict?: boolean }} options
 * @returns {{ valid: boolean, warning?: boolean, unresolvedCount: number, placeholders: string[] }}
 */
export function validatePrivacyNotice(filePath, options = {}) {
  const isStrict = Boolean(
    options.strict ||
    process.env.STRICT_PLACEHOLDER_CHECK === 'true' ||
    process.env.NODE_ENV === 'production'
  );

  const scan = scanPrivacyNoticeFile(filePath);

  if (scan.totalCount > 0) {
    if (isStrict) {
      throw new PrivacyNoticePlaceholderError(
        `Production build halted: ${scan.totalCount} unresolved placeholder(s) detected in ${filePath}:\n` +
        scan.placeholders.map((p, i) => `  ${i + 1}. [${p}]`).join('\n') +
        `\nPlease fill in all placeholders before deploying to production.`,
        scan.placeholders
      );
    }

    return {
      valid: true,
      warning: true,
      unresolvedCount: scan.totalCount,
      placeholders: scan.placeholders
    };
  }

  return {
    valid: true,
    warning: false,
    unresolvedCount: 0,
    placeholders: []
  };
}

import { Marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Generates URL-safe and HTML-id-safe slug from header text.
 * e.g. "1. The short version" -> "1-the-short-version"
 *
 * @param {string} text
 * @returns {string}
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '') // strip HTML tags
    .replace(/[^a-z0-9]+/g, '-') // convert non-alphanumeric to hyphens
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

/**
 * Extracts Table of Contents items (level 2 headings) from markdown string.
 *
 * @param {string} markdown
 * @returns {{ id: string, title: string, level: number }[]}
 */
export function extractTableOfContents(markdown) {
  if (!markdown || typeof markdown !== 'string') return [];

  const lines = markdown.split(/\r?\n/);
  const toc = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      if (level === 2) {
        // level 2 headings are the primary sections
        const title = match[2].trim();
        const id = slugify(title);
        toc.push({ id, title, level });
      }
    }
  }

  return toc;
}

/**
 * Configured marked instance with custom heading renderer for anchor IDs
 */
function createMarkedParser() {
  const markedInstance = new Marked();

  markedInstance.use({
    renderer: {
      heading(token) {
        // In marked v15+, token can be an object with depth and text or raw
        const depth = typeof token.depth === 'number' ? token.depth : 2;
        const text = token.text || token.raw || '';
        const id = slugify(text);
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      }
    }
  });

  return markedInstance;
}

const markedParser = createMarkedParser();

// Configure DOMPurify hook to ensure all external links have target="_blank" and rel="noopener noreferrer"
try {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node && node.tagName === 'A' && node.getAttribute) {
      const href = node.getAttribute('href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });
} catch (err) {
  console.warn('[MarkdownParser] Could not attach DOMPurify hook:', err.message);
}

/**
 * Parses markdown into secure, sanitized HTML string.
 * Blocks scripts, inline execution handlers, dangerous schemes (javascript:, data:),
 * and automatically injects secure link attributes and heading IDs.
 *
 * @param {string} markdown
 * @returns {{ html: string, headings: { id: string, title: string, level: number }[] }}
 */
export function parseAndSanitizeMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return { html: '', headings: [] };
  }

  // 1. Parse markdown to raw HTML
  const rawHtml = markedParser.parse(markdown);

  // 2. Sanitize HTML via DOMPurify with strict profile
  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'ul', 'ol', 'li', 'blockquote',
      'strong', 'b', 'em', 'i', 'code', 'pre',
      'hr', 'br', 'span', 'div', 'a', 'table',
      'thead', 'tbody', 'tr', 'th', 'td'
    ],
    ALLOWED_ATTR: ['id', 'href', 'target', 'rel', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  });

  // 3. Extract headings for TOC
  const headings = extractTableOfContents(markdown);

  return {
    html: sanitizedHtml,
    headings
  };
}

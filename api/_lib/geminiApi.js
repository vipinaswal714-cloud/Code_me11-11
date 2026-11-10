import {
  DEFAULT_GEMINI_MODEL,
  ALLOWED_GEMINI_MODELS,
  callGemini,
  checkGeminiHealth,
  mapGeminiError
} from '../../server/geminiProvider.js';

const MAX_BODY_BYTES = 100 * 1024;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const DAILY_MAX_REQUESTS = Number(process.env.DAILY_MAX_REQUESTS) || 500;
const rateLimit = new Map();
const dailyQuota = new Map();

export function setApiHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export function sendError(res, status, message) {
  return res.status(status).json({ error: { message } });
}

function bodyObject(req) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    return req.body;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      const error = new Error('Invalid JSON format.');
      error.statusCode = 400;
      throw error;
    }
  }
  return {};
}

function requestIp(req) {
  // Vercel supplies x-real-ip from the edge. Avoid trusting arbitrary forwarded lists.
  const ip = req.headers['x-real-ip'];
  return (Array.isArray(ip) ? ip[0] : ip) || req.socket?.remoteAddress || 'unknown';
}

function enforceBodySize(req) {
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    const error = new Error('Payload too large. Request body must be under 100 KB.');
    error.statusCode = 413;
    throw error;
  }
}

export function enforceAiLimits(req, res) {
  const ip = requestIp(req);
  const now = Date.now();
  const active = (rateLimit.get(ip) || []).filter(timestamp => timestamp > now - RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_MAX_REQUESTS) {
    sendError(res, 429, 'Too many requests. Please wait a minute before querying again.');
    return false;
  }
  active.push(now);
  rateLimit.set(ip, active);

  const day = new Date().toISOString().slice(0, 10);
  const quota = dailyQuota.get(ip);
  const requests = quota?.day === day ? quota.requests : 0;
  if (requests >= DAILY_MAX_REQUESTS) {
    sendError(res, 429, `Daily request limit of ${DAILY_MAX_REQUESTS} exceeded for this IP.`);
    return false;
  }
  dailyQuota.set(ip, { day, requests: requests + 1 });
  return true;
}

export function handleAiError(res, error) {
  if (error?.statusCode === 400 || error?.statusCode === 413) {
    return sendError(res, error.statusCode, error.message);
  }
  const mapped = mapGeminiError(error);
  return sendError(res, mapped.statusCode, mapped.message);
}

export async function handleGeminiHealth(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed.');
  }
  try {
    enforceBodySize(req);
    bodyObject(req);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) return sendError(res, 401, 'GEMINI_API_KEY is not configured in the Vercel server environment.');

    const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    const health = await checkGeminiHealth({ apiKey, model });
    if (!health.ok) return sendError(res, health.statusCode || 500, health.message);
    return res.status(200).json({ status: 'ok', connected: true, model: health.model, message: 'Google Gemini connected successfully' });
  } catch (error) {
    return handleAiError(res, error);
  }
}

export async function handleGeminiChat(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed.');
  }
  try {
    enforceBodySize(req);
    const body = bodyObject(req);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey?.trim()) return sendError(res, 401, 'GEMINI_API_KEY is not configured in the Vercel server environment.');

    const requestedModel = String(body.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
    if (!ALLOWED_GEMINI_MODELS.has(requestedModel)) {
      return sendError(res, 400, `Disallowed model name. Allowed models: ${Array.from(ALLOWED_GEMINI_MODELS).join(', ')}`);
    }

    let userPrompt = '';
    let systemInstruction = body.systemInstruction || '';
    if (typeof body.prompt === 'string') {
      userPrompt = body.prompt;
    } else if (Array.isArray(body.messages)) {
      const systemMessage = body.messages.find(message => message?.role === 'system');
      if (!systemInstruction && typeof systemMessage?.content === 'string') systemInstruction = systemMessage.content;
      userPrompt = body.messages.filter(message => message?.role !== 'system')
        .map(message => typeof message?.content === 'string' ? message.content : '').join('\n\n');
    }
    if (!userPrompt.trim()) return sendError(res, 400, 'Invalid request: prompt or messages content is required.');

    const maxTokens = Math.min(Math.max(Number(body.maxTokens || body.max_tokens) || 1500, 100), 2000);
    const result = await callGemini({ apiKey, model: requestedModel, systemInstruction, userPrompt, maxTokens });
    return res.status(200).json({
      text: result.text,
      model: result.model,
      choices: [{ message: { content: result.text } }]
    });
  } catch (error) {
    return handleAiError(res, error);
  }
}

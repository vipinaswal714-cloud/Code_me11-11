/**
 * Metrica Google Gemini Provider Module
 *
 * Dedicated, isolated server-side integration with Google Gemini.
 * Uses official @google/genai SDK for Node.js runtime.
 * All API keys remain strictly on the backend and are never returned or logged.
 */

import { GoogleGenAI } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-flash-lite-latest';
export const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
]);

/**
 * Maps upstream Google Gemini and network errors to secure, friendly user messages.
 * Never leaks raw server stack traces, system paths, or credential details.
 */
export function mapGeminiError(error) {
  if (!error) {
    return {
      statusCode: 500,
      message: 'An unexpected internal error occurred while contacting the AI service.'
    };
  }

  // Abort / Timeout
  if (error.name === 'AbortError' || error.type === 'aborted' || /timeout/i.test(error.message)) {
    return {
      statusCode: 504,
      message: 'Gemini request timed out after 35 seconds. Please try again.'
    };
  }

  // Network / Connection drop
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'UND_ERR_CONNECT_TIMEOUT' || /fetch failed/i.test(error.message)) {
    return {
      statusCode: 503,
      message: 'Could not connect to Google Gemini. Please check your internet connection.'
    };
  }

  // Safety filter block
  if (error.finishReason === 'SAFETY' || error.blockedReason || /safety|blocked/i.test(error.message)) {
    return {
      statusCode: 400,
      message: 'Response was blocked by safety filters or returned empty. Please rephrase your query.'
    };
  }

  const status = Number(error.status || error.statusCode || 0);
  const errMsg = String(error.message || '');

  // 401 / 403 / 400 Invalid or Restricted Key
  if (status === 401 || status === 403 || (status === 400 && /api[_\s]?key|invalid[_\s]?argument/i.test(errMsg))) {
    return {
      statusCode: 401,
      message: 'Invalid or restricted Google Gemini API key. Check the server environment variable GEMINI_API_KEY.'
    };
  }

  // 429 Quota / Rate limit
  if (status === 429 || /resource_exhausted|quota|rate[_\s]?limit/i.test(errMsg)) {
    return {
      statusCode: 429,
      message: 'Google Gemini quota or rate limit exceeded. Please wait a moment or check your Google AI Studio plan.'
    };
  }

  // 404 Model not found
  if (status === 404 || /not[_\s]?found/i.test(errMsg)) {
    return {
      statusCode: 404,
      message: 'Requested Gemini model was not found. Check the server environment variable GEMINI_MODEL.'
    };
  }

  // 503 Overloaded service
  if (status === 503 || status === 500 || /overloaded|unavailable|internal/i.test(errMsg)) {
    return {
      statusCode: 503,
      message: 'Google Gemini service is currently overloaded. Please try again in a few moments.'
    };
  }

  return {
    statusCode: status >= 400 && status < 600 ? status : 500,
    message: 'Google Gemini request failed. Please check your configuration and try again.'
  };
}

/**
 * Builds standard configuration and prompt payload for Gemini
 */
export function buildGeminiPayload({ systemInstruction, userPrompt, model, responseFormat = 'json', maxTokens = 1500 }) {
  const selectedModel = model && ALLOWED_GEMINI_MODELS.has(model) ? model : DEFAULT_GEMINI_MODEL;
  
  return {
    model: selectedModel,
    contents: userPrompt,
    config: {
      systemInstruction: systemInstruction || undefined,
      responseMimeType: responseFormat === 'json' ? 'application/json' : 'text/plain',
      temperature: 0.2,
      maxOutputTokens: maxTokens
    }
  };
}

/**
 * Executes a call to Google Gemini using official @google/genai SDK
 */
export async function callGemini({ apiKey, model, systemInstruction, userPrompt, maxTokens = 1500 }) {
  if (!apiKey || !apiKey.trim()) {
    throw {
      status: 401,
      message: 'Missing GEMINI_API_KEY. Configure it in the server environment.'
    };
  }

  const selectedModel = model && ALLOWED_GEMINI_MODELS.has(model) ? model : DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: maxTokens
      }
    });

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
      throw { finishReason: 'SAFETY', message: 'Response blocked by Google safety filters' };
    }

    const text = response.text || '';
    if (!text.trim()) {
      throw { finishReason: 'EMPTY', message: 'Gemini returned an empty response' };
    }

    return {
      text,
      model: selectedModel
    };
  } catch (err) {
    throw err;
  }
}

/**
 * Verifies Gemini connectivity and key validity without leaking credentials
 */
export async function checkGeminiHealth({ apiKey, model = DEFAULT_GEMINI_MODEL }) {
  if (!apiKey || !apiKey.trim()) {
    return {
      ok: false,
      configured: false,
      message: 'GEMINI_API_KEY is not configured in the server environment.'
    };
  }

  const selectedModel = model && ALLOWED_GEMINI_MODELS.has(model) ? model : DEFAULT_GEMINI_MODEL;
  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  try {
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: 'Ping: reply with single word "OK"',
      config: {
        maxOutputTokens: 5,
        temperature: 0
      }
    });

    return {
      ok: true,
      configured: true,
      model: selectedModel,
      message: 'Google Gemini connected successfully'
    };
  } catch (err) {
    const mapped = mapGeminiError(err);
    return {
      ok: false,
      configured: true,
      statusCode: mapped.statusCode,
      message: mapped.message
    };
  }
}

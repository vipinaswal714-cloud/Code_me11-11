import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  mapGeminiError,
  buildGeminiPayload,
  ALLOWED_GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL
} from '../server/geminiProvider.js';

describe('Gemini Provider Module', () => {
  test('defines valid allowed models with gemini-flash-lite-latest as default', () => {
    assert.strictEqual(DEFAULT_GEMINI_MODEL, 'gemini-flash-lite-latest');
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-flash-lite-latest'));
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-flash-latest'));
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-3.8-flash'));
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-2.5-flash'));
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-2.0-flash'));
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-1.5-flash'));
    assert.ok(ALLOWED_GEMINI_MODELS.has('gemini-1.5-pro'));
  });

  test('buildGeminiPayload structures contents and system instruction for Gemini', () => {
    const payload = buildGeminiPayload({
      systemInstruction: 'You are Metrica AI assistant.',
      userPrompt: 'Analyze sales by region',
      model: 'gemini-2.5-flash',
      responseFormat: 'json'
    });

    assert.strictEqual(payload.model, 'gemini-2.5-flash');
    assert.ok(payload.contents);
    assert.strictEqual(payload.config.responseMimeType, 'application/json');
    assert.strictEqual(payload.config.systemInstruction, 'You are Metrica AI assistant.');
  });

  test('mapGeminiError maps 401 and 403 API key issues to friendly user message', () => {
    const err401 = { status: 401, message: 'API_KEY_INVALID: key not valid' };
    const mapped = mapGeminiError(err401);
    assert.strictEqual(mapped.statusCode, 401);
    assert.strictEqual(mapped.message, 'Invalid or restricted Google Gemini API key. Please check your key in server/.env.');
    assert.ok(!mapped.message.includes('API_KEY_INVALID')); // no raw leak
  });

  test('mapGeminiError maps 429 quota/rate limit to friendly message', () => {
    const err429 = { status: 429, message: 'Resource has been exhausted (e.g. check quota).' };
    const mapped = mapGeminiError(err429);
    assert.strictEqual(mapped.statusCode, 429);
    assert.strictEqual(mapped.message, 'Google Gemini quota or rate limit exceeded. Please wait a moment or check your Google AI Studio plan.');
  });

  test('mapGeminiError maps 404 model not found to friendly message', () => {
    const err404 = { status: 404, message: 'models/gemini-unknown not found' };
    const mapped = mapGeminiError(err404);
    assert.strictEqual(mapped.statusCode, 404);
    assert.strictEqual(mapped.message, 'Requested Gemini model was not found. Please verify the GEMINI_MODEL in server/.env.');
  });

  test('mapGeminiError maps 503 service unavailable to friendly message', () => {
    const err503 = { status: 503, message: 'The model is overloaded. Please try again later.' };
    const mapped = mapGeminiError(err503);
    assert.strictEqual(mapped.statusCode, 503);
    assert.strictEqual(mapped.message, 'Google Gemini service is currently overloaded. Please try again in a few moments.');
  });

  test('mapGeminiError maps safety filter block to safe message', () => {
    const safetyErr = { finishReason: 'SAFETY', message: 'Candidate blocked due to safety' };
    const mapped = mapGeminiError(safetyErr);
    assert.strictEqual(mapped.statusCode, 400);
    assert.strictEqual(mapped.message, 'Response was blocked by safety filters or returned empty. Please rephrase your query.');
  });

  test('mapGeminiError maps timeout error properly', () => {
    const timeoutErr = { name: 'AbortError', message: 'The operation was aborted' };
    const mapped = mapGeminiError(timeoutErr);
    assert.strictEqual(mapped.statusCode, 504);
    assert.strictEqual(mapped.message, 'Gemini request timed out after 35 seconds. Please try again.');
  });
});

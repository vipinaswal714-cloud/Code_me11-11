import { enforceAiLimits, handleGeminiChat, setApiHeaders } from '../_lib/geminiApi.js';

export default async function handler(req, res) {
  setApiHeaders(res);
  if (!enforceAiLimits(req, res)) return;
  return handleGeminiChat(req, res);
}

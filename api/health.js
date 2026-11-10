import { DEFAULT_GEMINI_MODEL } from '../server/geminiProvider.js';
import { setApiHeaders } from './_lib/geminiApi.js';

export default function handler(req, res) {
  setApiHeaders(res);
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: { message: 'Method not allowed.' } });
  }
  return res.status(200).json({
    status: 'ok',
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL
  });
}

import { deleteAuthenticatedSupabaseUser } from '../../server/accountDeletion.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const result = await deleteAuthenticatedSupabaseUser({
    authorization: req.headers.authorization,
    supabaseUrl: process.env.SUPABASE_URL,
    secretKey: process.env.SUPABASE_SECRET_KEY
  });

  if (result.deleted) {
    return res.status(200).json({ deleted: true });
  }
  return res.status(result.status).json({ error: result.error });
}

import { createClient } from '@supabase/supabase-js';

/**
 * Permanently deletes the Supabase Auth user represented by a verified access token.
 * This module must only be called from a trusted server environment.
 */
export async function deleteAuthenticatedSupabaseUser({ authorization, supabaseUrl, secretKey }) {
  if (!supabaseUrl || !secretKey) {
    return { status: 503, error: 'Account deletion is not configured on the server.' };
  }

  const tokenMatch = /^Bearer\s+([^\s]+)$/i.exec(authorization || '');
  if (!tokenMatch) {
    return { status: 401, error: 'Please sign in again and retry account deletion.' };
  }

  try {
    const admin = createClient(supabaseUrl, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const { data, error: verifyError } = await admin.auth.getUser(tokenMatch[1]);
    const user = data?.user;
    if (verifyError || !user || user.is_anonymous) {
      return { status: 401, error: 'Your sign-in could not be verified. Please sign in again.' };
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return { status: 502, error: 'Supabase could not delete this account. Please try again or contact support.' };
    }

    return { status: 200, deleted: true };
  } catch {
    return { status: 502, error: 'Supabase could not complete account deletion. Please try again later.' };
  }
}

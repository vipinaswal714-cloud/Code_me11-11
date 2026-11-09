/**
 * Metrica Supabase Client Module
 *
 * Dedicated client-side integration for Supabase Cloud Database & Auth.
 * Frontend only holds and passes the public Project URL and Publishable Key.
 * Service role keys, secret keys, or database passwords MUST NEVER be stored
 * or accessed in frontend code.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Safely resolves frontend environment variables across Vite and Node test runtimes.
 */
function resolveEnv(name) {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name] !== undefined) {
      return import.meta.env[name];
    }
  } catch {
    // Ignore in non-module environments
  }
  if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
    return process.env[name];
  }
  return '';
}

/**
 * Returns the current Supabase configuration state.
 */
export function getSupabaseConfig() {
  const url = (resolveEnv('VITE_SUPABASE_URL') || '').trim();
  const publishableKey = (resolveEnv('VITE_SUPABASE_PUBLISHABLE_KEY') || '').trim();
  const missingFields = [];

  if (!url) missingFields.push('VITE_SUPABASE_URL');
  if (!publishableKey) missingFields.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  return {
    url,
    publishableKey,
    isConfigured: missingFields.length === 0,
    missingFields
  };
}

/**
 * Creates and returns a hardened Supabase client instance.
 * Throws explicit, descriptive errors if configuration is incomplete or invalid.
 */
export function createSupabaseClient(customUrl, customKey) {
  const config = getSupabaseConfig();
  const url = (customUrl !== undefined ? customUrl : config.url) || '';
  const publishableKey = (customKey !== undefined ? customKey : config.publishableKey) || '';

  if (!url.trim()) {
    throw new Error(
      'Missing required Supabase URL. Please define VITE_SUPABASE_URL in your .env.local file.'
    );
  }

  if (!publishableKey.trim()) {
    throw new Error(
      'Missing required Supabase Publishable Key. Please define VITE_SUPABASE_PUBLISHABLE_KEY in your .env.local file.'
    );
  }

  // Validate URL format
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error();
    }
  } catch {
    throw new Error(`Invalid Supabase URL format: "${url}". Expected a valid HTTP/HTTPS URL.`);
  }

  return createClient(url.trim(), publishableKey.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

let cachedClient = null;

/**
 * Returns the lazily initialized Supabase client singleton, or throws if unconfigured.
 */
export function getSupabase() {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    throw new Error(
      'Supabase is not configured. Please define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local.'
    );
  }

  if (!cachedClient) {
    cachedClient = createSupabaseClient(config.url, config.publishableKey);
  }

  return cachedClient;
}

/**
 * Checks the connection to Supabase without querying application tables.
 * Uses `auth.getSession()` for lightweight status probing.
 *
 * @param {object} [client] - Optional client instance (useful for testing)
 * @returns {Promise<{ connected: boolean, error: string | null }>}
 */
export function checkSupabaseConnection(client = null) {
  return new Promise(async (resolve) => {
    let instance = client;

    if (!instance) {
      const config = getSupabaseConfig();
      if (!config.isConfigured) {
        return resolve({
          connected: false,
          error: `Supabase is not configured. Missing: ${config.missingFields.join(', ')} in .env.local`
        });
      }

      try {
        instance = getSupabase();
      } catch (err) {
        return resolve({
          connected: false,
          error: err.message
        });
      }
    }

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out')), 5000)
      );

      const sessionPromise = instance.auth.getSession();
      const res = await Promise.race([sessionPromise, timeoutPromise]);

      if (res && res.error) {
        return resolve({
          connected: false,
          error: `Failed to connect to Supabase: ${res.error.message || 'Authentication error'}`
        });
      }

      return resolve({
        connected: true,
        error: null
      });
    } catch (err) {
      return resolve({
        connected: false,
        error: `Failed to connect to Supabase: ${err.message || 'Network error'}`
      });
    }
  });
}

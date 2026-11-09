import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, LoaderCircle, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { getSupabase } from '../lib/supabaseClient';

export default function ProfilePage({ session, onBack, onDeleted }) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const deleteAccount = async () => {
    if (confirmation.trim() !== 'DELETE') return;
    setBusy(true);
    setError('');

    try {
      if (!session?.access_token) {
        throw new Error('Your sign-in session has expired. Please sign in again.');
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || 'Account deletion failed. Please try again.');
      }

      try {
        await getSupabase().auth.signOut({ scope: 'local' });
      } catch {
        // The server has already deleted the account; navigation still clears app auth state.
      }
      onDeleted();
    } catch (deleteError) {
      setError(deleteError.message || 'Account deletion failed. Please try again.');
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen relative px-4 py-10 text-glass-primary">
      <div className="glass-backdrop" aria-hidden="true">
        <div className="glass-backdrop-blob-1" />
        <div className="glass-backdrop-blob-2" />
        <div className="glass-backdrop-blob-3" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        <button
          type="button"
          onClick={onBack}
          className="glass-button mb-6 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-glass-secondary hover:text-glass-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Metrica
        </button>

        <section className="glass-panel rounded-3xl border border-glass-border p-6 shadow-glass-lg sm:p-9">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-2xl bg-metrica-500/15 p-3 text-metrica-600 dark:text-metrica-300">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-metrica-600 dark:text-metrica-400">Account</p>
              <h1 className="text-2xl font-extrabold">Your profile</h1>
            </div>
          </div>

          <div className="rounded-2xl border border-glass-border bg-white/40 p-5 dark:bg-white/5">
            <p className="text-xs font-semibold text-glass-muted">Signed in as</p>
            <p className="mt-1 break-all text-base font-bold">{session?.user?.email || 'Account email unavailable'}</p>
            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-glass-secondary">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Supabase manages this sign-in account. Your uploaded datasets and saved rules are not stored in this account by the current app.
            </p>
          </div>

          <div className="mt-8 border-t border-glass-border pt-7">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <h2 className="font-bold">Delete account</h2>
                <p className="mt-1 text-sm leading-6 text-glass-secondary">
                  This permanently removes your Metrica sign-in account. It does not erase information previously sent to Google Gemini or browser-local settings and saved rules. Read the Privacy Notice before continuing.
                </p>
              </div>
            </div>

            {!confirming ? (
              <button
                type="button"
                onClick={() => { setConfirming(true); setError(''); }}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-700 transition-colors hover:bg-red-500/15 dark:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            ) : (
              <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/5 p-4 sm:p-5">
                <label htmlFor="delete-account-confirmation" className="block text-sm font-semibold">
                  Type <span className="font-extrabold">DELETE</span> to confirm
                </label>
                <input
                  id="delete-account-confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  disabled={busy}
                  className="mt-2 w-full rounded-xl border border-glass-border bg-white/70 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-red-500 dark:bg-slate-900/70 dark:text-white"
                />
                {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={deleteAccount}
                    disabled={busy || confirmation.trim() !== 'DELETE'}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {busy ? 'Deleting…' : 'Permanently delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirming(false); setConfirmation(''); setError(''); }}
                    disabled={busy}
                    className="glass-button rounded-xl px-4 py-2.5 text-sm font-semibold text-glass-secondary disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

import React, { useState, useEffect } from 'react';
import { getAiSettings, saveAiSettings, checkBackendProxy } from '../utils/aiClient';
import { checkSupabaseConnection } from '../lib/supabaseClient';
import { Settings, Cpu, Check, X, ShieldCheck, AlertCircle, Server, RefreshCw, Database } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose }) {
  const [model, setModel] = useState('gemini-flash-lite-latest');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // 'testing' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState('');
  const [proxyInfo, setProxyInfo] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState('checking'); // 'checking' | 'connected' | 'not_connected'
  const [supabaseMessage, setSupabaseMessage] = useState('');

  const probeSupabase = async () => {
    setSupabaseStatus('checking');
    setSupabaseMessage('Checking Supabase connection...');
    const result = await checkSupabaseConnection();
    if (result.connected) {
      setSupabaseStatus('connected');
      setSupabaseMessage('Connected to Supabase. Auth & Database ready.');
    } else {
      setSupabaseStatus('not_connected');
      setSupabaseMessage(result.error || 'Not connected to Supabase.');
    }
  };

  useEffect(() => {
    if (isOpen) {
      const current = getAiSettings();
      setModel(current.model || 'gemini-flash-lite-latest');
      setSavedSuccess(false);
      setTestStatus(null);
      setTestMessage('');

      // Check backend proxy status
      checkBackendProxy().then(info => {
        setProxyInfo(info);
      });

      // Check Supabase connection status
      probeSupabase();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveAiSettings({
      model: model.trim() || 'gemini-flash-lite-latest'
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleCheckHealth = async () => {
    setTestStatus('testing');
    setTestMessage('Checking Google Gemini connectivity via backend proxy...');

    try {
      const res = await fetch('/api/ai/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model.trim() })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.error) {
        setTestStatus('error');
        setTestMessage(data.error?.message || `Proxy check returned HTTP ${res.status}.`);
      } else {
        setTestStatus('success');
        setTestMessage('Google Gemini connection verified! Backend is authenticated and operational.');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('Could not reach the Metrica AI endpoint. Check the deployment and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-glass animate-in fade-in duration-150">
      <div className="glass-panel text-glass-primary border border-glass-border rounded-2xl w-full max-w-lg shadow-glass-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-glass-border glass-opaque">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-metrica-500/15 text-metrica-600 dark:text-metrica-400 border border-metrica-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-glass-primary text-base">Metrica AI Settings</h3>
              <p className="text-xs text-glass-muted">Google Gemini & Backend Proxy Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-glass-muted hover:text-glass-primary hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Security & Key Architecture Banner */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-glass-primary">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">Backend Key Security Architecture</p>
              <p className="text-[11px] text-glass-secondary mt-0.5 leading-relaxed">
                For maximum security, API keys are never entered, stored, or held in the browser.
                Your <code className="px-1 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded font-mono">GEMINI_API_KEY</code> stays on the server. Locally it is read from <code className="px-1 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded font-mono">server/.env</code>; on Vercel, add it as a server environment variable.
              </p>
            </div>
          </div>

          {/* Backend Proxy Status */}
          <div className="p-3.5 rounded-xl border border-glass-border glass-opaque text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-glass-primary flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-metrica-500" />
                Backend Proxy Status
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                proxyInfo?.status === 'ok'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
              }`}>
                {proxyInfo?.status === 'ok' ? 'Proxy Online' : 'Connecting...'}
              </span>
            </div>
            <p className="text-[11px] text-glass-muted">
              {proxyInfo?.configured
                ? 'Server environment key is detected and ready.'
                : 'Server is reachable, but GEMINI_API_KEY is not configured. Add it to the Vercel project environment variables, then redeploy.'}
            </p>
          </div>

          {/* Supabase Connection Status */}
          <div className="p-3.5 rounded-xl border border-glass-border glass-opaque text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-glass-primary flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                Supabase Connection Status
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                  : supabaseStatus === 'checking'
                  ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                  : 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
              }`}>
                {supabaseStatus === 'connected'
                  ? 'Connected'
                  : supabaseStatus === 'checking'
                  ? 'Checking...'
                  : 'Not Connected'}
              </span>
            </div>
            <p className="text-[11px] text-glass-muted">
              {supabaseMessage}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-glass-border">
              <span className="text-[10px] text-glass-muted font-mono">
                {supabaseStatus === 'connected' ? 'Auth probe: Active' : 'Credentials isolated in .env.local'}
              </span>
              <button
                type="button"
                onClick={probeSupabase}
                disabled={supabaseStatus === 'checking'}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-glass-secondary glass-button transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${supabaseStatus === 'checking' ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Gemini Model Selection */}
          <div className="space-y-1.5">
            <label htmlFor="gemini-model-select" className="flex items-center gap-1.5 text-xs font-semibold text-glass-primary">
              <Cpu className="w-3.5 h-3.5 text-glass-muted" />
              Gemini Model Name
            </label>
            <select
              id="gemini-model-select"
              aria-label="Gemini Model Name"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-glass-border glass-opaque text-glass-primary focus:outline-none focus:ring-2 focus:ring-metrica-500/40 font-mono"
            >
              <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Recommended - Ultra-fast & stable)</option>
              <option value="gemini-flash-latest">gemini-flash-latest (Latest Flash flagship)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Next-Gen Flash)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </select>
          </div>

          {/* Privacy & Compliance Section */}
          <div className="p-3.5 rounded-xl border border-glass-border glass-opaque flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-glass-primary">Data Privacy & Security</p>
                <p className="text-[11px] text-glass-muted">All analytics run in your browser. Read our legal disclosure.</p>
              </div>
            </div>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                onClose();
                window.history.pushState({}, '', '/privacy');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-3 py-1.5 rounded-lg border border-glass-border glass-button text-metrica-600 dark:text-metrica-400 font-semibold text-xs transition-colors"
            >
              View Notice
            </a>
          </div>

          {/* Test Status Feedback */}
          {testMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                testStatus === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : testStatus === 'error'
                  ? 'bg-red-500/15 border-red-500/30 text-red-700 dark:text-red-300'
                  : 'glass-opaque border-glass-border text-glass-primary'
              }`}
            >
              {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
              {testStatus === 'testing' && <RefreshCw className="animate-spin w-3.5 h-3.5 text-metrica-500 flex-shrink-0" />}
              <span className="flex-1 leading-snug">{testMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-glass-border glass-opaque">
          <button
            type="button"
            onClick={handleCheckHealth}
            disabled={testStatus === 'testing'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-glass-primary glass-button disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
            <span>{testStatus === 'testing' ? 'Checking...' : 'Check Connection'}</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-glass-muted hover:text-glass-primary transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-metrica-600 hover:bg-metrica-700 text-white shadow-sm transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      setTestMessage('Could not reach the Metrica backend proxy at /api. Please ensure the server is running on port 3001.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-metrica-500/10 text-metrica-600 dark:text-metrica-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Metrica AI Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Google Gemini & Backend Proxy Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Security & Key Architecture Banner */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend Key Security Architecture</p>
              <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                For maximum security, API keys are never entered, stored, or held in the browser.
                Your <code className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900 rounded font-mono">GEMINI_API_KEY</code> is loaded strictly by the server from <code className="px-1 py-0.5 bg-emerald-100 dark:bg-emerald-900 rounded font-mono">server/.env</code>.
              </p>
            </div>
          </div>

          {/* Backend Proxy Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-metrica-500" />
                Backend Proxy Status
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                proxyInfo?.status === 'ok'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {proxyInfo?.status === 'ok' ? 'Proxy Online' : 'Connecting...'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {proxyInfo?.configured
                ? 'Server environment key is detected and ready.'
                : 'Server key not detected. Ensure GEMINI_API_KEY is defined in server/.env.'}
            </p>
          </div>

          {/* Supabase Connection Status */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                Supabase Connection Status
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                supabaseStatus === 'connected'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : supabaseStatus === 'checking'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}>
                {supabaseStatus === 'connected'
                  ? 'Connected'
                  : supabaseStatus === 'checking'
                  ? 'Checking...'
                  : 'Not Connected'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {supabaseMessage}
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] text-slate-400 font-mono">
                {supabaseStatus === 'connected' ? 'Auth probe: Active' : 'Credentials isolated in .env.local'}
              </span>
              <button
                type="button"
                onClick={probeSupabase}
                disabled={supabaseStatus === 'checking'}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${supabaseStatus === 'checking' ? 'animate-spin' : ''}`} />
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {/* Gemini Model Selection */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              Gemini Model Name
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-metrica-500/40 font-mono"
            >
              <option value="gemini-flash-lite-latest">gemini-flash-lite-latest (Recommended - Ultra-fast & stable)</option>
              <option value="gemini-flash-latest">gemini-flash-latest (Latest Flash flagship)</option>
              <option value="gemini-3.8-flash">gemini-3.8-flash (Next-Gen Flash)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro</option>
            </select>
          </div>

          {/* Privacy & Compliance Section */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Data Privacy & Security</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">All analytics run in your browser. Read our legal disclosure.</p>
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
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-metrica-600 dark:text-metrica-400 font-semibold text-xs transition-colors"
            >
              View Notice
            </a>
          </div>

          {/* Test Status Feedback */}
          {testMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                testStatus === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : testStatus === 'error'
                  ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {testStatus === 'success' && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              {testStatus === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
              {testStatus === 'testing' && <RefreshCw className="animate-spin w-3.5 h-3.5 text-slate-500 flex-shrink-0" />}
              <span className="flex-1 leading-snug">{testMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleCheckHealth}
            disabled={testStatus === 'testing'}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
            <span>{testStatus === 'testing' ? 'Checking...' : 'Check Connection'}</span>
          </button>
          
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

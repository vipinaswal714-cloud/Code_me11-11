import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
  Gauge,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  WandSparkles
} from 'lucide-react';

function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-black tracking-tight text-glass-primary">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-metrica-600 to-cyan-500 text-sm text-white shadow-lg shadow-metrica-600/20">
        M
      </span>
      <span className="text-lg">Metrica</span>
    </span>
  );
}

const features = [
  {
    icon: BarChart3,
    title: 'Dashboards in moments',
    body: 'Turn spreadsheet columns into clear charts and useful summary numbers.'
  },
  {
    icon: Gauge,
    title: 'Understand data quality',
    body: 'Find missing values, duplicates, unusual values, and columns that need a closer look.'
  },
  {
    icon: Filter,
    title: 'Explore your way',
    body: 'Filter, compare, and build charts without writing formulas or code.'
  },
  {
    icon: Sparkles,
    title: 'Ask questions with AI',
    body: 'Ask Gemini about trends and comparisons. AI features need a working server key.'
  }
];

export default function HomePage({ onSignIn, onContinueAsGuest, onNavigatePrivacy, isDark, onToggleTheme }) {
  return (
    <div className="min-h-screen relative overflow-hidden text-glass-primary">
      <div className="glass-backdrop" aria-hidden="true">
        <div className="glass-backdrop-blob-1" />
        <div className="glass-backdrop-blob-2" />
        <div className="glass-backdrop-blob-3" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" onClick={(event) => { event.preventDefault(); window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate')); }} aria-label="Metrica home">
          <Brand />
        </a>
        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main navigation">
          <button type="button" onClick={onToggleTheme} className="glass-button rounded-xl p-2.5 text-glass-secondary" aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <button type="button" onClick={onSignIn} className="rounded-xl px-3 py-2 text-sm font-semibold text-glass-secondary transition hover:text-glass-primary sm:px-4">
            Sign in
          </button>
          <button type="button" onClick={onContinueAsGuest} className="rounded-xl bg-metrica-600 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-metrica-600/20 transition hover:bg-metrica-700 sm:px-4">
            Open Metrica
          </button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <section className="grid items-center gap-12 pb-16 pt-12 md:grid-cols-[1.05fr_.95fr] md:pb-24 md:pt-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-metrica-500/20 bg-metrica-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-metrica-700 dark:text-metrica-300">
              <WandSparkles className="h-3.5 w-3.5" /> Spreadsheet analytics, made simple
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-glass-primary sm:text-6xl">
              Make your data easier to <span className="bg-gradient-to-r from-metrica-600 via-cyan-500 to-teal-400 bg-clip-text text-transparent">understand.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-glass-secondary sm:text-lg">
              Metrica turns CSV and Excel files into interactive dashboards, charts, and data quality reports. Explore the results yourself or ask AI about what you find.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={onContinueAsGuest} className="inline-flex items-center justify-center gap-2 rounded-xl bg-metrica-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-metrica-600/20 transition hover:-translate-y-0.5 hover:bg-metrica-700">
                Continue as Guest <ArrowRight className="h-4 w-4" />
              </button>
              <button type="button" onClick={onSignIn} className="glass-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-glass-primary transition hover:-translate-y-0.5">
                Sign in or create account
              </button>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-glass-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              Files are analyzed in your browser. Ask AI sends a limited data sample to Gemini after you accept the in-app notice.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-metrica-500/20 via-cyan-400/10 to-violet-500/20 blur-2xl" aria-hidden="true" />
            <div className="glass-panel relative overflow-hidden rounded-[1.75rem] p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between border-b border-glass-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-metrica-500/15 p-2.5 text-metrica-600 dark:text-metrica-300"><FileSpreadsheet className="h-5 w-5" /></div>
                  <div><p className="text-sm font-bold">Sales overview</p><p className="text-xs text-glass-muted">Your data, made visual</p></div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300">LIVE PREVIEW</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5 py-4 sm:gap-3">
                {[
                  ['Total sales', '$84.2k', '+12.8%'],
                  ['Orders', '1,284', '+8.4%'],
                  ['Avg. order', '$65.57', '+3.2%']
                ].map(([label, value, change]) => (
                  <div key={label} className="glass-card rounded-2xl p-3 sm:p-4">
                    <p className="text-[10px] text-glass-muted sm:text-xs">{label}</p>
                    <p className="mt-1 text-base font-black sm:text-xl">{value}</p>
                    <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{change}</p>
                  </div>
                ))}
              </div>
              <div className="glass-card rounded-2xl p-4">
                <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold">Sales by month</p><p className="text-[10px] text-glass-muted">Spot patterns at a glance</p></div><BarChart3 className="h-4 w-4 text-metrica-500" /></div>
                <div className="flex h-32 items-end gap-2 border-b border-l border-glass-border px-2 sm:h-40 sm:gap-3">
                  {[42, 60, 48, 76, 57, 91, 68, 100, 79, 88, 70, 96].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-metrica-600 to-cyan-400 opacity-80" style={{ height: `${height}%` }} />
                  ))}
                </div>
                <div className="mt-3 flex justify-between text-[9px] text-glass-muted"><span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Dec</span></div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/40 p-3 text-xs text-glass-secondary dark:bg-white/5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> Upload a spreadsheet to create a dashboard like this.
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 sm:py-12" aria-labelledby="features-title">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-metrica-600 dark:text-metrica-300">A clearer view of your spreadsheets</p>
            <h2 id="features-title" className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">From file to insight, step by step</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <article key={title} className="glass-card rounded-2xl p-5 sm:p-6">
                <div className="mb-4 inline-flex rounded-xl bg-metrica-500/10 p-2.5 text-metrica-600 dark:text-metrica-300"><Icon className="h-5 w-5" /></div>
                <h3 className="text-sm font-bold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-glass-secondary">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl border border-glass-border bg-gradient-to-r from-metrica-500/10 via-cyan-500/5 to-transparent p-6 sm:flex-row sm:items-center sm:p-9">
          <div>
            <h2 className="text-xl font-black sm:text-2xl">Ready to explore your data?</h2>
            <p className="mt-2 max-w-xl text-sm text-glass-secondary">Start with a sample or bring your own CSV or Excel spreadsheet.</p>
          </div>
          <button type="button" onClick={onContinueAsGuest} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-metrica-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-metrica-700">
            Open the analytics studio <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </main>

      <footer className="relative z-10 mx-auto flex max-w-7xl flex-col gap-3 px-5 pb-8 text-xs text-glass-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Brand />
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" /> Browser-based analytics</span>
          <button type="button" onClick={onNavigatePrivacy} className="underline underline-offset-4 hover:text-glass-primary">Privacy notice</button>
        </div>
      </footer>
    </div>
  );
}

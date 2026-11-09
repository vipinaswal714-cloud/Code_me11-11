import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Filter,
  Gauge,
  GitBranch,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  WandSparkles,
  UploadCloud,
  Layers
} from 'lucide-react';

function Brand({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 font-black tracking-tight text-glass-primary text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-metrica-500 rounded-xl"
      aria-label="Metrica Home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-metrica-600 to-cyan-500 text-sm font-black text-white shadow-lg shadow-metrica-600/20">
        M
      </span>
      <span className="text-lg tracking-tight font-extrabold">Metrica</span>
    </button>
  );
}

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Dashboards in Moments',
    body: 'Turn spreadsheet columns into responsive bar, line, and donut charts with instant KPI summary cards.'
  },
  {
    icon: Gauge,
    title: 'Data Quality Audits',
    body: 'Automatically scan your file for missing values, duplicate rows, anomalous outliers, and column type issues.'
  },
  {
    icon: Layers,
    title: 'In-Browser Data Cleaning',
    body: 'Trim whitespace, impute null values, deduplicate records, and standardize casing with full revert capability.'
  },
  {
    icon: GitBranch,
    title: 'IF/ELSE Condition Rules',
    body: 'Create visual condition logic to highlight specific rows or create new calculated columns without code.'
  },
  {
    icon: Database,
    title: 'Smart Schema Detection',
    body: 'Intelligently classifies columns as dimensions, measures, dates, or ID keys with relationship suggestions.'
  },
  {
    icon: Sparkles,
    title: 'Ask Questions with AI',
    body: 'Chat with Google Gemini to discover business trends and generate charts. Uses privacy-capped dataset summaries.'
  }
];

const STEPS = [
  {
    step: '01',
    title: 'Upload your spreadsheet',
    description: 'Drag and drop any .csv, .xlsx, or .xls file. Files are parsed 100% client-side in your browser memory.'
  },
  {
    step: '02',
    title: 'Explore, clean & visualize',
    description: 'View auto-generated charts, run data health checks, filter columns, or clean messy rows in seconds.'
  },
  {
    step: '03',
    title: 'Ask Gemini questions (Optional)',
    description: 'Opt-in to Ask AI to summarize insights. Only a capped summary and at most 20 sample rows are ever shared.'
  }
];

export default function HomePage({
  onSignIn,
  onContinueAsGuest,
  onNavigatePrivacy,
  isDark,
  onToggleTheme
}) {
  return (
    <div className="min-h-screen relative overflow-hidden text-glass-primary flex flex-col selection:bg-metrica-500 selection:text-white">
      {/* Ambient Glass Backdrop */}
      <div className="glass-backdrop" aria-hidden="true">
        <div className="glass-backdrop-blob-1" />
        <div className="glass-backdrop-blob-2" />
        <div className="glass-backdrop-blob-3" />
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <Brand onClick={onContinueAsGuest} />

        <nav className="flex items-center gap-2 sm:gap-3" aria-label="Main navigation">
          <button
            type="button"
            onClick={onToggleTheme}
            className="glass-button rounded-xl p-2.5 text-glass-secondary hover:text-glass-primary transition-colors"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
          </button>

          <button
            type="button"
            onClick={onNavigatePrivacy}
            className="hidden sm:inline-flex rounded-xl px-3 py-2 text-xs font-semibold text-glass-secondary hover:text-glass-primary transition-colors"
          >
            Privacy Notice
          </button>

          <button
            type="button"
            onClick={onSignIn}
            className="rounded-xl px-3.5 py-2 text-xs font-bold text-glass-secondary hover:text-glass-primary glass-button transition-colors"
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={onContinueAsGuest}
            className="inline-flex items-center gap-1.5 rounded-xl bg-metrica-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-metrica-600/20 transition-all hover:bg-metrica-700 hover:shadow-metrica-600/30"
          >
            <span>Continue as Guest</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 mx-auto w-full max-w-7xl px-5 pb-16 sm:px-8">
        {/* Hero Section */}
        <section className="grid items-center gap-12 pb-16 pt-8 md:grid-cols-[1.05fr_.95fr] md:pb-24 md:pt-14">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-metrica-500/20 bg-metrica-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-metrica-700 dark:text-metrica-300">
              <WandSparkles className="h-3.5 w-3.5 text-metrica-500" />
              <span>Spreadsheet Analytics, Made Simple</span>
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-[1.08] tracking-tight text-glass-primary sm:text-6xl">
              Make your spreadsheets easier to{' '}
              <span className="bg-gradient-to-r from-metrica-600 via-cyan-500 to-teal-400 bg-clip-text text-transparent">
                understand.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-glass-secondary sm:text-lg font-normal">
              Metrica turns raw CSV and Excel files into interactive dashboards, KPI cards, data quality audits, and custom IF/ELSE rules in seconds. Explore on your own or ask Gemini questions about your data.
            </p>

            {/* Hero CTA Buttons */}
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-metrica-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-metrica-600/20 transition-all hover:-translate-y-0.5 hover:bg-metrica-700 hover:shadow-metrica-600/30"
              >
                <span>Continue as Guest</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onSignIn}
                className="glass-button inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-glass-primary transition-all hover:-translate-y-0.5 hover:border-metrica-500/30"
              >
                <KeyRound className="h-4 w-4 text-metrica-500" />
                <span>Sign in / Create account</span>
              </button>
            </div>

            {/* Privacy Explanation Banner */}
            <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-glass-border bg-white/40 dark:bg-white/5 p-3.5 text-xs leading-5 text-glass-secondary backdrop-blur-sm max-w-xl">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <strong className="font-semibold text-glass-primary">Privacy-first by design:</strong> Files are analyzed locally in your browser memory. We never store your datasets in external databases. Using Ask AI sends only an aggregated summary and at most 20 sample rows to Google Gemini after you accept the in-app notice.
              </div>
            </div>
          </div>

          {/* Interactive Live Glass Preview Mockup */}
          <div className="relative mx-auto w-full max-w-xl">
            <div
              className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-metrica-500/20 via-cyan-400/10 to-violet-500/20 blur-2xl opacity-70"
              aria-hidden="true"
            />
            <div className="glass-panel relative overflow-hidden rounded-[2rem] p-5 shadow-2xl sm:p-6 border border-glass-border">
              <div className="flex items-center justify-between border-b border-glass-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-metrica-500/15 p-2.5 text-metrica-600 dark:text-metrica-300">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-glass-primary">Global_Sales_Q1_Q4.xlsx</p>
                    <p className="text-xs text-glass-muted">1,284 rows &bull; 6 columns analyzed</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  STUDIO PREVIEW
                </span>
              </div>

              {/* KPI Cards Preview */}
              <div className="grid grid-cols-3 gap-2.5 py-4 sm:gap-3">
                {[
                  ['Total Revenue', '$84,250', '+12.8%'],
                  ['Total Orders', '1,284', '+8.4%'],
                  ['Avg Order Value', '$65.61', '+3.2%']
                ].map(([label, value, change]) => (
                  <div key={label} className="glass-card rounded-2xl p-3 sm:p-4">
                    <p className="text-[10px] text-glass-muted sm:text-xs font-medium">{label}</p>
                    <p className="mt-1 text-base font-black sm:text-xl text-glass-primary">{value}</p>
                    <p className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{change}</p>
                  </div>
                ))}
              </div>

              {/* Chart Preview */}
              <div className="glass-card rounded-2xl p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-glass-primary">Revenue by Month (Trend)</p>
                    <p className="text-[10px] text-glass-muted">Continuous aggregation across months</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-metrica-500" />
                </div>
                <div className="flex h-32 items-end gap-2 border-b border-l border-glass-border px-2 sm:h-36 sm:gap-3">
                  {[42, 60, 48, 76, 57, 91, 68, 100, 79, 88, 70, 96].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-metrica-600 to-cyan-400 opacity-85 transition-all hover:opacity-100"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
                <div className="mt-2.5 flex justify-between text-[9px] text-glass-muted font-medium">
                  <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Dec</span>
                </div>
              </div>

              <div className="mt-3.5 flex items-center gap-2 rounded-xl bg-white/40 p-3 text-xs text-glass-secondary dark:bg-white/5 border border-glass-border">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>Drag & drop your file into the studio to generate this instantly.</span>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-12 border-t border-glass-border" aria-labelledby="how-it-works-title">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-metrica-600 dark:text-metrica-300">
              Three Simple Steps
            </p>
            <h2 id="how-it-works-title" className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">
              How Metrica Works
            </h2>
            <p className="mt-2 text-sm text-glass-secondary">
              No complex database connections or cloud setups required.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.step} className="glass-card rounded-2xl p-6 relative flex flex-col justify-between">
                <div>
                  <span className="text-3xl font-black text-metrica-600/30 dark:text-metrica-400/20">
                    {step.step}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-glass-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-glass-secondary font-normal">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comprehensive Features Grid */}
        <section className="py-12 border-t border-glass-border" aria-labelledby="features-title">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-metrica-600 dark:text-metrica-300">
              Complete Spreadsheet Studio
            </p>
            <h2 id="features-title" className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">
              Everything You Need for Spreadsheet Analytics
            </h2>
            <p className="mt-2 text-sm text-glass-secondary">
              Built with privacy and ease of use at the core.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="glass-card rounded-2xl p-5 sm:p-6 transition-all hover:border-metrica-500/30">
                <div className="mb-4 inline-flex rounded-xl bg-metrica-500/10 p-3 text-metrica-600 dark:text-metrica-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-glass-primary">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-glass-secondary">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="mt-12 flex flex-col items-start justify-between gap-6 rounded-3xl border border-glass-border bg-gradient-to-r from-metrica-500/15 via-cyan-500/10 to-transparent p-6 sm:flex-row sm:items-center sm:p-10 shadow-lg">
          <div>
            <h2 className="text-xl font-black sm:text-2xl text-glass-primary">Ready to analyze your spreadsheet?</h2>
            <p className="mt-2 max-w-xl text-sm text-glass-secondary">
              Upload your own CSV or Excel file, or explore right away with our built-in demo datasets. No sign-up needed.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-metrica-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-metrica-600/20 transition-all hover:bg-metrica-700"
            >
              <span>Continue as Guest</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="glass-button inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold text-glass-primary"
            >
              <span>Sign in / Create account</span>
            </button>
          </div>
        </section>
      </main>

      {/* Accessible Footer */}
      <footer className="relative z-10 border-t border-glass-border mx-auto w-full max-w-7xl px-5 py-8 text-xs text-glass-muted sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Brand onClick={onContinueAsGuest} />

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-500" />
              <span>Browser-based analytics</span>
            </span>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="hover:text-glass-primary transition-colors"
            >
              Analytics Studio
            </button>
            <button
              type="button"
              onClick={onSignIn}
              className="hover:text-glass-primary transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={onNavigatePrivacy}
              className="underline underline-offset-4 hover:text-glass-primary transition-colors"
            >
              Privacy Notice
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

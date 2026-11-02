# Metrica — Spreadsheet Analytics Studio

Metrica is a lightweight, high-performance browser spreadsheet analytics studio (React + Vite + Tailwind) designed for fast data exploration, automated schema detection, statistical data quality auditing, period-over-period business intelligence, and AI-assisted analysis powered by **Google Gemini**.

---

## Architecture & Security Model

- **Frontend (Browser):**
  - Runs 100% locally in the browser with SheetJS for XLSX/CSV parsing and Recharts for interactive dashboards.
  - Formulates queries with metadata and a privacy-preserving sample of up to 20 rows.
  - **Never holds, stores, or handles API keys.**
  - All AI requests route through the backend proxy (`/api/ai/chat`), with `/api` forwarded to the backend in development.

- **Backend Proxy (`server/proxy.js`):**
  - Zero-dependency Node.js HTTP server.
  - Loads credentials strictly from `server/.env`.
  - Refuses to start if `GEMINI_API_KEY` is missing.
  - Communicates directly with Google Gemini via the official `@google/genai` SDK (`server/geminiProvider.js`).
  - Never logs, prints, or exposes the API key.
  - Features per-IP rate limiting (20 req/min), daily request caps (500 req/day), 100 KB payload ceiling, CORS origin allowlisting, and model name restrictions (`gemini-2.5-flash`).

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+ or v20+)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### 2. Configure Backend Credentials
Create a `.env` file inside the `server/` folder based on `server/.env.example`:

```bash
# In server/.env
PORT=3001
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-flash-lite-latest
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001
```

### 3. Configure Frontend Supabase Connection (Optional)
To enable Supabase database persistence and authentication in the frontend, create `.env.local` in the project root:

```bash
# In .env.local (never commit this file)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key_here
```

> **SECURITY NOTE:** Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` may be defined in the frontend. Never put `SUPABASE_SECRET_KEY` or service role keys in any frontend file.

### 4. Install Dependencies & Run
```bash
# Install dependencies
npm install

# Start backend proxy server (Port 3001)
npm run proxy

# In a separate terminal, start frontend dev server (Port 5173)
npm run dev
```

Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/) in your browser.

---

## Testing & Quality Assurance

- **Unit Tests:** `npm test` (tests schema detection, quality audit, business insights, rule evaluator, and Gemini provider)
- **E2E Integration Tests:** `npm run test:e2e` (runs real browser flows in headless Edge)
- **Property-Based Simulation:** `npm run test:sim` (1,000 randomized datasets with formal mathematical invariants)
- **Browser Simulation:** `npm run test:browser-sim` (1,000 randomized user UI interactions)
- **Linter:** `npm run lint` (`oxlint`)
- **Production Build:** `npm run build`

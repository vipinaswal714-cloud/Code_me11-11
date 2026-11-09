import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:3001 http://localhost:3001 https://sqyzsxzplfdmovqkecco.supabase.co wss://sqyzsxzplfdmovqkecco.supabase.co; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
};

// Security headers plugin for Vite dev & preview servers
function securityHeadersPlugin() {
  return {
    name: 'vite-plugin-security-headers',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        Object.entries(SECURITY_HEADERS).forEach(([k, v]) => {
          res.setHeader(k, v);
        });
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        Object.entries(SECURITY_HEADERS).forEach(([k, v]) => {
          res.setHeader(k, v);
        });
        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), securityHeadersPlugin()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  },
  oxc: {
    drop: mode === 'production' ? ['console', 'debugger'] : []
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 3000
  }
}));

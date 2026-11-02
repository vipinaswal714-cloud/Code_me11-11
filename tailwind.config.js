/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        metrica: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f6',
          500: '#0e8ce8',
          600: '#026fc7',
          700: '#0358a1',
          800: '#074a85',
          900: '#0c3f6e',
          950: '#082747',
        }
      },
      spacing: {
        68: '17rem', // 272px - safe clearance for 240px sidebar + margin gap
      },
      borderRadius: {
        'glass': 'var(--glass-radius, 20px)',
        'glass-sm': '14px',
        'glass-lg': '24px'
      },
      boxShadow: {
        'glass': 'var(--glass-shadow)',
        'glass-lg': 'var(--glass-shadow-lg)',
        'glass-accent': '0 12px 36px -4px rgba(2, 111, 199, 0.35)'
      },
      backdropBlur: {
        'glass': 'var(--glass-blur, 16px)',
        'glass-sm': '8px',
        'glass-lg': 'var(--glass-blur, 18px)'
      }
    },
  },
  plugins: [],
}

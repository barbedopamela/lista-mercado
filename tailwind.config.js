/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // azul profundo (cor principal)
        brand: {
          50: '#EEF6FA',
          100: '#D6E9F2',
          200: '#AED3E4',
          500: '#1B7396',
          600: '#0B4F6C',
          700: '#093F56',
          900: '#052A3B',
        },
        // azul-esverdeado (destaque)
        teal: {
          50: '#F2FAFB',
          100: '#DDF2F3',
          200: '#B6E3E5',
          400: '#3DBFC3',
          500: '#14A3A8',
          600: '#0F8286',
        },
        ink: '#10303F',
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        soft: '0 4px 20px -6px rgba(11, 79, 108, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

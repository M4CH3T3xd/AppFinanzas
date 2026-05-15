/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas:  'var(--canvas)',
        panel:   'var(--panel)',
        well:    'var(--well)',
        line:    'var(--line)',
        ink:     'var(--ink)',
        dim:     'var(--dim)',
        brand: {
          50:  'var(--brand-50)',
          500: 'var(--brand-500)',
          600: 'var(--brand-600)',
        }
      }
    }
  },
  plugins: []
}

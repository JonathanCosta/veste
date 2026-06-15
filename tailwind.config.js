/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'app-bg': '#F7F7F6',
        accent: '#2D2D2D',
        'text-main': '#1F2937',
        'text-muted': '#6B7280',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.04)',
        'soft-lg': '0 10px 40px rgba(0,0,0,0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

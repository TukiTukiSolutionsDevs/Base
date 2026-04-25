/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f8f8fb',
          100: '#eef0f5',
          200: '#dde0ea',
          300: '#b8bcce',
          400: '#8a90a8',
          500: '#5e6480',
          600: '#444a64',
          700: '#2e3349',
          800: '#1c1f2e',
          900: '#0f111c',
        },
        // Paleta violeta/índigo del diseño objetivo
        accent: {
          50:  '#eef0ff',
          100: '#dee1ff',
          200: '#c0c5ff',
          300: '#9aa1ff',
          400: '#7b80ff',
          500: '#5d61ff',
          600: '#4a4ef5',
          700: '#3d3fd6',
          800: '#3334a8',
          900: '#2c2d83',
        },
        risk: {
          bajo:    '#10b981', // emerald-500
          moderado:'#f59e0b', // amber-500
          alto:    '#f97316', // orange-500
          muyalto: '#ef4444', // rose/red-500
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

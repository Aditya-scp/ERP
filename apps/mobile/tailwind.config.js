/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#4f46e5',
        success: '#047857',
        warning: '#b45309',
        info: '#0369a1',
        destructive: '#e11d48',
      },
    },
  },
  plugins: [],
};

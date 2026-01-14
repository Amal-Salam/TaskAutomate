/* eslint-disable prettier/prettier */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // manual toggle
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        indigo: { DEFAULT: '#2C3C99' },
        iris: { DEFAULT: '#766ED5' },
        azure: { DEFAULT: '#0071DB' },
        offwhite: '#F9FAFB',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      backdropBlur: { glass: '12px' },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

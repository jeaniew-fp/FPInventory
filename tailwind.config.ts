import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#2D6A4F',
          orange: '#F97316',
          purple: {
            dark: '#3a1f4a',
            DEFAULT: '#8b4a72',
            light: '#f3e6f5',
            muted: '#8a7f92',
          },
        },
      },
      fontFamily: {
        sans: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

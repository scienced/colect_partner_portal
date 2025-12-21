import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ef556d',
          50: '#fef2f3',
          100: '#fee2e5',
          200: '#fecacf',
          300: '#fca5ae',
          400: '#f97080',
          500: '#ef556d',
          600: '#dc2c4a',
          700: '#b9203c',
          800: '#9a1e38',
          900: '#821e35',
        },
      },
    },
  },
  plugins: [],
}

export default config

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
        // Primary color uses CSS variable for runtime customization
        // Set via NEXT_PUBLIC_PRIMARY_COLOR env var or in src/config/site.ts
        primary: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

export default config

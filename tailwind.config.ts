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
        brand: {
          blue: '#1E90FF',
          gold: '#FFD700',
          dark: '#0A0E1A',
          panel: '#111827',
          border: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "radial-gradient(circle, #1E90FF22 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
    },
  },
  plugins: [],
}

export default config

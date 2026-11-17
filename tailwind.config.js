/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kms: {
          dark: '#064e3b',       // Deep Emerald Green (Finora)
          primary: '#059669',    // Vibrant Emerald Active
          hover: '#047857',      // Darker hover
          light: '#ecfdf5',      // Mint soft background
          accent: '#10b981',     // Accent green
          surface: '#f8fafc',    // App background
          border: '#e2e8f0',     // Subtle border
          card: '#ffffff',       // Pure white card
        }
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        'squircle': '20px',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

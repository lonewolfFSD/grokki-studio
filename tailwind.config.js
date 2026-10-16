/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./dashboard.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      colors: {
        obsidian: '#0c0d12',
        cardDark: '#13141a',
        sidebarDark: '#08090d',
        borderDark: '#1e2029',
      },
    },
  },
  plugins: [],
};

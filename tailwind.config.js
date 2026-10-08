/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F3F5F8',
        paper: '#F3F5F8',
        ink: '#172033',
        muted: '#5B6577',
        rule: '#DCE1E8',
      },
      fontFamily: {
        sans: ['Assistant', 'Arial Hebrew', 'Arial', 'sans-serif'],
        display: ['"Frank Ruhl Libre"', '"David Libre"', 'Georgia', 'serif'],
        math: ['"STIX Two Text"', '"Cambria Math"', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};

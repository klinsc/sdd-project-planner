/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef5ff",
          100: "#d6e4ff",
          200: "#adc8ff",
          300: "#84a9ff",
          400: "#6690ff",
          500: "#3366ff",
          600: "#254eda",
          700: "#1939b7",
          800: "#102693",
          900: "#091a7a",
        },
      },
      boxShadow: {
        card: "0 10px 15px -3px rgba(0,0,0,0.1)",
      },
    },
  },
  plugins: [],
};

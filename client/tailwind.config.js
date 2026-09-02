/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          dark: "rgba(10, 15, 29, 0.72)",
          cyan: "#00f0ff",
          red: "#ff2a4d",
          border: "rgba(255, 255, 255, 0.12)",
        }
      }
    },
  },
  plugins: [],
}
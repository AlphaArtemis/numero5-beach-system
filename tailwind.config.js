/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        beach: {
          ink: "#1f2933",
          reef: "#9a6a2e",
          water: "#f1e6d6",
          sun: "#ff8c00",
          coral: "#e66b3d",
          foam: "#fff8ed",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(69, 49, 25, 0.12)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

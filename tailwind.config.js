/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        beach: {
          ink: "#0a192f",
          reef: "#0f766e",
          water: "#e5f7f5",
          sun: "#ff8c00",
          coral: "#ef6f61",
          foam: "#f8fbfa",
        },
      },
      boxShadow: {
        soft: "0 16px 40px rgba(23, 51, 52, 0.10)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

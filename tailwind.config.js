/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "primary": "#195eb3",
        "background-light": "#f6f7f8",
        "background-dark": "#111821",
      },
      fontFamily: {
        "display": ["Inter"] // Note: In React Native, proper font loading is required.
      },
    },
  },
  plugins: [],
}

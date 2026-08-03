/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],

  presets: [require("nativewind/preset")],

  theme: {
    extend: {
      colors: {
        "brand-cream": "#F4E7D3",
        "brand-black": "#111111",
        "brand-white": "#FFFFFF",
      },

      fontFamily: {
        atkinson: ["AtkinsonHyperlegible-Regular"],
        "atkinson-bold": ["AtkinsonHyperlegible-Bold"],
      },
    },
  },

  plugins: [],
};

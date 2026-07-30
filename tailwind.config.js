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
        "brand-orange": "#EC6426",
        "brand-yellow": "#F8A91F",
        "brand-cream": "#FDE3CF",
        "brand-brown": "#632713",
        "brand-black": "#000000",
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

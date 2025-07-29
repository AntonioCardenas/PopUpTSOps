import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 20s linear infinite",
        "spin-medium": "spin 2s linear infinite",
      },
      colors: {
        blue: {
          50: "#e6f2fb",
          100: "#cce6f7",
          200: "#99ccee",
          300: "#66b3e6",
          400: "#3399dd",
          500: "#0078d6",
          600: "#0062b4",
          700: "#004c91",
          800: "#00366e",
          900: "#00204b",
        },
        border: "#E5E7EB", // Added custom border color
        background: "#FFFFFF", // Added custom background color
        foreground: "#000000", // Added custom foreground color
      },
      backgroundImage: {
        "dot-black": "radial-gradient(circle, black 1px, transparent 1px)",
      },
      backgroundSize: {
        "dot-size": "20px 20px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: "#fdfbf7",
          card: "#ffffff",
          muted: "#e5e0d8",
          dark: "#f2ece1",
        },
        pencil: {
          DEFAULT: "#2d2d2d",
          light: "#5c5c5c",
          muted: "#8c8c8c",
        },
        marker: {
          red: "#ff4d4d",
          hover: "#e63939",
        },
        pen: {
          blue: "#2d5da1",
          hover: "#22477d",
        },
        sticky: {
          yellow: "#fff9c4",
          border: "#fde047",
        },
        stamp: {
          green: "#15803d",
          light: "#dcfce7",
        },
        background: "#fdfbf7",
        foreground: "#2d2d2d",
        card: {
          DEFAULT: "#ffffff",
          hover: "#faf7f2",
          border: "#2d2d2d",
        },
        primary: {
          DEFAULT: "#ff4d4d",
          hover: "#e63939",
          accent: "#2d5da1",
        },
        success: {
          DEFAULT: "#15803d",
          light: "#dcfce7",
        },
        error: {
          DEFAULT: "#ff4d4d",
          light: "#fee2e2",
        },
      },
      fontFamily: {
        hand: ["var(--font-kalam)", "var(--font-itim)", "cursive"],
        body: ["var(--font-patrick)", "var(--font-itim)", "cursive", "sans-serif"],
        sans: ["var(--font-patrick)", "var(--font-itim)", "Inter", "sans-serif"],
        heading: ["var(--font-kalam)", "var(--font-itim)", "cursive"],
      },
      borderRadius: {
        wobbly: "255px 15px 225px 15px / 15px 225px 15px 255px",
        "wobbly-md": "225px 25px 255px 25px / 25px 255px 25px 225px",
        "wobbly-lg": "255px 25px 225px 25px / 25px 225px 25px 255px",
        "wobbly-sm": "15px 255px 15px 225px / 225px 15px 255px 15px",
        "wobbly-tag": "120px 20px 100px 20px / 20px 100px 20px 120px",
      },
      boxShadow: {
        "hard-sm": "2px 2px 0px 0px #2d2d2d",
        hard: "4px 4px 0px 0px #2d2d2d",
        "hard-md": "5px 5px 0px 0px #2d2d2d",
        "hard-lg": "6px 6px 0px 0px #2d2d2d",
        "hard-xl": "8px 8px 0px 0px #2d2d2d",
        "hard-red": "4px 4px 0px 0px #ff4d4d",
        "hard-blue": "4px 4px 0px 0px #2d5da1",
        "hard-yellow": "4px 4px 0px 0px #ca8a04",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F1117",
        card: {
          DEFAULT: "#181B23",
          hover: "#1F232D",
          border: "#262B36",
        },
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          accent: "#818CF8",
          glow: "rgba(99, 102, 241, 0.25)",
        },
        success: {
          DEFAULT: "#10B981",
          glow: "rgba(16, 185, 129, 0.25)",
        },
        error: {
          DEFAULT: "#EF4444",
          glow: "rgba(239, 68, 68, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(99, 102, 241, 0.3)",
        "glow-sm": "0 0 10px -2px rgba(99, 102, 241, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;

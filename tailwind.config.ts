import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080A14",
        canvas: {
          deep: "#080A14",
          elevated: "#0D1020",
          surface: "#11152A",
        },
        card: {
          DEFAULT: "#11152A",
          hover: "#161D3B",
          border: "rgba(255, 255, 255, 0.10)",
        },
        primary: {
          DEFAULT: "#7C5CFF",
          hover: "#6D4DF0",
          accent: "#A78BFA",
          glow: "rgba(124, 92, 255, 0.35)",
        },
        electric: {
          DEFAULT: "#4F7CFF",
          hover: "#3B6BFF",
          light: "#6D8DFF",
          glow: "rgba(79, 124, 255, 0.35)",
        },
        lavender: {
          DEFAULT: "#A78BFA",
          light: "#C4B5FD",
          pale: "#EDE9FE",
          glow: "rgba(167, 139, 250, 0.35)",
        },
        gold: {
          DEFAULT: "#F6D58A",
          light: "#FDE68A",
          amber: "#F59E0B",
          glow: "rgba(246, 213, 138, 0.35)",
        },
        violet: {
          DEFAULT: "#7C5CFF",
          hover: "#6D4DF0",
          light: "#8B7CFF",
          glow: "rgba(124, 92, 255, 0.35)",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          light: "#38BDF8",
          glow: "rgba(6, 182, 212, 0.35)",
        },
        success: {
          DEFAULT: "#10B981",
          glow: "rgba(16, 185, 129, 0.25)",
        },
        error: {
          DEFAULT: "#F43F5E",
          glow: "rgba(244, 63, 94, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 30px -4px rgba(124, 92, 255, 0.45)",
        "glow-sm": "0 0 15px -2px rgba(124, 92, 255, 0.3)",
        "glow-violet": "0 0 30px -4px rgba(124, 92, 255, 0.45)",
        "glow-blue": "0 0 30px -4px rgba(79, 124, 255, 0.45)",
        "glow-gold": "0 0 30px -4px rgba(246, 213, 138, 0.4)",
        "glow-lavender": "0 0 25px -4px rgba(167, 139, 250, 0.4)",
        "glow-cyan": "0 0 25px -4px rgba(6, 182, 212, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

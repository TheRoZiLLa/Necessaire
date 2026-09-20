import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#090C22",
        card: {
          DEFAULT: "#121738",
          hover: "#181E48",
          border: "rgba(255, 255, 255, 0.12)",
        },
        primary: {
          DEFAULT: "#FF3366",
          hover: "#E11D48",
          accent: "#FDA4AF",
          glow: "rgba(255, 51, 102, 0.35)",
        },
        gold: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24",
          bright: "#FEF08A",
          glow: "rgba(245, 158, 11, 0.35)",
        },
        violet: {
          DEFAULT: "#7C3AED",
          hover: "#6D28D9",
          light: "#A78BFA",
          glow: "rgba(124, 58, 237, 0.35)",
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
          DEFAULT: "#EF4444",
          glow: "rgba(239, 68, 68, 0.25)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 25px -4px rgba(255, 51, 102, 0.4)",
        "glow-sm": "0 0 12px -2px rgba(255, 51, 102, 0.3)",
        "glow-gold": "0 0 25px -4px rgba(245, 158, 11, 0.45)",
        "glow-violet": "0 0 25px -4px rgba(124, 58, 237, 0.45)",
        "glow-cyan": "0 0 25px -4px rgba(6, 182, 212, 0.4)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};

export default config;

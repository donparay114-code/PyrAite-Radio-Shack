import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        surface: {
          DEFAULT: "#12121a",
          elevated: "#1a1a24",
          hover: "#22222e",
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.06)",
          hover: "rgba(255,255,255,0.12)",
        },
        text: {
          DEFAULT: "#e4e4e7",
          muted: "#71717a",
          subtle: "#52525b",
        },
        accent: {
          violet: "#8b5cf6",
          cyan: "#06b6d4",
          pink: "#ec4899",
          orange: "#f97316",
          green: "#22c55e",
          red: "#ef4444",
        },
        glow: {
          violet: "rgba(139,92,246,0.4)",
          cyan: "rgba(6,182,212,0.4)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "glow-violet": "radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)",
        "glow-cyan": "radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)",
        "gradient-glass": "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(0,0,0,0.37)",
        "glow-sm": "0 0 20px rgba(139,92,246,0.3)",
        "glow-md": "0 0 40px rgba(139,92,246,0.4)",
        "glow-lg": "0 0 60px rgba(139,92,246,0.5)",
        "glow-cyan-sm": "0 0 20px rgba(6,182,212,0.3)",
        "glow-cyan-md": "0 0 40px rgba(6,182,212,0.4)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        "bounce-soft": "bounce-soft 2s ease-in-out infinite",
        "wave": "wave 1.5s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "bounce-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        wave: {
          "0%, 100%": { transform: "scaleY(1)" },
          "50%": { transform: "scaleY(1.5)" },
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

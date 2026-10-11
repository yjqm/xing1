/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // Dark terminal palette
        base: {
          DEFAULT: "#0a0e14",
          elevated: "#11151c",
          soft: "#161b22",
          hover: "#1b2129",
        },
        line: {
          DEFAULT: "#2a2f37",
          soft: "#1e232b",
        },
        ink: {
          DEFAULT: "#d7dae0",
          muted: "#8b94a3",
          faint: "#5c6470",
        },
        amber: {
          DEFAULT: "#ffb454",
          dim: "#c98a3a",
          glow: "rgba(255, 180, 84, 0.35)",
        },
        ok: "#7fd962",
        err: "#ff6b6b",
        info: "#5fb3ff",
        violet: "#c792ea",
      },
      fontFamily: {
        display: ['"JetBrains Mono"', "monospace"],
        mono: ['"IBM Plex Mono"', "monospace"],
        code: ['"Fira Code"', "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(255, 180, 84, 0.25)",
        "glow-strong": "0 0 32px rgba(255, 180, 84, 0.45)",
        panel: "0 8px 32px rgba(0, 0, 0, 0.4)",
      },
      animation: {
        "pulse-dot": "pulse-dot 1.8s ease-in-out infinite",
        "blink-caret": "blink-caret 1.1s steps(2) infinite",
        "scan-line": "scan-line 6s linear infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(0.85)" },
        },
        "blink-caret": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "scan-line": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
    },
  },
  plugins: [],
};

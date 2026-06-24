/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.5rem",
        lg: "2.5rem",
      },
    },
    extend: {
      colors: {
        paper: "#F4EFE3",
        "paper-2": "#EDE6D4",
        ink: "#1C1A17",
        "ink-soft": "#3A352E",
        card: "#FBF8F0",
        "card-edge": "#E2D9C3",
        stamp: "#B23A2E",
        "stamp-deep": "#8E2A20",
        amber: "#C8893B",
        "amber-soft": "#E0B877",
        slate: "#5B6B6A",
        "slate-soft": "#8A9796",
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Spectral', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightish: "-0.02em",
        wider2: "0.08em",
        widest2: "0.2em",
      },
      boxShadow: {
        paper: "0 1px 0 rgba(28,26,23,0.04), 0 12px 30px -18px rgba(28,26,23,0.18)",
        "paper-lg": "0 1px 0 rgba(28,26,23,0.05), 0 30px 60px -30px rgba(28,26,23,0.28)",
        stamp: "0 2px 0 rgba(142,42,32,0.35), 0 6px 14px -6px rgba(178,58,46,0.5)",
      },
      backgroundImage: {
        'paper-grain':
          "radial-gradient(circle at 1px 1px, rgba(28,26,23,0.035) 1px, transparent 0)",
      },
      keyframes: {
        stampDown: {
          "0%": { transform: "scale(2.4) rotate(-18deg)", opacity: "0" },
          "55%": { transform: "scale(0.92) rotate(-10deg)", opacity: "1" },
          "70%": { transform: "scale(1.04) rotate(-12deg)" },
          "100%": { transform: "scale(1) rotate(-11deg)", opacity: "1" },
        },
        riseIn: {
          "0%": { transform: "translateY(14px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        wipeIn: {
          "0%": { transform: "scaleX(0)", opacity: "0" },
          "100%": { transform: "scaleX(1)", opacity: "1" },
        },
        ringDraw: {
          "0%": { strokeDashoffset: "var(--circ)" },
          "100%": { strokeDashoffset: "var(--offset)" },
        },
        stampFly: {
          "0%": { transform: "var(--fly-from) scale(0.6)", opacity: "0" },
          "20%": { opacity: "1" },
          "70%": { transform: "var(--fly-to) scale(1.1)", opacity: "1" },
          "100%": { transform: "var(--fly-to) scale(0.9)", opacity: "0" },
        },
      },
      animation: {
        stampDown: "stampDown 0.55s cubic-bezier(0.2,0.8,0.2,1) both",
        riseIn: "riseIn 0.6s cubic-bezier(0.2,0.8,0.2,1) both",
        wipeIn: "wipeIn 0.7s cubic-bezier(0.2,0.8,0.2,1) both",
        stampFly: "stampFly 1.1s cubic-bezier(0.3,0.7,0.3,1) forwards",
      },
    },
  },
  plugins: [],
};

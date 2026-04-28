import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // These values are overridden at runtime by CSS variable rules in globals.css.
        // The hardcoded values here are only used by Tailwind for class-name generation
        // and as a fallback; actual colors come from --color-* CSS variables.
        app:          "#0a0e17",
        card:         "#141922",
        row:          "#1a1f2e",
        border:       "#1e2333",
        primary:      "#e2e8f0",
        muted:        "#94a3b8",
        "muted-dark": "#64748b",
        accent: {
          DEFAULT: "#0d9488",
          hover:   "#0f766e",
        },
        // legacy
        sink: { DEFAULT: "#7c3aed", soft: "#ede9fe" },
      },
    },
  },
  plugins: [],
} satisfies Config;

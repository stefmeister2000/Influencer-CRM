import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Driven by CSS custom properties (see globals.css / lib/theme.ts) so
        // each team can have its own brand color without a rebuild — the
        // fallback values here match the original static palette exactly.
        brand: {
          50: "rgb(var(--brand-50, 239 246 255) / <alpha-value>)",
          100: "rgb(var(--brand-100, 219 234 254) / <alpha-value>)",
          200: "rgb(var(--brand-200, 191 219 254) / <alpha-value>)",
          300: "rgb(var(--brand-300, 147 197 253) / <alpha-value>)",
          400: "rgb(var(--brand-400, 96 165 250) / <alpha-value>)",
          500: "rgb(var(--brand-500, 59 130 246) / <alpha-value>)",
          600: "rgb(var(--brand-600, 37 99 235) / <alpha-value>)",
          700: "rgb(var(--brand-700, 29 78 216) / <alpha-value>)",
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
          300: "#cbd5e1",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.06)",
        drawer: "-8px 0 24px rgba(15,23,42,0.08)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};

export default config;

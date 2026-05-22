/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── MongoDB brand palette ──────────────────────────────────────────
        forest:   "#001E2B",   // deepest bg canvas
        midnight: "#023430",   // card / elevated surface
        canopy:   "#00684A",   // medium green, borders
        neon:     "#00ED64",   // electric accent green
        coal:     "#1C2D38",   // hover / secondary surface
        ash:      "#3D4F58",   // subtle border
        // ── Text
        fog:      "#F9FBFA",   // primary text on dark
        slate:    "#89989B",   // secondary / muted
        // ── Semantic
        sky:      "#016BF8",   // info / links
        success:  "#00ED64",
        warning:  "#FFC010",
        danger:   "#EF4444",
        // ── Legacy aliases (used by existing components)
        "bg-primary":   "#001E2B",
        "bg-secondary": "#023430",
        "bg-card":      "#023430",
        "bg-hover":     "#1C2D38",
        brand: {
          DEFAULT: "#00ED64",
          hover:   "#00CB55",
          light:   "#33F47F",
        },
        muted:  "#89989B",
        border: "#3D4F58",
      },

      fontFamily: {
        sans: ["'Euclid Circular A'", "'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },

      fontSize: {
        "2xs": ["11px", { lineHeight: "1.4", letterSpacing: "0.04em" }],
      },

      borderRadius: {
        DEFAULT: "10px",
        sm:  "6px",
        md:  "10px",
        lg:  "14px",
        xl:  "20px",
        "2xl": "24px",
      },

      boxShadow: {
        card:   "0 1px 4px rgba(0,0,0,0.32), 0 0 0 1px rgba(0,104,74,0.18)",
        raised: "0 4px 16px rgba(0,0,0,0.4)",
        glow:   "0 0 0 3px rgba(0,237,100,0.25)",
        "glow-sm": "0 0 0 2px rgba(0,237,100,0.18)",
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34,1.56,0.64,1)",
      },

      keyframes: {
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-12px)", opacity: "0" },
          to:   { transform: "translateY(0)",     opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "glow-pulse": {
          "0%,100%": { boxShadow: "0 0 0 0px rgba(0,237,100,0)" },
          "50%":      { boxShadow: "0 0 0 6px rgba(0,237,100,0.2)" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to:   { transform: "scale(1)",    opacity: "1" },
        },
      },

      animation: {
        "slide-up":    "slide-up 300ms cubic-bezier(0.34,1.56,0.64,1) forwards",
        "slide-down":  "slide-down 200ms cubic-bezier(0.2,0,0,1) forwards",
        "fade-in":     "fade-in 200ms cubic-bezier(0.2,0,0,1) forwards",
        "glow-pulse":  "glow-pulse 600ms ease-in-out",
        "scale-in":    "scale-in 200ms cubic-bezier(0.34,1.56,0.64,1) forwards",
      },
    },
  },
  plugins: [],
};

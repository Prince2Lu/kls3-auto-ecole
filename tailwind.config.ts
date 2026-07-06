import type { Config } from "tailwindcss";

const config: Config = {
  theme: {
    extend: {
      colors: {
        brand: "var(--brand)",
        ink: "#1C1917",
        surface: "#FAFAF9",
        "surface-muted": "#F0EFED",
        border: "#E5E3E0",
        success: {
          DEFAULT: "#15803D",
          subtle: "#DCFCE7",
        },
        warning: {
          DEFAULT: "#B45309",
          subtle: "#FEF3C7",
        },
        danger: {
          DEFAULT: "#B91C1C",
          subtle: "#FEE2E2",
        },
        neutral: {
          DEFAULT: "#57534E",
          subtle: "#F5F5F4",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;

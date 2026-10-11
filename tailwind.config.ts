import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#07070B",
          900: "#0B0B12",
          850: "#0F1018",
          800: "#14151F",
          700: "#1C1E2B",
          600: "#262A3A",
          500: "#3A3F54",
        },
        navy: {
          950: "#081226",
          900: "#0C1B38",
          800: "#12264D",
          700: "#1A3564",
          600: "#254585",
        },
        gold: {
          300: "#E8CF8F",
          400: "#D9B96A",
          500: "#C9A24B",
          600: "#A9853A",
          700: "#86682C",
        },
        cream: {
          50: "#FBF9F4",
          100: "#F6F2E9",
          200: "#EDE6D6",
          300: "#E0D6C0",
        },
        mist: {
          300: "#B9BDCD",
          400: "#9BA1B5",
          500: "#7E8499",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.35), 0 8px 28px -12px rgba(0,0,0,.55)",
        "card-hover": "0 2px 4px rgba(0,0,0,.4), 0 18px 44px -14px rgba(0,0,0,.65)",
        gold: "0 0 0 1px rgba(201,162,75,.35), 0 10px 30px -12px rgba(201,162,75,.25)",
      },
      maxWidth: {
        page: "84rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
      animation: {
        fadeUp: "fadeUp .6s cubic-bezier(.22,1,.36,1) both",
      },
    },
  },
  plugins: [],
};

export default config;

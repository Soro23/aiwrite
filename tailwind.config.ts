import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3fcf8e",
          hover: "#2db67d",
        },
        primary: "#3fcf8e",
        "background-light": "#f6f8f7",
        "background-dark": "#131f1a",
      },
      fontFamily: {
        display: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
      },
    },
  },
} satisfies Config;

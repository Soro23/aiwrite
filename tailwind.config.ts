import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3ecf8e",
          hover: "#2db67d",
        },
      },
    },
  },
} satisfies Config;

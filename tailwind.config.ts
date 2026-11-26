import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f5f4",
          100: "#cbe9e6",
          200: "#9fd3ce",
          300: "#6bb7b1",
          400: "#3d918c",
          500: "#0b4650",
          600: "#07363e",
          700: "#052a30",
          800: "#042026",
          900: "#03161a",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 12px 30px -18px rgba(0, 54, 65, 0.35)",
        "card-hover": "0 2px 4px rgba(15, 23, 42, 0.05), 0 18px 36px -18px rgba(0, 54, 65, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;

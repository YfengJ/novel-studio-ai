import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15202b",
        paper: "#f3f6f4",
        line: "#d7dfd7",
        accent: "#0f766e",
        ember: "#9a3412"
      },
      boxShadow: {
        soft: "0 16px 50px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

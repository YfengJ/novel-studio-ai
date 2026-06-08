import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f7f5ef",
        line: "#d8d2c4",
        accent: "#256d7b",
        ember: "#a34722"
      },
      boxShadow: {
        soft: "0 16px 50px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;


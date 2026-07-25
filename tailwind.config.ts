import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"]
      },
      colors: {
        ink: "#06070b",
        panel: "#10131d",
        signal: "#b6ff4d",
        violet: "#9477ff",
        coral: "#ff7464"
      }
    }
  },
  plugins: []
};

export default config;

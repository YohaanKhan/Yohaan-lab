import type { Config } from "tailwindcss";

const config: Config = {
    content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/ui/**/*.{ts,tsx}",],
    theme: {
        extend: {
            colors: {
                background: "#0a0a0a",
                surface: "#111111",
                border: "#1f1f1f",
                primary: "#e2e2e2",
                muted: "#666666",
                accent: "#7c6af7",
            },
            fontFamily: {
                sans: ["var(--font-sans)"],
                mono: ["var(--font-mono)"],
            },
            borderRadius: {
                sm: "6px",
                md: "12px",
                lg: "18px",
                xl: "24px",
            },
        },
    },
    plugins: [],
};

export default config;
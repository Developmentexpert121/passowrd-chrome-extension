import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                background: resolve(__dirname, "src/extension/background.ts"),
                content: resolve(__dirname, "src/extension/content.ts")
            },
            output: {
                entryFileNames: "[name].js",
                dir: "dist",
                format: "es"
            }
        },
        outDir: "dist",
        minify: "terser",
        emptyOutDir: false
    }
});
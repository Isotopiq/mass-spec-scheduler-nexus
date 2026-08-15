import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 41784,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      maxParallelFileOps: 5,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Univer expects this deep path which opentype.js 1.3.5 ships as opentype.mjs
      "opentype.js/dist/opentype.module.js": path.resolve(
        __dirname,
        "./node_modules/opentype.js/dist/opentype.mjs",
      ),
    },
  },
});

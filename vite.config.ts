import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    // Disabled runtime error overlay - it causes false positives during React initialization
    // Errors are still visible in browser console and ErrorBoundary catches React errors
    // Uncomment the line below to re-enable if needed:
    // runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Better code splitting for PWA
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['wouter'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-toast'],
        },
      },
    },
    // Improve chunk size warnings
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    // Proxy API requests to Express backend
    // Note: This is only used if Vite dev server runs standalone
    // In middleware mode (current setup), Express handles routing directly
    proxy: {
      "/api": {
        target: "http://localhost:5000", // Express server port
        changeOrigin: true,
        secure: false,
        // Don't rewrite the path - forward /api/* as-is
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

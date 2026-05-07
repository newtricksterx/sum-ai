import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) {
            return;
          }

          if (
            id.includes("/node_modules/jspdf/") ||
            id.includes("/node_modules/html2canvas/")
          ) {
            return "vendor-pdf";
          }

          return;
        },
      },
    },
  },
})

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: 5173,
    strictPort: false,
    watch: {
      usePolling: true, // Essential for real-time change detection on Windows drives
      interval: 100, // Poll every 100ms for instant hot reload
    },
    hmr: {
      overlay: true,
    },
  },
})

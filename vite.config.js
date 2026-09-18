import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

const buildTime = new Date().toISOString()

function versionPlugin() {
  return {
    name: 'kancasela-version-plugin',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            buildTime,
            version: '2.4.0',
            timestamp: Date.now(),
          },
          null,
          2
        ),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl(), versionPlugin()],
  define: {
    __APP_BUILD_TIME__: JSON.stringify(buildTime),
  },
  server: {
    host: true, // Listen on all network addresses (0.0.0.0)
    port: process.env.PORT ? parseInt(process.env.PORT) : 443,
    strictPort: false, // If port 443 is in use, seamlessly falls back to 5173
    allowedHosts: true, // Allow subdomains like admin.localhost, kancasela.test, admin.kancasela.test
    watch: {
      usePolling: true, // Essential for real-time change detection on Windows drives
      interval: 100, // Poll every 100ms for instant hot reload
    },
    hmr: {
      overlay: true,
    },
  },
})

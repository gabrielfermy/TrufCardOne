import http from 'node:http'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite'

const buildTime = new Date().toISOString()

function httpToHttpsRedirectPlugin() {
  return {
    name: 'http-to-https-redirect',
    configureServer(server) {
      try {
        const redirectServer = http.createServer((req, res) => {
          const host = req.headers.host ? req.headers.host.split(':')[0] : 'kancasela.test'
          res.writeHead(301, { Location: `https://${host}${req.url}` })
          res.end()
        })
        redirectServer.on('error', (err) => {
          // If port 80 is occupied by another service or lacks permission, continue gracefully
          server.config.logger.warn(`HTTP Port 80 redirect disabled: ${err.message}`)
        })
        redirectServer.listen(80, '0.0.0.0', () => {
          server.config.logger.info('  ➜  HTTP Redirect: http://kancasela.test:80 -> https://kancasela.test')
        })
      } catch (err) {
        // graceful fallback
      }
    },
  }
}

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
  plugins: [react(), basicSsl(), httpToHttpsRedirectPlugin(), versionPlugin()],
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

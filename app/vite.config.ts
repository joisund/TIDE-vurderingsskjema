import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import appPackage from './package.json' with { type: 'json' }
import { pilotDatabaseFile } from './server/pilot-config.ts'
import { createTestDriveApi, isTestDriveApiPath } from './server/test-drive-api.ts'
import { TestDriveStore } from './server/test-drive-store.ts'

function pilotApi(): Plugin {
  return {
    name: 'testkjoring-pilot-api',
    configureServer(server) {
      if (server.config.server.host !== '127.0.0.1') throw new Error('Bruk pilot:start med HTTPS utenfor loopback.')
      const store = new TestDriveStore(pilotDatabaseFile())
      server.httpServer?.once('close', () => store.database.close())
      server.middlewares.use((request, response, next) => {
        if (!isTestDriveApiPath(request.url ?? '/')) return next()
        const address = server.httpServer?.address()
        if (!address || typeof address === 'string') return response.writeHead(503).end()
        void createTestDriveApi(store, new URL(`http://127.0.0.1:${address.port}`))(request, response)
      })
    },
  }
}

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), ...(command === 'serve' && mode === 'pilot' ? [pilotApi()] : [])],
  server: mode === 'pilot' ? {
    host: '127.0.0.1',
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.cache/**', '**/*.sqlite*', '**/*.db*'] },
  } : undefined,
  define: { __APP_BUILD__: JSON.stringify(process.env.VITE_BUILD_ID ?? appPackage.version) },
}))

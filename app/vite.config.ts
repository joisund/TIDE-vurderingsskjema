import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import appPackage from './package.json' with { type: 'json' }

export default defineConfig({
  plugins: [react()],
  define: { __APP_BUILD__: JSON.stringify(process.env.VITE_BUILD_ID ?? appPackage.version) },
})

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import path from 'node:path'
import { defineConfig } from 'vite'

const backendTarget = process.env.NOMADBANK_DEV_BACKEND ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': backendTarget,
      '/health': backendTarget,
    },
  },
  build: {
    outDir: '../web/dist',
    emptyOutDir: true,
  },
})

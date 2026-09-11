import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// API живёт на другом порту, поэтому /api проксируется на бэкенд:
// так фронт ходит на свой origin и CORS не нужен.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5119',
        changeOrigin: true,
      },
    },
  },
})

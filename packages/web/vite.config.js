import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  server: {
    proxy: {
      // Proxy API requests to the backend
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
        secure: false,
      },
      // Proxy Socket.IO engine.io requests
      '/live': {
        target: 'http://localhost:3100',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    }
  }
})

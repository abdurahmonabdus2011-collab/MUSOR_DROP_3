import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev rejimda /api so'rovlar backend (port 5432) ga yuboriladi
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5432',
      '/uploads': 'http://localhost:5432',
    },
  },
})

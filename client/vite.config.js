import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173 // Configured so we can access app at 127.0.0.1:5173 instead of localhost:5173 for spotify API
  }
})

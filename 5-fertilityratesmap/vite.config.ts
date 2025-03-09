import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: false, // Set to true if you're using WSL or a VM
      ignored: ['**/node_modules/**', '**/dist/**']
    },
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite go brrr 🏃‍♂️
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // this makes it so when the frontend calls /api, it goes to the backend
      // (cuz CORS is wack and we dont wanna deal with it)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

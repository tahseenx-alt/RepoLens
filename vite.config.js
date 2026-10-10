import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Settings for the tests (npm test). https://vitest.dev/config/
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
})

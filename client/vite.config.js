import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During development, calls to /api go to the Express server on port 5000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true }
    }
  }
});

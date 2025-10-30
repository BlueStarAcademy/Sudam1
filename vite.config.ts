import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This ensures Vite listens on all network interfaces
    proxy: {
      '/api': 'http://localhost:4000',
    },
    watch: {
      ignored: ['**/vite.config.ts'],
      usePolling: true,
    },
  },
})
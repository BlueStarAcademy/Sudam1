import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This ensures Vite listens on all network interfaces
    proxy: {
      '/api': 'http://localhost:4000',
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // 서버가 아직 시작되지 않았을 때 발생하는 ECONNREFUSED 에러는 조용히 무시
            if (err.code === 'ECONNREFUSED') {
              // 개발 환경에서만 조용히 무시 (프로덕션에서는 로그 남김)
              return;
            }
            console.error('[Vite Proxy] WebSocket proxy error:', err);
          });
        },
      },
    },
    watch: {
      ignored: ['**/vite.config.ts'],
      usePolling: true,
    },
  },
})
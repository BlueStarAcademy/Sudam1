import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // This ensures Vite listens on all network interfaces
    hmr: {
      // HMR WebSocket 연결을 더 안정적으로 만들기
      protocol: 'ws',
      host: 'localhost',
      clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            // 서버가 아직 시작되지 않았을 때 발생하는 ECONNREFUSED 에러는 조용히 무시
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
              // 개발 환경에서만 조용히 무시 (프로덕션에서는 로그 남김)
              return;
            }
            console.error('[Vite Proxy] WebSocket proxy error:', err);
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            // WebSocket 연결 시도 시 재연결 로직
            socket.on('error', (err) => {
              if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
                // 조용히 무시
                return;
              }
            });
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
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// 프록시 오류를 필터링하는 플러그인
const filterProxyErrorsPlugin = (): Plugin => {
  return {
    name: 'filter-proxy-errors',
    configureServer(server) {
      // Vite의 로거를 가로채서 프록시 오류를 필터링
      const originalLog = server.config.logger.info;
      const originalWarn = server.config.logger.warn;
      const originalError = server.config.logger.error;

      // info 레벨 로그 필터링
      server.config.logger.info = (msg, options) => {
        if (typeof msg === 'string' && (
          msg.includes('ws proxy error') ||
          msg.includes('ws proxy socket error') ||
          (msg.includes('ECONNREFUSED') && msg.includes('proxy')) ||
          msg.includes('write ECONNABORTED') ||
          msg.includes('ECONNABORTED')
        )) {
          return;
        }
        originalLog(msg, options);
      };

      // warn 레벨 로그 필터링
      server.config.logger.warn = (msg, options) => {
        if (typeof msg === 'string' && (
          msg.includes('ws proxy error') ||
          msg.includes('ws proxy socket error') ||
          (msg.includes('ECONNREFUSED') && msg.includes('proxy')) ||
          msg.includes('write ECONNABORTED') ||
          msg.includes('ECONNABORTED')
        )) {
          return;
        }
        originalWarn(msg, options);
      };

      // error 레벨 로그 필터링
      server.config.logger.error = (msg, options) => {
        if (typeof msg === 'string' && (
          msg.includes('ws proxy error') ||
          msg.includes('ws proxy socket error') ||
          (msg.includes('ECONNREFUSED') && msg.includes('proxy')) ||
          msg.includes('write ECONNABORTED') ||
          msg.includes('ECONNABORTED')
        )) {
          return;
        }
        originalError(msg, options);
      };
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    filterProxyErrorsPlugin(),
  ],
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
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req, _res) => {
            // 서버가 아직 시작되지 않았을 때 발생하는 ECONNREFUSED 에러는 조용히 무시
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
              // 개발 환경에서만 조용히 무시
              return;
            }
            // 실제 프록시 오류만 로그 (일반적인 연결 거부는 제외)
            if (!err.message?.includes('ECONNREFUSED')) {
              console.error('[Vite Proxy] API proxy error:', err);
            }
          });
        },
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true,
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err: any, _req, _res) => {
            // 서버가 아직 시작되지 않았을 때 발생하는 ECONNREFUSED 에러는 조용히 무시
            if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED') {
              // 개발 환경에서만 조용히 무시
              return;
            }
            // 실제 프록시 오류만 로그 (일반적인 연결 거부는 제외)
            if (!err.message?.includes('ECONNREFUSED')) {
              console.error('[Vite Proxy] WebSocket proxy error:', err);
            }
          });
          proxy.on('proxyReqWs', (proxyReq, req, socket) => {
            // WebSocket 연결 시도 시 재연결 로직
            socket.on('error', (err: any) => {
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
  logLevel: 'warn', // Vite 로그 레벨을 warn으로 설정하여 일반적인 프록시 오류를 줄임
})
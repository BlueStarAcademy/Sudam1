
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';

// Register Service Worker for PWA (프로덕션 환경에서만)
if ('serviceWorker' in navigator) {
  // 개발 환경에서는 Service Worker 비활성화 (HMR과 충돌 방지)
  const isDevelopment = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  if (!isDevelopment) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[Service Worker] Registration successful:', registration.scope);
          
          // Service Worker 업데이트 감지 및 즉시 활성화
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // 새 버전이 설치되었을 때 즉시 활성화
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  // 페이지 새로고침으로 새 버전 적용
                  window.location.reload();
                }
              });
            }
          });
          
          // 주기적으로 업데이트 확인
          setInterval(() => {
            registration.update();
          }, 60000); // 1분마다 업데이트 확인
        })
        .catch((error) => {
          console.log('[Service Worker] Registration failed:', error);
        });
    });
  } else {
    // 개발 환경에서는 기존 Service Worker 제거
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('[Service Worker] Unregistered in development mode');
        });
      });
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
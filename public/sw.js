// Service Worker for PWA
// 캐시 버전을 빌드 타임스탬프로 업데이트 (자동으로 변경됨)
const CACHE_NAME = 'sudam-v' + new Date().getTime();
const urlsToCache = [
  '/',
  '/index.html',
  '/index.css',
  '/images/Icon.png',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
  self.skipWaiting();
});

// skipWaiting 메시지 수신 시 즉시 활성화
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // 현재 캐시가 아니면 모두 삭제
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 모든 클라이언트에 즉시 제어권 부여
      return self.clients.claim();
    })
  );
});

// Fetch event - Network First strategy for better updates
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // HTML, JS, CSS 파일은 네트워크 우선 전략 사용 (항상 최신 버전)
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 네트워크에서 성공하면 캐시에 저장하고 반환
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시에만 캐시에서 제공
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // HTML 요청이고 캐시에도 없으면 index.html 반환
            if (request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
        })
    );
  } else {
    // 이미지 등 정적 리소스는 캐시 우선 전략 사용
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
            return response;
          });
        })
        .catch(() => {
          if (request.destination === 'document') {
            return caches.match('/index.html');
          }
        })
    );
  }
});


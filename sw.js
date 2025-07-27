const CACHE_NAME = 'epub-reader-v1.0.0';
const urlsToCache = [
  '/',
  '/epub-reader.html',
  '/assets/css/epub-reader.css',
  '/assets/js/epub-reader.js',
  '/assets/js/dictionary.js',
  '/assets/js/jszip.min.js',
  '/assets/js/epub.min.js',
  '/assets/fonts/ipaexm.ttf',
  '/manifest.json'
];

// 安装事件 - 缓存资源
self.addEventListener('install', event => {
  console.log('Service Worker: 安装中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存文件');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: 安装完成');
        return self.skipWaiting();
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker: 激活中...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: 激活完成');
      return self.clients.claim();
    })
  );
});

// 获取事件 - 网络优先，缓存备用
self.addEventListener('fetch', event => {
  // 跳过非GET请求
  if (event.request.method !== 'GET') {
    return;
  }

  // 跳过chrome-extension等特殊协议
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('chrome://') ||
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 检查响应是否有效
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 克隆响应
        const responseToCache = response.clone();

        // 缓存响应
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // 网络失败时，从缓存获取
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            
            // 如果缓存中也没有，返回离线页面
            if (event.request.destination === 'document') {
              return caches.match('/epub-reader.html');
            }
          });
      })
  );
});

// 消息事件 - 处理来自主线程的消息
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
}); 
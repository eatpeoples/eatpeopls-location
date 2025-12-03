/* sw.js */
// ⬇️ 여기 이름을 바꾸는 게 핵심입니다!
const CACHE_NAME = 'cnu-eats-v1'; 

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon.png'
];

// 아래는 건드리지 않아도 됩니다. (기존 설치 이벤트)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// (기존 패치 이벤트)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

// ⬇️ [추가] 옛날 캐시(밥줘 AI)를 삭제하는 청소부 코드를 추가하면 더 확실합니다!
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('Old cache removed', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

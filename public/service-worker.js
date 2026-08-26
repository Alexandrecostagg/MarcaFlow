const CACHE_NAME = "marcaflow-v5";
const V = "2026.08.29";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./assets/icon-192.svg",
  "./assets/icon-512.svg",
  `./utils.js?v=${V}`,
  `./store.js?v=${V}`,
  `./business.js?v=${V}`,
  `./views.js?v=${V}`,
  `./agent.js?v=${V}`,
  `./search.js?v=${V}`,
  `./alerts.js?v=${V}`,
  `./gru.js?v=${V}`,
  `./antteriority.js?v=${V}`,
  `./petitions.js?v=${V}`,
  `./client-dashboard.js?v=${V}`,
  `./client-dashboard.html`,
  `./emarcas.js?v=${V}`,
  `./financial.js?v=${V}`,
  `./reports.js?v=${V}`,
  `./imports.js?v=${V}`,
  `./a11y.js?v=${V}`,
  `./analytics.js?v=${V}`,
  `./backup.js?v=${V}`,
  `./firebase-config.js?v=${V}`,
  `./firebase-service.js?v=${V}`,
  `./knowledge-base.js?v=${V}`,
  `./main.js?v=${V}`
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("PWA: Cache inicializado");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => {
          console.log("PWA: Removendo cache antigo:", name);
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network-first com fallback para cache (evita servir assets
// velhos após um deploy; mantém o app utilizável offline).
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Intercepta apenas requisições da mesma origem (CDNs como gstatic/
  // firebase e a API do agente seguem direto, sem passar pelo cache).
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse.status === 200) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
      }
      return networkResponse;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-workspace") {
    event.waitUntil(syncWorkspace());
  }
});

async function syncWorkspace() {
  // Attempt to sync with Firebase when back online
  try {
    if (window.marcaFlowCloud && window.data) {
      await window.marcaFlowCloud.saveWorkspace(window.data);
      console.log("PWA: Sync concluído");
    }
  } catch (error) {
    console.error("PWA: Erro no sync:", error);
  }
}

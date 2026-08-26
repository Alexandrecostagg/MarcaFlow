const CACHE_NAME = "marcaflow-v4";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./manifest.json",
  "./assets/icon-192.svg",
  "./assets/icon-512.svg",
  "./utils.js",
  "./store.js",
  "./business.js",
  "./views.js",
  "./agent.js",
  "./search.js",
  "./alerts.js",
  "./gru.js",
  "./antteriority.js",
  "./petitions.js",
  "./client-dashboard.js",
  "./client-dashboard.html",
  "./emarcas.js",
  "./financial.js",
  "./reports.js",
  "./imports.js",
  "./a11y.js",
  "./analytics.js",
  "./backup.js",
  "./firebase-config.js",
  "./firebase-service.js",
  "./knowledge-base.js",
  "./main.js"
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

  // Skip Firebase and DeepSeek API calls
  if (event.request.url.includes("firebaseio.com") ||
      event.request.url.includes("deepseek.com") ||
      event.request.url.includes("googleapis.com")) {
    return;
  }

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

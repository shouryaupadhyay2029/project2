const CACHE_NAME = "devstage-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles/global.css",
  "/scripts/script.js",
  "/scripts/authGuard.js",
  "/scripts/nav-dropdown.js",
  "/scripts/realtime.js",
  "/scripts/motion-engine.js",
  "/js/motion/motion-core.js",
  "/js/motion/scroll-engine.js",
  "/js/motion/gsap-init.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (url.pathname === "/scripts/auth.js" || url.pathname === "/scripts/firebase-config.js") {
    event.respondWith(networkFirstStatic(request));
    return;
  }

  if (isStaticRequest(request, url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "devstage-background-sync") {
    event.waitUntil(Promise.resolve());
  }
});

function isStaticRequest(request, url) {
  return (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    request.destination === "font" ||
    [".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".ico", ".woff", ".woff2"].some((extension) =>
      url.pathname.endsWith(extension),
    )
  );
}

async function networkFirstStatic(request) {
  try {
    const response = await fetch(request, { cache: "no-store" });
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}

async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: "DevStage is offline. Please try again when your connection returns.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    return caches.match("/offline.html");
  }
}

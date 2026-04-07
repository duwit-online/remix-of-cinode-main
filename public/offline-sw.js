const DB_NAME = "cinode_offline";
const STORE_NAME = "videos";
const DB_VERSION = 1;
const SHELL_CACHE = "cinode-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(["/"])).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getRecord(key) {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_NAME, "readonly");
    return await requestToPromise(tx.objectStore(STORE_NAME).get(key));
  } finally {
    db.close();
  }
}

async function handleOfflineMedia(request) {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace("/offline-media/", ""));
  const record = await getRecord(key);

  if (!record || !record.blob) {
    return new Response("Offline media not found", { status: 404 });
  }

  const blob = record.blob;
  const type = record.mimeType || blob.type || "video/mp4";
  const range = request.headers.get("range");

  if (range) {
    const match = /bytes=(\d+)-(\d+)?/.exec(range);
    if (match) {
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : blob.size - 1;
      const chunk = blob.slice(start, end + 1, type);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": type,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${blob.size}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        },
      });
    }
  }

  return new Response(blob, {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(blob.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin === self.location.origin && url.pathname.startsWith("/offline-media/")) {
    event.respondWith(handleOfflineMedia(request));
    return;
  }

  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match("/")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
export const OFFLINE_DB_NAME = "cinode_offline";
export const OFFLINE_STORE_NAME = "videos";
export const OFFLINE_DB_VERSION = 1;

export interface OfflineMediaRecord {
  key: string;
  title: string;
  posterPath: string;
  mediaType: string;
  tmdbId: number;
  season?: number;
  episode?: number;
  size: number;
  downloadedAt: number;
  mimeType?: string;
  blob?: Blob;
}

export function getOfflineMediaKey(mediaType: string, tmdbId: number, season?: number, episode?: number) {
  if (mediaType === "tv" && season && episode) return `${mediaType}-${tmdbId}-s${season}e${episode}`;
  return `${mediaType}-${tmdbId}`;
}

export function getOfflineMediaPath(key: string) {
  return `/offline-media/${encodeURIComponent(key)}`;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(OFFLINE_STORE_NAME)) {
        db.createObjectStore(OFFLINE_STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineMediaRecord(key: string): Promise<OfflineMediaRecord | null> {
  const db = await openDB();
  try {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readonly");
    const result = await requestToPromise(tx.objectStore(OFFLINE_STORE_NAME).get(key));
    return (result as OfflineMediaRecord | undefined) ?? null;
  } finally {
    db.close();
  }
}

export async function getAllOfflineMediaRecords(): Promise<OfflineMediaRecord[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readonly");
    const result = await requestToPromise(tx.objectStore(OFFLINE_STORE_NAME).getAll());
    return ((result as OfflineMediaRecord[]) || []).sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
  } finally {
    db.close();
  }
}

export async function saveOfflineMediaRecord(record: OfflineMediaRecord) {
  const db = await openDB();
  try {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    await requestToPromise(tx.objectStore(OFFLINE_STORE_NAME).put(record));
  } finally {
    db.close();
  }
}

export async function deleteOfflineMediaRecord(key: string) {
  const db = await openDB();
  try {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    await requestToPromise(tx.objectStore(OFFLINE_STORE_NAME).delete(key));
  } finally {
    db.close();
  }
}

export async function clearOfflineMediaRecords() {
  const db = await openDB();
  try {
    const tx = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    await requestToPromise(tx.objectStore(OFFLINE_STORE_NAME).clear());
  } finally {
    db.close();
  }
}

export async function registerOfflineServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/offline-sw.js", { scope: "/" });
  } catch (error) {
    console.error("Service worker registration failed", error);
  }
}
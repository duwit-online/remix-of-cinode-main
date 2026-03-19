import { useState, useEffect, useCallback } from "react";

const DB_NAME = "cinode_offline";
const STORE_NAME = "videos";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
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

export interface DownloadedVideo {
  key: string;
  title: string;
  posterPath: string;
  mediaType: string;
  tmdbId: number;
  blobUrl?: string;
  size: number;
  downloadedAt: number;
}

function getKey(mediaType: string, tmdbId: number, season?: number, episode?: number) {
  if (mediaType === "tv" && season && episode) return `${mediaType}-${tmdbId}-s${season}e${episode}`;
  return `${mediaType}-${tmdbId}`;
}

export function useOfflineDownload(
  streamUrl: string,
  mediaType: string,
  tmdbId: number,
  title: string,
  posterPath: string,
  season?: number,
  episode?: number
) {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [offlineUrl, setOfflineUrl] = useState<string | null>(null);
  const key = getKey(mediaType, tmdbId, season, episode);

  // Check if already downloaded
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => {
          if (!cancelled && req.result?.blob) {
            setIsDownloaded(true);
            const url = URL.createObjectURL(req.result.blob);
            setOfflineUrl(url);
          }
        };
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [key]);

  const download = useCallback(async () => {
    if (!streamUrl || isDownloading) return;
    setIsDownloading(true);
    setProgress(0);
    try {
      const res = await fetch(streamUrl);
      if (!res.ok) throw new Error("Download failed");
      const contentLength = Number(res.headers.get("content-length") || 0);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) setProgress(Math.round((received / contentLength) * 100));
      }

      const blob = new Blob(chunks);
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put({ key, blob, title, posterPath, mediaType, tmdbId, size: blob.size, downloadedAt: Date.now() });
      
      setIsDownloaded(true);
      setOfflineUrl(URL.createObjectURL(blob));
      setProgress(100);
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setIsDownloading(false);
    }
  }, [streamUrl, isDownloading, key, title, posterPath, mediaType, tmdbId]);

  const removeDownload = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      setIsDownloaded(false);
      if (offlineUrl) URL.revokeObjectURL(offlineUrl);
      setOfflineUrl(null);
    } catch {}
  }, [key, offlineUrl]);

  return { isDownloaded, isDownloading, progress, offlineUrl, download, removeDownload };
}

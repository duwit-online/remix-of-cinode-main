import { useState, useEffect, useCallback } from "react";
import {
  deleteOfflineMediaRecord,
  getOfflineMediaKey,
  getOfflineMediaPath,
  getOfflineMediaRecord,
  saveOfflineMediaRecord,
  type OfflineMediaRecord,
} from "@/lib/offlineMedia";

export type DownloadedVideo = OfflineMediaRecord;

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
  const key = getOfflineMediaKey(mediaType, tmdbId, season, episode);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const record = await getOfflineMediaRecord(key);
        if (!cancelled && record?.blob) {
          setIsDownloaded(true);
          setOfflineUrl(getOfflineMediaPath(key));
        }
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
      let blob: Blob;

      if (!res.body) {
        blob = await res.blob();
      } else {
        const reader = res.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;
          chunks.push(value);
          received += value.length;
          if (contentLength > 0) setProgress(Math.round((received / contentLength) * 100));
        }
        blob = new Blob(chunks as unknown as BlobPart[], { type: res.headers.get("content-type") || "video/mp4" });
      }

      await saveOfflineMediaRecord({
        key,
        blob,
        title,
        posterPath,
        mediaType,
        tmdbId,
        season,
        episode,
        size: blob.size,
        mimeType: blob.type || res.headers.get("content-type") || "video/mp4",
        downloadedAt: Date.now(),
      });
      
      setIsDownloaded(true);
      setOfflineUrl(getOfflineMediaPath(key));
      setProgress(100);
    } catch (e) {
      console.error("Download error:", e);
    } finally {
      setIsDownloading(false);
    }
  }, [streamUrl, isDownloading, key, title, posterPath, mediaType, tmdbId]);

  const removeDownload = useCallback(async () => {
    try {
      await deleteOfflineMediaRecord(key);
      setIsDownloaded(false);
      setOfflineUrl(null);
    } catch {}
  }, [key]);

  return { isDownloaded, isDownloading, progress, offlineUrl, download, removeDownload };
}

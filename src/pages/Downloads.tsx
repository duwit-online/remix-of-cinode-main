import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Trash2, Play, HardDrive, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getImageUrl } from "@/lib/tmdb";
import type { DownloadedVideo } from "@/hooks/useOfflineDownload";

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

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const Downloads = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<DownloadedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVideos = useCallback(async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: DownloadedVideo[] = (req.result || []).map((item: any) => ({
          key: item.key,
          title: item.title,
          posterPath: item.posterPath,
          mediaType: item.mediaType,
          tmdbId: item.tmdbId,
          size: item.size || 0,
          downloadedAt: item.downloadedAt || 0,
        }));
        items.sort((a, b) => b.downloadedAt - a.downloadedAt);
        setVideos(items);
        setLoading(false);
      };
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const removeVideo = async (key: string) => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      setVideos((prev) => prev.filter((v) => v.key !== key));
    } catch {}
  };

  const clearAll = async () => {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).clear();
      setVideos([]);
    } catch {}
  };

  const totalSize = videos.reduce((sum, v) => sum + v.size, 0);

  const playVideo = (v: DownloadedVideo) => {
    navigate(`/watch/${v.mediaType}/${v.tmdbId}`);
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-24 md:pb-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary/50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl">Downloads</h1>
            <p className="text-xs text-muted-foreground">
              {videos.length} video{videos.length !== 1 ? "s" : ""} • {formatBytes(totalSize)}
            </p>
          </div>
          {videos.length > 0 && (
            <button onClick={clearAll} className="text-xs text-destructive hover:underline">
              Clear All
            </button>
          )}
        </div>

        {/* Storage info */}
        <div className="glass rounded-2xl p-4 border border-border/30 mb-6 flex items-center gap-3">
          <HardDrive size={20} className="text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Offline Storage</p>
            <p className="text-xs text-muted-foreground">
              Videos are saved to your device for offline viewing. They use your browser's local storage.
            </p>
          </div>
          <span className="text-sm font-semibold text-primary">{formatBytes(totalSize)}</span>
        </div>

        {/* Video list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16">
            <Download size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">No downloads yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              Tap the download button on any video to save it for offline viewing
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {videos.map((video) => (
              <motion.div
                key={video.key}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="glass rounded-xl border border-border/30 p-3 mb-3 flex items-center gap-3"
              >
                {/* Poster */}
                <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => playVideo(video)}>
                  {video.posterPath ? (
                    <img src={getImageUrl(video.posterPath, "w200")} alt={video.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-secondary/50 flex items-center justify-center">
                      <Download size={16} className="text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Play size={20} className="text-white" fill="white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playVideo(video)}>
                  <p className="text-sm font-semibold truncate">{video.title || "Untitled"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{video.mediaType}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatBytes(video.size)}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(video.downloadedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <button
                  onClick={() => removeVideo(video.key)}
                  className="p-2 rounded-full hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                  title="Remove download"
                >
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default Downloads;

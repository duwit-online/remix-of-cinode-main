import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "cinode_playback_progress";

interface ProgressEntry {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

type ProgressMap = Record<string, ProgressEntry>;

function getProgressKey(mediaType: string, tmdbId: number, season?: number, episode?: number): string {
  if (mediaType === "tv" && season && episode) {
    return `${mediaType}-${tmdbId}-s${season}e${episode}`;
  }
  return `${mediaType}-${tmdbId}`;
}

function loadProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgress(map: ProgressMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function usePlaybackProgress(
  mediaType: string,
  tmdbId: number,
  season?: number,
  episode?: number
) {
  const key = getProgressKey(mediaType, tmdbId, season, episode);
  const [savedTime, setSavedTime] = useState<number>(0);
  const lastSave = useRef(0);

  useEffect(() => {
    const map = loadProgress();
    const entry = map[key];
    if (entry && entry.currentTime > 10) {
      // Only resume if more than 10s in and not near the end
      const ratio = entry.duration > 0 ? entry.currentTime / entry.duration : 0;
      if (ratio < 0.95) {
        setSavedTime(entry.currentTime);
      } else {
        setSavedTime(0);
      }
    } else {
      setSavedTime(0);
    }
  }, [key]);

  const updateProgress = useCallback(
    (currentTime: number, duration: number) => {
      const now = Date.now();
      // Throttle saves to every 5 seconds
      if (now - lastSave.current < 5000) return;
      lastSave.current = now;
      const map = loadProgress();
      map[key] = { currentTime, duration, updatedAt: now };
      // Keep only last 100 entries
      const keys = Object.keys(map);
      if (keys.length > 100) {
        const sorted = keys.sort((a, b) => (map[a].updatedAt || 0) - (map[b].updatedAt || 0));
        sorted.slice(0, keys.length - 100).forEach((k) => delete map[k]);
      }
      saveProgress(map);
    },
    [key]
  );

  const clearProgress = useCallback(() => {
    const map = loadProgress();
    delete map[key];
    saveProgress(map);
    setSavedTime(0);
  }, [key]);

  return { savedTime, updateProgress, clearProgress };
}

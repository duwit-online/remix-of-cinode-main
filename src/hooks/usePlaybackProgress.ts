import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    if (typeof window === "undefined") return {};
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveProgressLocal(map: ProgressMap) {
  if (typeof window === "undefined") return;
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
  const { user } = useAuth();

  // Load progress - check DB first for logged in users, then localStorage
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      // Try DB first if logged in
      if (user) {
        try {
          const { data } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", `progress_${user.id}_${key}`)
            .maybeSingle();
          if (!cancelled && data?.value) {
            const entry = data.value as any;
            if (entry.currentTime > 10) {
              const ratio = entry.duration > 0 ? entry.currentTime / entry.duration : 0;
              if (ratio < 0.95) {
                setSavedTime(entry.currentTime);
                return;
              }
            }
          }
        } catch {}
      }

      // Fallback to localStorage
      if (!cancelled) {
        const map = loadProgress();
        const entry = map[key];
        if (entry && entry.currentTime > 10) {
          const ratio = entry.duration > 0 ? entry.currentTime / entry.duration : 0;
          if (ratio < 0.95) {
            setSavedTime(entry.currentTime);
          } else {
            setSavedTime(0);
          }
        } else {
          setSavedTime(0);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [key, user]);

  const updateProgress = useCallback(
    (currentTime: number, duration: number) => {
      const now = Date.now();
      if (now - lastSave.current < 5000) return;
      lastSave.current = now;

      // Save to localStorage
      const map = loadProgress();
      map[key] = { currentTime, duration, updatedAt: now };
      const keys = Object.keys(map);
      if (keys.length > 100) {
        const sorted = keys.sort((a, b) => (map[a].updatedAt || 0) - (map[b].updatedAt || 0));
        sorted.slice(0, keys.length - 100).forEach((k) => delete map[k]);
      }
      saveProgressLocal(map);

      // Also save to DB if logged in
      if (user) {
        supabase.from("app_settings").upsert({
          key: `progress_${user.id}_${key}`,
          value: { currentTime, duration, updatedAt: now } as any,
          updated_by: user.id,
        }, { onConflict: "key" }).then(() => {});
      }
    },
    [key, user]
  );

  const clearProgress = useCallback(() => {
    const map = loadProgress();
    delete map[key];
    saveProgressLocal(map);
    setSavedTime(0);
    if (user) {
      supabase.from("app_settings").delete().eq("key", `progress_${user.id}_${key}`).then(() => {});
    }
  }, [key, user]);

  return { savedTime, updateProgress, clearProgress };
}

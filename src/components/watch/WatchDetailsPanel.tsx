import React from "react";
import { getImageUrl, getTitle, getYear, type TMDBDetail } from "@/lib/tmdb";
import CinodePlayer from "./CinodePlayer";

interface WatchDetailsPanelProps {
  detail: TMDBDetail;
  // This should be the Jellyfin Item ID (e.g., "550eb6...") 
  // passed from your search/library results
  itemId: string;
}

const WatchDetailsPanel: React.FC<WatchDetailsPanelProps> = ({ detail, itemId }) => {
  // --- JELLYFIN CONFIGURATION ---
  const JELLYFIN_SERVER = "http://myserver:8096";
  const API_KEY = "abc123";

  // Construct the stream URL for HLS playback
  // This endpoint tells Jellyfin to provide a stream compatible with web players
  const videoSrc = `${JELLYFIN_SERVER}/videos/${itemId}/stream?static=true&api_key=${API_KEY}`;

  return (
    <div className="flex flex-col gap-8 p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <img
          src={getImageUrl(detail.poster_path, "w500")}
          alt={getTitle(detail)}
          className="w-48 sm:w-64 rounded-lg shadow-xl"
        />
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{getTitle(detail)} {detail.release_date && `(${getYear(detail)})`}</h1>
          {detail.tagline && <p className="italic text-gray-400">{detail.tagline}</p>}
          <p className="mt-2 text-sm text-gray-200 max-w-prose">{detail.overview}</p>
        </div>
      </div>

      <div className="w-full">
        <CinodePlayer
          src={videoSrc}
          title={getTitle(detail)}
          poster={getImageUrl(detail.poster_path, "w500")}
          onError={() => console.error('Playback Error: Check if Server is reachable or API key is valid')}
        />
      </div>
    </div>
  );
};

export default WatchDetailsPanel;

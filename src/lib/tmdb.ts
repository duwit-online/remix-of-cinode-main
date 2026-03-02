// Replace this with your actual TMDB API key
const TMDB_API_KEY = "2d93ebba01c3a81f04f9c86874d25143";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export const getImageUrl = (path: string | null, size: string = "w500") => {
  if (!path) return "/placeholder.svg";
  return `${IMAGE_BASE}/${size}${path}`;
};

export const getBackdropUrl = (path: string | null) => getImageUrl(path, "original");

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB Error: ${res.status}`);
  return res.json();
}

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: string;
}

export interface TMDBResponse {
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
  page: number;
}

export interface TMDBDetail extends TMDBMovie {
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres: { id: number; name: string }[];
  tagline?: string;
  status?: string;
  seasons?: TMDBSeason[];
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
}

export interface TMDBEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  vote_average: number;
  air_date: string;
}

export interface TMDBSeasonDetail {
  episodes: TMDBEpisode[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

// Movie endpoints
export const getTrending = (timeWindow: "day" | "week" = "week") =>
  tmdbFetch<TMDBResponse>(`/trending/all/${timeWindow}`);

export const getPopularMovies = (page = 1) =>
  tmdbFetch<TMDBResponse>("/movie/popular", { page: String(page) });

export const getTopRatedMovies = (page = 1) =>
  tmdbFetch<TMDBResponse>("/movie/top_rated", { page: String(page) });

export const getNowPlayingMovies = () =>
  tmdbFetch<TMDBResponse>("/movie/now_playing");

export const getUpcomingMovies = () =>
  tmdbFetch<TMDBResponse>("/movie/upcoming");

// TV endpoints
export const getPopularTV = (page = 1) =>
  tmdbFetch<TMDBResponse>("/tv/popular", { page: String(page) });

export const getTopRatedTV = () =>
  tmdbFetch<TMDBResponse>("/tv/top_rated");

export const getAiringTodayTV = () =>
  tmdbFetch<TMDBResponse>("/tv/airing_today");

// Genre-based
export const getMoviesByGenre = (genreId: number, page = 1) =>
  tmdbFetch<TMDBResponse>("/discover/movie", { with_genres: String(genreId), page: String(page) });

export const getTVByGenre = (genreId: number, page = 1) =>
  tmdbFetch<TMDBResponse>("/discover/tv", { with_genres: String(genreId), page: String(page) });

export const getMovieGenres = () =>
  tmdbFetch<{ genres: TMDBGenre[] }>("/genre/movie/list");

export const getTVGenres = () =>
  tmdbFetch<{ genres: TMDBGenre[] }>("/genre/tv/list");

// Detail
export const getMovieDetail = (id: number) =>
  tmdbFetch<TMDBDetail>(`/movie/${id}`);

export const getTVDetail = (id: number) =>
  tmdbFetch<TMDBDetail>(`/tv/${id}`);

export const getSeasonDetail = (tvId: number, seasonNumber: number) =>
  tmdbFetch<TMDBSeasonDetail>(`/tv/${tvId}/season/${seasonNumber}`);

// Search
export const searchMulti = (query: string, page = 1) =>
  tmdbFetch<TMDBResponse>("/search/multi", { query, page: String(page) });

// Similar
export const getSimilarMovies = (id: number) =>
  tmdbFetch<TMDBResponse>(`/movie/${id}/similar`);

export const getSimilarTV = (id: number) =>
  tmdbFetch<TMDBResponse>(`/tv/${id}/similar`);

// Helpers
export const getTitle = (item: TMDBMovie) => item.title || item.name || "Untitled";
export const getYear = (item: TMDBMovie) => {
  const date = item.release_date || item.first_air_date;
  return date ? date.split("-")[0] : "";
};
export const getMediaType = (item: TMDBMovie): "movie" | "tv" => {
  if (item.media_type) return item.media_type as "movie" | "tv";
  return item.title ? "movie" : "tv";
};

// Streaming URL - uses vidsrc-embed.ru with TMDB IDs
export const getStreamUrl = (
  mediaType: "movie" | "tv",
  id: number,
  season?: number,
  episode?: number
) => {
  if (mediaType === "tv" && season && episode) {
    return `https://vidsrc-embed.ru/embed/tv/${id}/${season}-${episode}`;
  }
  if (mediaType === "tv") {
    return `https://vidsrc-embed.ru/embed/tv/${id}`;
  }
  return `https://vidsrc-embed.ru/embed/movie/${id}`;
};

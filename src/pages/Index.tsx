import { useTrending, usePopularMovies, useTopRatedMovies, useNowPlaying, useUpcoming, usePopularTV, useTopRatedTV, useAiringToday } from "@/hooks/useTMDB";
import TMDBRow from "@/components/TMDBRow";
import TMDBHero from "@/components/TMDBHero";
import ContinueWatchingRow from "@/components/ContinueWatchingRow";
import AdBanner from "@/components/AdBanner";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { data: trending } = useTrending();
  const { data: popular } = usePopularMovies();
  const { data: topRated } = useTopRatedMovies();
  const { data: nowPlaying } = useNowPlaying();
  const { data: upcoming } = useUpcoming();
  const { data: popularTV } = usePopularTV();
  const { data: topRatedTV } = useTopRatedTV();
  const { data: airingToday } = useAiringToday();

  const heroItem = trending?.results?.[0];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {heroItem ? (
        <TMDBHero item={heroItem} />
      ) : (
        <Skeleton className="h-[70vh] w-full" />
      )}

      <div className="relative -mt-12 z-10">
        <ContinueWatchingRow />
        <AdBanner placement="homepage" className="mx-4 md:mx-8 mb-4" />
        <TMDBRow title="🔥 Trending Now" items={trending?.results || []} variant="default" />
        <TMDBRow title="🎬 Popular Movies" items={popular?.results || []} variant="wide" />
        <AdBanner placement="homepage" className="mx-4 md:mx-8 mb-4" />
        <TMDBRow title="⭐ Top Rated" items={topRated?.results || []} variant="tall" />
        <TMDBRow title="🎥 Now Playing" items={nowPlaying?.results || []} variant="default" />
        <TMDBRow title="📅 Coming Soon" items={upcoming?.results || []} variant="wide" />
        <AdBanner placement="homepage" className="mx-4 md:mx-8 mb-4" />
        <TMDBRow title="📺 Popular TV Shows" items={popularTV?.results || []} variant="default" />
        <TMDBRow title="🏆 Top Rated TV" items={topRatedTV?.results || []} variant="tall" />
        <TMDBRow title="📡 Airing Today" items={airingToday?.results || []} variant="default" />
      </div>
    </div>
  );
};

export default Index;

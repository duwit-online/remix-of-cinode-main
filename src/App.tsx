import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import MobileBottomNav from "@/components/MobileBottomNav";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Watch from "./pages/Watch";
import Search from "./pages/Search";
import Movies from "./pages/Movies";
import TVShows from "./pages/TVShows";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Collections from "./pages/Collections";
import Watchlist from "./pages/Watchlist";
import Downloads from "./pages/Downloads";
import Premium from "./pages/Premium";
import Checkout from "./pages/Checkout";
import AffiliatesDashboard from "./pages/AffiliatesDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isAuth = location.pathname === "/auth";
  const hideNav = isLanding || isAuth;

  return (
    <>
      {!hideNav && <Navbar />}
      {!hideNav && <MobileBottomNav />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Index />} />
        <Route path="/index" element={<Index />} />
        <Route path="/watch/:type/:id" element={<Watch />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/tv" element={<TVShows />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/affiliates" element={<AffiliatesDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

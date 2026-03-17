import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useActiveAds } from "@/hooks/useAds";

interface PreRollAdProps {
  onComplete: () => void;
}

const PreRollAd = ({ onComplete }: PreRollAdProps) => {
  const { data: ads } = useActiveAds("watch_page");
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  const preRollAd = ads?.find((a: any) => a.ad_type === "pre_roll");

  useEffect(() => {
    if (!preRollAd) {
      onComplete();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [preRollAd, onComplete]);

  if (!preRollAd) return null;

  return (
    <div className="absolute inset-0 z-10 bg-background flex flex-col items-center justify-center">
      {preRollAd.video_url ? (
        <video src={preRollAd.video_url} autoPlay muted className="w-full h-full object-contain" onEnded={onComplete} />
      ) : preRollAd.image_url ? (
        <a href={preRollAd.link_url || "#"} target="_blank" rel="noopener noreferrer">
          <img src={preRollAd.image_url} alt={preRollAd.name} className="max-w-full max-h-full object-contain" />
        </a>
      ) : null}

      <div className="absolute top-3 right-3">
        {canSkip ? (
          <button onClick={onComplete} className="px-4 py-2 rounded-xl bg-foreground/20 backdrop-blur text-foreground text-sm font-medium flex items-center gap-1">
            <X size={14} /> Skip Ad
          </button>
        ) : (
          <span className="px-4 py-2 rounded-xl bg-foreground/10 backdrop-blur text-foreground text-sm">
            Skip in {countdown}s
          </span>
        )}
      </div>
    </div>
  );
};

export default PreRollAd;

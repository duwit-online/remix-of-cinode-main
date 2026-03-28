import { useActiveAds } from "@/hooks/useAds";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsPremium } from "@/hooks/useSubscription";

interface AdBannerProps {
  placement: string;
  className?: string;
}

const AdBanner = ({ placement, className = "" }: AdBannerProps) => {
  const { data: ads } = useActiveAds(placement);
  const { isPremium } = useIsPremium();
  const tracked = useRef<Set<string>>(new Set());

  // Filter to only banner/inline types for display ads
  const displayAds = ads?.filter((a: any) => a.ad_type === "banner" || a.ad_type === "inline") || [];
  const ad = displayAds[0];

  // Track impression
  useEffect(() => {
    if (ad && !tracked.current.has(ad.id)) {
      tracked.current.add(ad.id);
      supabase.from("ads").update({ impressions: (ad.impressions || 0) + 1 } as any).eq("id", ad.id).then(() => {});
    }
  }, [ad]);

  if (!ad || isPremium) return null;

  const handleClick = () => {
    supabase.from("ads").update({ clicks: (ad.clicks || 0) + 1 } as any).eq("id", ad.id).then(() => {});
  };

  if (ad.content_html) {
    return (
      <div
        className={`rounded-xl overflow-hidden ${className}`}
        dangerouslySetInnerHTML={{ __html: ad.content_html }}
        onClick={handleClick}
      />
    );
  }

  if (ad.image_url) {
    const content = (
      <img src={ad.image_url} alt={ad.name} className="w-full rounded-xl object-cover max-h-28" loading="lazy" />
    );
    return ad.link_url ? (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className={`block ${className}`} onClick={handleClick}>{content}</a>
    ) : (
      <div className={className} onClick={handleClick}>{content}</div>
    );
  }

  return null;
};

export default AdBanner;

import { useActiveAds } from "@/hooks/useAds";

interface AdBannerProps {
  placement: string;
  className?: string;
}

const AdBanner = ({ placement, className = "" }: AdBannerProps) => {
  const { data: ads } = useActiveAds(placement);

  if (!ads?.length) return null;
  const ad = ads[0]; // Show highest priority

  if (ad.content_html) {
    return (
      <div
        className={`rounded-xl overflow-hidden ${className}`}
        dangerouslySetInnerHTML={{ __html: ad.content_html }}
      />
    );
  }

  if (ad.image_url) {
    const content = (
      <img src={ad.image_url} alt={ad.name} className="w-full rounded-xl object-cover max-h-24" loading="lazy" />
    );
    return ad.link_url ? (
      <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
    ) : (
      <div className={className}>{content}</div>
    );
  }

  return null;
};

export default AdBanner;

import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_LOGO = "/lovable-uploads/40965317-613a-41b7-bc11-d9e8b6cba9ae.png";

interface SiteLogoProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  fallbackSrc?: string;
}

export function SiteLogo({ src, alt, className, fallbackClassName, fallbackSrc }: SiteLogoProps) {
  const defaultSrc = fallbackSrc || DEFAULT_LOGO;
  const [currentSrc, setCurrentSrc] = useState(src || defaultSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(src || defaultSrc);
    setFailed(false);
  }, [src, defaultSrc]);

  if (failed) {
    return (
      <ImageIcon
        className={cn("shrink-0 opacity-70", fallbackClassName || className)}
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (currentSrc !== defaultSrc) {
          setCurrentSrc(defaultSrc);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}

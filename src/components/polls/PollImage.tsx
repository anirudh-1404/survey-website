"use client";

import { useState } from "react";
import { Vote, Cpu, DollarSign, Globe2, Leaf, Users, HeartPulse } from "lucide-react";

interface PollImageProps {
  imageUrl?: string;
  imageAlt?: string;
  title: string;
  category?: string;
  aspectRatio?: "16/9" | "21/9" | "auto";
  objectFit?: "cover" | "contain";
  className?: string;
  priority?: boolean;
  showOverlay?: boolean;
}

function renderCategoryIcon(category?: string) {
  switch (category) {
    case "Technology & AI":
      return <Cpu className="h-6 w-6 stroke-[1.5]" />;
    case "Global Economy":
      return <DollarSign className="h-6 w-6 stroke-[1.5]" />;
    case "Geopolitics":
      return <Globe2 className="h-6 w-6 stroke-[1.5]" />;
    case "Climate & Energy":
      return <Leaf className="h-6 w-6 stroke-[1.5]" />;
    case "Society & Culture":
      return <Users className="h-6 w-6 stroke-[1.5]" />;
    case "Health & Science":
      return <HeartPulse className="h-6 w-6 stroke-[1.5]" />;
    default:
      return <Vote className="h-6 w-6 stroke-[1.5]" />;
  }
}

export function PollImage({
  imageUrl,
  imageAlt,
  title,
  category,
  aspectRatio = "auto",
  objectFit = "contain",
  className = "",
  priority = false,
  showOverlay = false,
}: PollImageProps) {
  const [hasError, setHasError] = useState(false);

  const isContain = objectFit === "contain" || aspectRatio === "auto";

  const aspectClass =
    aspectRatio === "21/9"
      ? "aspect-[21/9]"
      : aspectRatio === "16/9"
      ? "aspect-[16/9]"
      : "";

  const showImage = Boolean(imageUrl && !hasError);

  return (
    <div
      className={`relative w-full overflow-hidden bg-[#0a0c14] border border-white/10 ${aspectClass} ${
        isContain ? "flex items-center justify-center min-h-[200px]" : ""
      } ${className}`}
    >
      {showImage ? (
        <>
          {/* Ambient blurred backdrop for letterbox areas when using object-contain */}
          {isContain && (
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${imageUrl})` }}
              aria-hidden="true"
            />
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className={`transition-transform duration-300 ${
              isContain
                ? "relative z-10 w-full h-auto max-h-[640px] object-contain mx-auto block"
                : "h-full w-full object-cover"
            }`}
            loading={priority ? "eager" : "lazy"}
            onError={() => setHasError(true)}
          />

          {showOverlay && (
            <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#10121a]/80 via-transparent to-transparent pointer-events-none" />
          )}
        </>
      ) : (
        /* Graceful editorial placeholder when image is absent or fails to load */
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#121420] via-[#0b0d16] to-[#07080e] p-6 text-center select-none">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-rose-400 shadow-inner">
            {renderCategoryIcon(category)}
          </div>
          {category && (
            <span className="mt-2.5 text-[10px] font-bold uppercase tracking-wider text-rose-400/80">
              {category}
            </span>
          )}
          <span className="mt-1 line-clamp-1 max-w-[85%] text-xs font-medium text-zinc-400">
            {title}
          </span>
        </div>
      )}
    </div>
  );
}

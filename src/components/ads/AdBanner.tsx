"use client";

import { useState, useEffect } from "react";
import { Ad, AdPlacement } from "@/types/ad";
import { ExternalLink, Volume2, VolumeX } from "lucide-react";

interface AdBannerProps {
  placement: AdPlacement;
  className?: string;
  initialAd?: Ad | null;
}

export function AdBanner({ placement, className = "", initialAd }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(initialAd || null);
  const [isLoading, setIsLoading] = useState(!initialAd);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (initialAd) return;

    let isMounted = true;
    async function loadActiveAd() {
      try {
        const res = await fetch(`/api/ads?placement=${placement}`);
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.data?.ad) {
          setAd(data.data.ad);
        }
      } catch {
        // Graceful silence if network or ads fail
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadActiveAd();
    return () => {
      isMounted = false;
    };
  }, [placement, initialAd]);

  if (isLoading || !ad) {
    return null; // Clean zero-gap collapse when no ad is active
  }

  const clickUrl = `/api/ads/${ad.id}/click`;

  if (placement === "banner_top") {
    return (
      <aside
        aria-label="Sponsored Announcement"
        className={`w-full bg-[#07080d] border-b border-white/[0.08] ${className}`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2">
          <div className="relative group rounded-xl overflow-hidden border border-white/10 bg-[#0f111a] hover:border-white/20 transition-all shadow-md">
            {/* Sponsored Micro Badge */}
            <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-wider text-zinc-300">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Sponsored</span>
            </div>

            <a
              href={clickUrl}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block relative overflow-hidden"
            >
              {ad.mediaType === "video" ? (
                <div className="relative w-full h-24 sm:h-28 md:h-32 bg-black flex items-center justify-center">
                  <video
                    src={ad.mediaUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsMuted(!isMuted);
                    }}
                    className="absolute bottom-2 left-2 z-20 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm transition-colors"
                    title={isMuted ? "Unmute video" : "Mute video"}
                  >
                    {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              ) : (
                <div className="relative w-full h-20 sm:h-24 md:h-28 bg-[#12141f] flex items-center justify-center">
                  <img
                    src={ad.mediaUrl}
                    alt={ad.altText || ad.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5 sm:p-3">
                <div className="flex items-center justify-between w-full">
                  <div className="min-w-0 pr-4">
                    <p className="text-xs sm:text-sm font-semibold text-white drop-shadow truncate">
                      {ad.title}
                    </p>
                    {ad.sponsorName && (
                      <p className="text-[10px] text-zinc-300 drop-shadow">
                        Presented by {ad.sponsorName}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-bold text-rose-300 group-hover:text-rose-200 transition-colors bg-white/10 group-hover:bg-rose-600/80 px-2.5 py-1 rounded-lg backdrop-blur-md">
                    <span>Learn More</span>
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </aside>
    );
  }

  if (placement === "feed_inline") {
    return (
      <div
        className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0e1018] p-5 hover:border-rose-500/40 hover:shadow-xl hover:shadow-rose-950/20 transition-all ${className}`}
      >
        {/* Top Tag & Sponsor Info */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              Featured Partner
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Ad
          </span>
        </div>

        {/* Media Container */}
        <a
          href={clickUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="mt-3 block relative rounded-xl overflow-hidden border border-white/10 bg-black aspect-video flex items-center justify-center"
        >
          {ad.mediaType === "video" ? (
            <div className="relative w-full h-full">
              <video
                src={ad.mediaUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="absolute bottom-2 left-2 z-20 p-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs backdrop-blur-sm transition-colors"
              >
                {isMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              </button>
            </div>
          ) : (
            <img
              src={ad.mediaUrl}
              alt={ad.altText || ad.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
        </a>

        {/* Ad Title & Action */}
        <div className="mt-3">
          <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors line-clamp-2">
            {ad.title}
          </h4>
          {ad.sponsorName && (
            <p className="mt-1 text-xs text-zinc-400">
              Sponsored by <strong className="text-zinc-200">{ad.sponsorName}</strong>
            </p>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">Verified Sponsor</span>
          <a
            href={clickUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300"
          >
            <span>Visit Site</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  // Generic fallback for sidebar and poll_detail
  return (
    <aside
      aria-label="Sponsored Advertisement"
      className={`relative rounded-xl overflow-hidden border border-white/10 bg-[#0e1018] p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
          Sponsored
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Advertisement</span>
      </div>

      <a
        href={clickUrl}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="block group relative rounded-lg overflow-hidden border border-white/10 bg-black aspect-video"
      >
        {ad.mediaType === "video" ? (
          <video
            src={ad.mediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={ad.mediaUrl}
            alt={ad.altText || ad.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </a>

      <div className="mt-2.5">
        <h4 className="text-xs font-bold text-white line-clamp-1">{ad.title}</h4>
        {ad.sponsorName && (
          <p className="text-[11px] text-zinc-400">Partner: {ad.sponsorName}</p>
        )}
      </div>
    </aside>
  );
}

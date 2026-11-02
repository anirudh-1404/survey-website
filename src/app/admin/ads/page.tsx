"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Megaphone,
  PlusCircle,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Eye,
  MousePointerClick,
  Calendar,
  Layers,
  Image as ImageIcon,
  Video as VideoIcon,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Ad, AdPlacement } from "@/types/ad";
import { toast } from "sonner";

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  banner_top: "Top Banner (Header)",
  feed_inline: "In-Feed Sponsored Card",
  sidebar: "Sidebar Column",
  poll_detail: "Poll Detail Bottom",
};

export default function AdminAdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterPlacement, setFilterPlacement] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAds = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filterPlacement !== "all") params.append("placement", filterPlacement);
      if (filterStatus !== "all") params.append("status", filterStatus);

      const res = await fetch(`/api/admin/ads?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.data?.ads) {
        setAds(data.data.ads);
      } else {
        toast.error("Failed to load ads");
      }
    } catch {
      toast.error("Network error while fetching ads");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, [filterPlacement, filterStatus]);

  const handleToggleStatus = async (ad: Ad) => {
    const nextStatus = ad.status === "active" ? "paused" : "active";
    try {
      setTogglingId(ad.id);
      const res = await fetch(`/api/admin/ads/${ad.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": "verified",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Ad campaign ${nextStatus === "active" ? "resumed" : "paused"}`);
        setAds((prev) =>
          prev.map((item) => (item.id === ad.id ? { ...item, status: nextStatus } : item))
        );
      } else {
        toast.error(data.error?.message || "Failed to update ad status");
      }
    } catch {
      toast.error("Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm("Are you sure you want to permanently delete this ad campaign?")) return;

    try {
      setDeletingId(adId);
      const res = await fetch(`/api/admin/ads/${adId}`, {
        method: "DELETE",
        headers: {
          "x-csrf-token": "verified",
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Ad campaign deleted successfully");
        setAds((prev) => prev.filter((a) => a.id !== adId));
      } else {
        toast.error(data.error?.message || "Failed to delete ad");
      }
    } catch {
      toast.error("Network error deleting ad");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-rose-500" />
            <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
              Monetization & Sponsorships
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ad Campaigns Console
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Control photo and video advertisements, configure placement slots, and track impressions and clicks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchAds}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#10121a] px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/admin/ads/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            Create Ad Campaign
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#0d0f17] p-4 text-xs">
        <span className="text-zinc-400 font-medium">Filter Placements:</span>
        <select
          value={filterPlacement}
          onChange={(e) => setFilterPlacement(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#12141e] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
        >
          <option value="all">All Placement Slots</option>
          <option value="banner_top">Top Banner (Header)</option>
          <option value="feed_inline">In-Feed Sponsored Card</option>
          <option value="sidebar">Sidebar Column</option>
          <option value="poll_detail">Poll Detail Bottom</option>
        </select>

        <span className="text-zinc-400 font-medium ml-2">Status:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#12141e] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="paused">Paused Only</option>
          <option value="expired">Expired</option>
        </select>

        <span className="text-zinc-500 ml-auto">
          {ads.length} {ads.length === 1 ? "campaign" : "campaigns"} total
        </span>
      </div>

      {/* Campaigns Table / Cards */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-white/10 bg-[#10121a]">
          <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          <p className="mt-3 text-xs text-zinc-400">Loading ad campaigns...</p>
        </div>
      ) : ads.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-white/10 bg-[#10121a] text-center">
          <div className="h-12 w-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-rose-500 mb-3">
            <Megaphone className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No ad campaigns found</h3>
          <p className="mt-1 text-xs text-zinc-400 max-w-sm">
            Launch your first sponsored campaign with photo banners or high-impact video reels.
          </p>
          <Link
            href="/admin/ads/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            Create Ad Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {ads.map((ad) => {
            const ctr =
              ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";

            return (
              <div
                key={ad.id}
                className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#10121a] p-4 hover:border-white/20 transition-colors"
              >
                {/* Media Thumbnail & Campaign Info */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="relative h-16 w-24 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                    {ad.mediaType === "video" ? (
                      <div className="relative h-full w-full flex items-center justify-center">
                        <video
                          src={ad.mediaUrl}
                          muted
                          playsInline
                          className="h-full w-full object-cover opacity-75"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <VideoIcon className="h-4 w-4 text-rose-400" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={ad.mediaUrl}
                        alt={ad.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ad.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            ad.status === "active" ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                        {ad.status}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] border border-white/10 text-zinc-300">
                        {PLACEMENT_LABELS[ad.placement] || ad.placement}
                      </span>
                      {ad.sponsorName && (
                        <span className="text-[11px] text-zinc-400 font-medium">
                          by <strong className="text-zinc-200">{ad.sponsorName}</strong>
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 text-sm font-semibold text-white truncate max-w-md">
                      {ad.title}
                    </h3>

                    <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400">
                      <a
                        href={ad.targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-rose-400 hover:underline truncate max-w-xs"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ad.targetUrl}</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="flex items-center gap-6 self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                  <div className="flex items-center gap-4 text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3" /> Views
                      </span>
                      <p className="text-sm font-bold text-white mt-0.5">{ad.impressions}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500 flex items-center justify-center gap-1">
                        <MousePointerClick className="h-3 w-3" /> Clicks
                      </span>
                      <p className="text-sm font-bold text-white mt-0.5">{ad.clicks}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">CTR</span>
                      <p className="text-sm font-bold text-rose-400 mt-0.5">{ctr}%</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(ad)}
                      disabled={togglingId === ad.id}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        ad.status === "active"
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
                      }`}
                      title={ad.status === "active" ? "Pause Ad" : "Activate Ad"}
                    >
                      {ad.status === "active" ? (
                        <>
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          <span>Activate</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(ad.id)}
                      disabled={deletingId === ad.id}
                      className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Delete Campaign"
                    >
                      {deletingId === ad.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

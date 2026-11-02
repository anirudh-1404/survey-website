"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Megaphone,
  Save,
  Loader2,
  AlertCircle,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { AdMediaUploader } from "@/components/admin/AdMediaUploader";
import { AdPlacement, AdMediaType, AdStatus } from "@/types/ad";
import { toast } from "sonner";

export default function AdminNewAdPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [placement, setPlacement] = useState<AdPlacement>("banner_top");
  const [mediaType, setMediaType] = useState<AdMediaType>("image");
  const [mediaUrl, setMediaUrl] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] = useState("");
  const [altText, setAltText] = useState("Sponsored Campaign");
  const [status, setStatus] = useState<AdStatus>("active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim() || title.trim().length < 2) {
      setErrorMessage("Campaign title is required.");
      return;
    }

    if (!mediaUrl.trim()) {
      setErrorMessage(`Please upload or provide an external URL for the ${mediaType} asset.`);
      return;
    }

    if (!targetUrl.trim() || !targetUrl.trim().startsWith("http")) {
      setErrorMessage("A valid destination URL (starting with http:// or https://) is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/ads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": "verified",
        },
        body: JSON.stringify({
          title,
          sponsorName: sponsorName.trim() || undefined,
          targetUrl: targetUrl.trim(),
          placement,
          mediaType,
          mediaUrl: mediaUrl.trim(),
          cloudinaryPublicId: cloudinaryPublicId.trim() || undefined,
          altText: altText.trim(),
          status,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create ad campaign");
      }

      toast.success("Ad campaign launched successfully!");
      router.push("/admin/ads");
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <Link
          href="/admin/ads"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ad Campaigns
        </Link>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-rose-500" />
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            New Campaign Setup
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Campaign Core Details */}
        <div className="rounded-2xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Campaign Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Campaign Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. NextGen AI Summit Promo"
                required
                className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Sponsor Name (Optional)
              </label>
              <input
                type="text"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                placeholder="e.g. Acme Tech Labs"
                className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Destination Click URL <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://sponsorbrand.com/landing-page"
                required
                className="w-full rounded-xl border border-white/10 bg-[#08090d] pl-9 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
              />
              <ExternalLink className="absolute left-3 top-3 h-3.5 w-3.5 text-zinc-500" />
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">
              Users who click the ad will be redirected to this link while securely registering the click.
            </p>
          </div>
        </div>

        {/* Placement & Media Type Configuration */}
        <div className="rounded-2xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Placement & Format
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Target Placement Slot
              </label>
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value as AdPlacement)}
                className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="banner_top">Top Banner (Header / Sub-Navbar)</option>
                <option value="feed_inline">In-Feed Sponsored Card (Homepage / Polls)</option>
                <option value="sidebar">Sidebar Column (Desktop detail views)</option>
                <option value="poll_detail">Poll Detail Bottom (Above discourse)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Media Format (Photo / Video)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMediaType("image");
                    setMediaUrl("");
                    setCloudinaryPublicId("");
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors border ${
                    mediaType === "image"
                      ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                      : "bg-[#08090d] text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  Photo / Graphic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMediaType("video");
                    setMediaUrl("");
                    setCloudinaryPublicId("");
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-colors border ${
                    mediaType === "video"
                      ? "bg-rose-600 text-white border-rose-500 shadow-sm"
                      : "bg-[#08090d] text-zinc-400 border-white/10 hover:text-white"
                  }`}
                >
                  Video Reel (MP4)
                </button>
              </div>
            </div>
          </div>

          {/* Media Asset Uploader */}
          <div className="pt-2">
            <AdMediaUploader
              mediaType={mediaType}
              mediaUrl={mediaUrl}
              cloudinaryPublicId={cloudinaryPublicId}
              onChange={(data) => {
                setMediaUrl(data.mediaUrl);
                if (data.cloudinaryPublicId) setCloudinaryPublicId(data.cloudinaryPublicId);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
              Accessibility Alt Text
            </label>
            <input
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Descriptive label for screen-readers"
              className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Schedule & Status */}
        <div className="rounded-2xl border border-white/10 bg-[#10121a] p-6 space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
            Publishing Schedule & Status
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Initial Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AdStatus)}
                className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="active">Active (Live immediately)</option>
                <option value="paused">Paused (Draft / Inactive)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#08090d] px-3.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/ads"
            className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-zinc-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-rose-500 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Launching Campaign...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Publish Ad Campaign</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

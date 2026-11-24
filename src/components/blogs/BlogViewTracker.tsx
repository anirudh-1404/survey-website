"use client";

import { useEffect } from "react";

interface BlogViewTrackerProps {
  slug: string;
}

/**
 * Invisible client-side component to record real human views for a blog article.
 * Does not render any UI elements.
 * Uses sessionStorage to prevent inflating views upon multiple refreshes in the same session.
 */
export function BlogViewTracker({ slug }: BlogViewTrackerProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !slug) return;
    const sessionKey = `saynow_bv_${slug}`;
    if (!sessionStorage.getItem(sessionKey)) {
      sessionStorage.setItem(sessionKey, "1");
      fetch(`/api/blogs/${encodeURIComponent(slug)}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch(() => {});
    }
  }, [slug]);

  return null;
}


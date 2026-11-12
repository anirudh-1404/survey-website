"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const STORAGE_KEY = "saynow_vid";
    let vid = localStorage.getItem(STORAGE_KEY);
    if (!vid) {
      vid = `vid_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem(STORAGE_KEY, vid);
    }
    return vid;
  } catch {
    return "";
  }
}

export function SiteVisitorTracker() {
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return;
    }

    // Prevent duplicate firing on same path
    if (lastTrackedPath.current === pathname) {
      return;
    }
    lastTrackedPath.current = pathname;

    const visitorId = getOrCreateVisitorId();
    let timezone = "";
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    } catch {
      // ignore
    }

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        visitorId,
        timezone,
      }),
      keepalive: true,
    }).catch(() => {
      // Graceful silent failure for tracking beacons
    });
  }, [pathname]);

  return null;
}

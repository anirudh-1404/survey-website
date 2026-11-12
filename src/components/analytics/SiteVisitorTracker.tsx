"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
      }),
      keepalive: true,
    }).catch(() => {
      // Graceful silent failure for tracking beacons
    });
  }, [pathname]);

  return null;
}

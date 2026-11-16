/**
 * Centralized Canonical Site URL Configuration for SayNow
 *
 * Resolves the base URL using the following priority:
 * 1. process.env.NEXT_PUBLIC_SITE_URL (if not legacy pulse.org)
 * 2. process.env.SITE_URL (if not legacy pulse.org)
 * 3. process.env.NEXT_PUBLIC_APP_URL (if not legacy pulse.org)
 * 4. Fallback production canonical: "https://saynow.in"
 */

export function getSiteUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL;

  if (
    candidate &&
    typeof candidate === "string" &&
    candidate.trim().length > 0 &&
    !candidate.includes("pulse.org")
  ) {
    return candidate.trim().replace(/\/+$/, "");
  }

  // The true canonical production domain for SayNow
  return "https://saynow.in";
}

export const SITE_URL = getSiteUrl();

/**
 * Generate an absolute canonical URL with the configured site base URL.
 * Ensures consistent single-slash routing and trailing-slash normalization.
 *
 * Example:
 *   absoluteUrl("/polls") -> "https://saynow.in/polls"
 *   absoluteUrl("blogs/my-post") -> "https://saynow.in/blogs/my-post"
 *   absoluteUrl("/") -> "https://saynow.in"
 */
export function absoluteUrl(path = ""): string {
  const base = getSiteUrl();
  if (!path || path === "/" || path.trim() === "") {
    return base;
  }
  const cleanPath = path.startsWith("/") ? path.trim() : `/${path.trim()}`;
  return `${base}${cleanPath}`;
}

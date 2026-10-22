/**
 * Validate redirect path to prevent Open Redirect attacks.
 * Only internal relative paths starting with a single '/' are permitted.
 */
export function getSafeRedirectUrl(target: string | null | undefined): string {
  if (!target || typeof target !== "string") return "/";
  const trimmed = target.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.startsWith("/\\") &&
    !trimmed.includes(":")
  ) {
    return trimmed;
  }
  return "/";
}

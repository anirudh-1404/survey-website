/**
 * PULSE — Blog Utility Helpers
 * Pure client-safe functions for slug generation, reading time calculation, and HTML sanitization.
 */

/**
 * Generate a clean URL slug from a title string.
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove non-word characters (except spaces & dashes)
    .replace(/[\s_-]+/g, "-") // Collapse consecutive whitespace or dashes into single dash
    .replace(/^-+|-+$/g, ""); // Trim leading and trailing dashes
}

/**
 * Estimate reading time in minutes based on word count.
 */
export function calculateReadingTime(content: string): number {
  if (!content) return 1;
  const textOnly = content.replace(/<[^>]*>/g, " ");
  const wordCount = textOnly.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Strict server and client-safe sanitizer for rich-text HTML content.
 * Prevents XSS, script injection, and attribute-based vulnerabilities.
 * - Removes script, iframe, object, embed, style, and form tags.
 * - Strips all inline event handlers (onclick, onerror, onload, etc.).
 * - Validates href and src protocols (blocks javascript:, data:, vbscript:).
 */
export function sanitizeRichTextHtml(raw: string): string {
  if (typeof raw !== "string") return "";

  let cleaned = raw
    // 1. Remove dangerous executable tag blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, "");

  // 2. Remove all on* event handler attributes (e.g. onclick, onerror, onload)
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // 3. Remove dangerous protocols from href and src attributes (javascript:, data:, vbscript:)
  cleaned = cleaned.replace(
    /(href|src)\s*=\s*["']?\s*(?:javascript|data|vbscript):[^"'>\s]*/gi,
    '$1="#"'
  );

  // 4. Strip non-printable ASCII control characters
  cleaned = cleaned.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

  return cleaned.trim();
}

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

/**
 * Convert inline markdown (**bold**, __bold__, *italic*, _italic_, `code`, [text](url))
 * in a plain-text segment (never called on HTML tag attributes).
 */
function convertInlineMarkdown(text: string): string {
  return text
    .replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    )
    .replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+?)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[\s(])_([^_]+?)_(?=[\s).,!?;:]|$)/g, "$1<em>$2</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

/**
 * Apply inline markdown conversion only to text outside HTML tags and <pre>/<code> blocks.
 */
function applyInlineMarkdownOutsideTags(html: string): string {
  const parts = html.split(/(<[^>]+>)/g);
  let skipDepth = 0;

  return parts
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) {
        if (/^<(?:pre|code|script|style)\b/i.test(part) && !/\/>$/.test(part)) {
          skipDepth++;
        } else if (/^<\/(?:pre|code|script|style)\b/i.test(part) && skipDepth > 0) {
          skipDepth--;
        }
        return part;
      }
      return skipDepth > 0 ? part : convertInlineMarkdown(part);
    })
    .join("");
}

/**
 * Convert block-level markdown (headings, lists, blockquotes, paragraphs) into HTML.
 */
function formatBlockMarkdownToHtml(raw: string): string {
  const normalized = raw.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";

  const hasNewlines = normalized.includes("\n");
  if (!hasNewlines) {
    // Split dense single-wall text (>= 4 sentences) into readable 2-3 sentence paragraphs
    const sentences = normalized.match(/[^.!?]+[.!?]+(?:\s|$)/g);
    if (sentences && sentences.length >= 4) {
      const paragraphs: string[] = [];
      const chunkSize = sentences.length > 6 ? 3 : 2;
      for (let i = 0; i < sentences.length; i += chunkSize) {
        const slice = sentences.slice(i, i + chunkSize).join(" ").trim();
        if (slice) paragraphs.push(`<p>${slice}</p>`);
      }
      return paragraphs.join("\n");
    }
    return `<p>${normalized}</p>`;
  }

  const lines = normalized.split("\n");
  const blocks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i++;
      continue;
    }

    // Headings (#, ##, ###)
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length >= 3 ? 3 : 2;
      blocks.push(`<h${level}>${headingMatch[2].trim()}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote (> ...)
    if (/^>\s+/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s+/.test(lines[i].trim())) {
        quoteLines.push(lines[i].trim().replace(/^>\s+/, ""));
        i++;
      }
      blocks.push(`<blockquote><p>${quoteLines.join(" ")}</p></blockquote>`);
      continue;
    }

    // Unordered list (- item, * item, • item)
    if (/^[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(`<li>${lines[i].trim().replace(/^[-*•]\s+/, "")}</li>`);
        i++;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list (1. item)
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${lines[i].trim().replace(/^\d+\.\s+/, "")}</li>`);
        i++;
      }
      blocks.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Regular paragraph (collect consecutive non-empty, non-block lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(?:#{1,3}\s+|>\s+|[-*•]\s+|\d+\.\s+)/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i].trim());
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push(`<p>${paraLines.join(" ")}</p>`);
    }
  }

  return blocks.join("\n");
}

/**
 * Render editorial content safely to sanitized HTML, supporting:
 * - Full HTML from RichTextEditor
 * - Pure Markdown / plain text
 * - Mixed HTML + inline Markdown (e.g. <p>**bold** text</p>)
 */
export function renderEditorialHtml(raw: string): string {
  if (typeof raw !== "string" || !raw.trim()) return "";

  const hasBlockHtml = /<(?:p|h[1-6]|ul|ol|li|blockquote|div|figure|section|article|table|pre)\b/i.test(
    raw
  );

  const htmlWithBlocks = hasBlockHtml ? raw : formatBlockMarkdownToHtml(raw);
  const htmlWithInlineMarkdown = applyInlineMarkdownOutsideTags(htmlWithBlocks);

  return sanitizeRichTextHtml(htmlWithInlineMarkdown);
}

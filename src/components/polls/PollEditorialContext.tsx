"use client";

import { useMemo } from "react";
import {
  Sparkles,
  Clock,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  Compass,
  FileCheck,
} from "lucide-react";
import { renderEditorialHtml, calculateReadingTime } from "@/lib/blog-utils";

interface PollEditorialContextProps {
  context: string;
  sourceReference?: string;
  editorialNote?: string;
  category?: string;
}

interface ParsedCitation {
  raw: string;
  publisher?: string;
  title: string;
  url?: string;
}

/**
 * Smartly parse source references into structured citations.
 * Handles single references, bulleted lists, and concatenated sources (e.g. Gartner - ... Forrester - ...).
 */
function parseCitations(raw?: string): ParsedCitation[] {
  if (!raw || !raw.trim()) return [];

  const text = raw.trim();

  // Split by newlines or semicolons first
  let parts: string[] = [];
  if (text.includes("\n")) {
    parts = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  } else if (text.includes(";")) {
    parts = text.split(/;\s*/).map((p) => p.trim()).filter(Boolean);
  } else {
    // Check for common multi-citation formats like "Gartner - ... . Forrester - ... . McKinsey - ..."
    const multiCitationRegex = /\.\s+(?=[A-Z0-9][a-zA-Z0-9&.\s]{1,24}\s*[-–—:])/g;
    if (multiCitationRegex.test(text)) {
      parts = text.split(/\.\s+(?=[A-Z0-9][a-zA-Z0-9&.\s]{1,24}\s*[-–—:])/).map((p) => p.trim()).filter(Boolean);
    } else {
      parts = [text];
    }
  }

  return parts.map((part) => {
    // Strip leading "Reference:" or "Source:" or bullet points
    let clean = part.replace(/^(?:Reference|Source|Sources|Citations?)\s*:\s*/i, "").replace(/^[-•*]\s*/, "").trim();

    // Check for URL inside text
    const urlMatch = clean.match(/(https?:\/\/[^\s]+)/i);
    const url = urlMatch ? urlMatch[1] : undefined;

    // Check if there is a publisher/organization prefix like "Gartner - ..." or "McKinsey: ..."
    let publisher: string | undefined = undefined;
    let title = clean;

    const dashMatch = clean.match(/^([A-Za-z0-9&.\s]{2,30})\s*[-–—:]\s*(.+)$/);
    if (dashMatch) {
      publisher = dashMatch[1].trim();
      title = dashMatch[2].trim();
    }

    return {
      raw: clean,
      publisher,
      title: title || clean,
      url,
    };
  });
}

export function PollEditorialContext({
  context,
  sourceReference,
  editorialNote,
  category,
}: PollEditorialContextProps) {
  const readingTime = useMemo(() => calculateReadingTime(context), [context]);

  const sanitizedContent = useMemo(
    () => renderEditorialHtml(context),
    [context]
  );

  const citations = useMemo(
    () => parseCitations(sourceReference),
    [sourceReference]
  );

  return (
    <section
      aria-label="Editorial Context & Analysis"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121526] via-[#0f111d] to-[#090b12] shadow-2xl transition-all"
    >
      {/* Top Rose Accent Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/80 to-transparent" />

      {/* Decorative Glow */}
      <div
        className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-rose-600/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="p-6 sm:p-8 space-y-6">
        {/* Editorial Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-300">
              <Sparkles className="h-3 w-3 text-rose-400" />
              <span>Editorial Context & Analytical Background</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 font-mono text-zinc-400">
              <Clock className="h-3.5 w-3.5 text-zinc-400" />
              <span>~{readingTime} min read</span>
            </div>
            <span className="text-zinc-600">•</span>
            <div className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400/90">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Fact-Checked</span>
            </div>
          </div>
        </div>

        {/* Optional Editorial Note / Deliberation Framing Banner */}
        {editorialNote && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-4 text-xs text-rose-200/90 flex items-start gap-3">
            <Compass className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 block mb-0.5">
                Editorial Deliberation Framing
              </span>
              <p className="leading-relaxed text-zinc-300">{editorialNote}</p>
            </div>
          </div>
        )}

        {/* Main Editorial Text Body */}
        <div
          className="prose prose-invert max-w-none text-[15px] sm:text-base leading-[1.8] text-zinc-200 space-y-4
          [&>p]:leading-[1.8] [&>p]:text-zinc-300 [&>p]:mb-4
          [&>h2]:text-xl sm:[&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-6 [&>h2]:mb-3 [&>h2]:tracking-tight [&>h2]:border-b [&>h2]:border-white/5 [&>h2]:pb-2
          [&>h3]:text-lg sm:[&>h3]:text-xl [&>h3]:font-bold [&>h3]:text-zinc-100 [&>h3]:mt-5 [&>h3]:mb-2
          [&>strong]:font-semibold [&>strong]:text-white
          [&>b]:font-semibold [&>b]:text-white
          [&>em]:italic [&>em]:text-zinc-200
          [&>i]:italic [&>i]:text-zinc-200
          [&>u]:underline [&>u]:underline-offset-4 [&>u]:decoration-rose-500/50
          [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ul]:my-4 [&>ul>li]:text-zinc-300 [&>ul>li]:leading-relaxed [&>ul>li::marker]:text-rose-400
          [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:space-y-2 [&>ol]:my-4 [&>ol>li]:text-zinc-300 [&>ol>li]:leading-relaxed [&>ol>li::marker]:text-rose-400
          [&>blockquote]:border-l-4 [&>blockquote]:border-rose-500 [&>blockquote]:bg-rose-950/20 [&>blockquote]:pl-4 [&>blockquote]:pr-4 [&>blockquote]:py-3 [&>blockquote]:my-4 [&>blockquote]:italic [&>blockquote]:text-zinc-200 [&>blockquote]:rounded-r-xl
          [&>a]:text-rose-400 hover:[&>a]:text-rose-300 [&>a]:underline [&>a]:underline-offset-4 [&>a]:transition-colors
          [&>figure]:my-6 [&>figure>img]:rounded-xl [&>figure>img]:border [&>figure>img]:border-white/10 [&>figure>figcaption]:text-center [&>figure>figcaption]:text-xs [&>figure>figcaption]:text-zinc-500 [&>figure>figcaption]:mt-2"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />

        {/* Structured Citations & Primary References */}
        {citations.length > 0 && (
          <div className="pt-6 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wider uppercase text-zinc-400">
                <BookOpen className="h-3.5 w-3.5 text-rose-500" />
                <span>Authoritative Sourcing & Primary Citations</span>
              </div>
              <span className="rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-mono text-zinc-400">
                {citations.length} {citations.length === 1 ? "Citation" : "Citations"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {citations.map((cite, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/5 bg-[#0a0c14] p-3 sm:p-3.5 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-white/15 transition-colors group"
                >
                  <div className="flex items-start gap-2.5">
                    <FileCheck className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      {cite.publisher && (
                        <span className="inline-block rounded bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300 uppercase tracking-wider mr-2">
                          {cite.publisher}
                        </span>
                      )}
                      <span className="text-zinc-200 font-medium leading-relaxed">
                        {cite.title}
                      </span>
                    </div>
                  </div>

                  {cite.url && (
                    <a
                      href={cite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-400 hover:text-rose-300 whitespace-nowrap self-start sm:self-auto shrink-0 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Verify Source</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

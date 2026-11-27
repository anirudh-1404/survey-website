export type SupportedLanguage = "all" | "en" | "hi" | "pa";

export interface LanguageOption {
  id: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "all", label: "All Languages", nativeLabel: "All" },
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { id: "pa", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ" },
];

/**
 * Unicode literal ranges for MongoDB PCRE / JavaScript regex:
 * - Devanagari (Hindi, Marathi, Nepali): [ऀ-ॿ] (U+0900 to U+097F)
 * - Gurmukhi (Punjabi): [਀-੿] (U+0A00 to U+0A7F)
 */
export const HINDI_REGEX_STR = "[ऀ-ॿ]";
export const PUNJABI_REGEX_STR = "[਀-੿]";
export const INDIC_REGEX_STR = "[ऀ-ॿ਀-੿]";

/**
 * Detect language from text using Unicode character ranges.
 */
export function detectLanguage(text?: string): "en" | "hi" | "pa" {
  if (!text) return "en";
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

/**
 * Get language of an item, either from explicit property or detected from title.
 */
export function getItemLanguage(item: { language?: string; title?: string }): "en" | "hi" | "pa" {
  if (item.language === "en" || item.language === "hi" || item.language === "pa") {
    return item.language;
  }
  return detectLanguage(item.title);
}

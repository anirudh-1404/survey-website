/**
 * Content moderation engine for PULSE Live Chat.
 * Detects abusive language, profanity (English & Hindi/Hinglish), adult terms,
 * and violence/crime-related keywords.
 */

export interface ModerationResult {
  isFlagged: boolean;
  category?: "abusive" | "adult" | "crime" | "hate_speech";
  flaggedWords: string[];
  reason?: string;
}

// Regex patterns for sensitive/inappropriate categories
const ABUSIVE_PATTERNS = [
  // English vulgarities
  /\b(fuck|fucking|fucker|f\*ck|shit|bitch|bastard|asshole|dick|pussy|cunt|slut|whore|motherfucker|cock)\b/i,
  // Hindi / Hinglish abusive terms
  /\b(chutiya|chutiye|chutye|bhosdike|bhosadike|bsdk|bhenchod|behenchod|bc|madarchod|madarchodh|mc|gandu|gaand|harami|kameene|kutta|lauda|laude|lund|lodu|randi|raand|chod|chodna|chudva|bhadwa|bhadwe|saale)\b/i,
];

const ADULT_PATTERNS = [
  /\b(porn|porno|pornography|xxx|nude|nudes|nudity|sex|blowjob|handjob|boobs|boobies|masturbat\w*)\b/i,
];

const CRIME_PATTERNS = [
  /\b(murder|kill you|assassinate|terrorist|terrorism|bomb blast|bombing|suicide|rape|rapist|kidnap|kidnapping|shoot you|lynch|genocide|extortion|drug cartel|narcotics)\b/i,
];

/**
 * Scan raw content and determine if it should be shielded behind a translucent safety overlay.
 */
export function checkContentModeration(text: string): ModerationResult {
  if (!text || typeof text !== "string") {
    return { isFlagged: false, flaggedWords: [] };
  }

  const normalized = text.toLowerCase().trim();
  const flaggedWords: string[] = [];
  let category: ModerationResult["category"];
  let reason: string | undefined;

  // 1. Check Crime / Violence patterns (highest priority)
  for (const pattern of CRIME_PATTERNS) {
    const match = normalized.match(pattern);
    if (match) {
      flaggedWords.push(match[0]);
      category = "crime";
      reason = "Message contains violence or crime-related references.";
      break;
    }
  }

  // 2. Check Abusive / Profanity patterns
  if (!category) {
    for (const pattern of ABUSIVE_PATTERNS) {
      const match = normalized.match(pattern);
      if (match) {
        flaggedWords.push(match[0]);
        category = "abusive";
        reason = "Message contains abusive or offensive language.";
        break;
      }
    }
  }

  // 3. Check Adult / Explicit patterns
  if (!category) {
    for (const pattern of ADULT_PATTERNS) {
      const match = normalized.match(pattern);
      if (match) {
        flaggedWords.push(match[0]);
        category = "adult";
        reason = "Message contains sexually explicit or adult content.";
        break;
      }
    }
  }

  return {
    isFlagged: flaggedWords.length > 0,
    category,
    flaggedWords,
    reason,
  };
}

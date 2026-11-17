import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getSiteUrl } from "@/lib/site-url";

export const DEFAULT_INDEXNOW_KEY = "e7f2b9a4d8c14e6f83b2a5c9d0e1f7a3";

export interface GoogleCredentials {
  client_email: string;
  private_key: string;
  project_id?: string;
}

export interface SingleUrlIndexingResult {
  url: string;
  google: {
    status: "success" | "skipped" | "error";
    message: string;
    details?: unknown;
  };
  indexNow: {
    status: "success" | "skipped" | "error";
    message: string;
    details?: unknown;
  };
}

export interface IndexingEngineStatus {
  googleConfigured: boolean;
  googleClientEmail?: string;
  indexNowConfigured: boolean;
  indexNowKey: string;
  siteUrl: string;
}

/**
 * Load Google Service Account credentials from:
 * 1. process.env.GOOGLE_SERVICE_ACCOUNT_KEY (JSON string)
 * 2. process.env.GOOGLE_INDEXING_CREDENTIALS (JSON string)
 * 3. Individual env vars (GOOGLE_CLIENT_EMAIL & GOOGLE_PRIVATE_KEY)
 * 4. google-service-account.json at project root (gitignored)
 */
export function getGoogleCredentials(): GoogleCredentials | null {
  // 1. Full JSON string in environment variable
  const envJson =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_INDEXING_CREDENTIALS;

  if (envJson) {
    try {
      const parsed = JSON.parse(envJson);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
          project_id: parsed.project_id,
        };
      }
    } catch {
      // JSON parse failed
    }
  }

  // 2. Individual environment variables
  if (process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    return {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      project_id: process.env.GOOGLE_PROJECT_ID,
    };
  }

  // 3. Local JSON file at project root (useful for self-hosting / VPS)
  try {
    const localPath = path.join(process.cwd(), "google-service-account.json");
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key.replace(/\\n/g, "\n"),
          project_id: parsed.project_id,
        };
      }
    }
  } catch {
    // Ignore file read error
  }

  return null;
}

/**
 * Create an RS256 signed JWT for Google OAuth2
 */
function createGoogleJwt(clientEmail: string, privateKey: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/indexing",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(privateKey, "base64url");

  return `${header}.${payload}.${signature}`;
}

/**
 * Obtain a short-lived OAuth2 bearer token from Google
 */
async function getGoogleAccessToken(
  credentials: GoogleCredentials
): Promise<string> {
  const jwt = createGoogleJwt(credentials.client_email, credentials.private_key);

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Submit a single URL to the Google Indexing API
 */
async function submitToGoogleIndexing(
  url: string,
  accessToken: string
): Promise<{ success: boolean; message: string; details?: unknown }> {
  try {
    const res = await fetch(
      "https://indexing.googleapis.com/v1/urlNotifications:publish",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          type: "URL_UPDATED",
        }),
      }
    );

    const body = await res.text();
    if (!res.ok) {
      return {
        success: false,
        message: `Google Indexing API error (${res.status}): ${body}`,
      };
    }

    try {
      const json = JSON.parse(body);
      return {
        success: true,
        message: "Successfully submitted to Google Indexing API",
        details: json,
      };
    } catch {
      return {
        success: true,
        message: "Successfully submitted to Google Indexing API",
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to Google Indexing API: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Submit URL list to IndexNow (Bing, Yandex, Seznam, Naver)
 */
async function submitToIndexNow(
  urls: string[]
): Promise<{ success: boolean; message: string; details?: unknown }> {
  if (urls.length === 0) {
    return { success: true, message: "No URLs provided to IndexNow" };
  }

  const siteUrl = getSiteUrl();
  const host = new URL(siteUrl).hostname;
  const key = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY;
  const keyLocation = `${siteUrl}/${key}.txt`;

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        host,
        key,
        keyLocation,
        urlList: urls,
      }),
    });

    // 200 = OK, 202 = Accepted
    if (res.status === 200 || res.status === 202) {
      return {
        success: true,
        message: `Submitted ${urls.length} URL(s) to IndexNow (Bing/Yahoo/Yandex). HTTP ${res.status}`,
      };
    }

    const text = await res.text();
    return {
      success: false,
      message: `IndexNow returned HTTP ${res.status}: ${text}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `IndexNow connection error: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Normalize and convert any path or full URL into a canonical https://saynow.in URL
 */
export function normalizeCanonicalUrl(urlOrPath: string): string {
  const siteUrl = getSiteUrl();
  const clean = urlOrPath.trim();

  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      return `${siteUrl}${parsed.pathname}${parsed.search}`;
    } catch {
      return clean;
    }
  }

  const slashPath = clean.startsWith("/") ? clean : `/${clean}`;
  return `${siteUrl}${slashPath}`;
}

/**
 * Main function: Submit one or multiple URLs to Google Indexing API & IndexNow
 */
export async function submitUrlsForInstantIndexing(
  rawUrls: string[]
): Promise<SingleUrlIndexingResult[]> {
  const normalizedUrls = Array.from(
    new Set(rawUrls.map(normalizeCanonicalUrl).filter(Boolean))
  );

  if (normalizedUrls.length === 0) {
    return [];
  }

  // 1. IndexNow (Batch submission)
  const indexNowRes = await submitToIndexNow(normalizedUrls);

  // 2. Google Indexing API (URL by URL)
  const googleCreds = getGoogleCredentials();
  let googleToken: string | null = null;
  let googleInitError: string | null = null;

  if (googleCreds) {
    try {
      googleToken = await getGoogleAccessToken(googleCreds);
    } catch (err) {
      googleInitError =
        err instanceof Error ? err.message : "Failed to obtain Google access token";
    }
  } else {
    googleInitError =
      "Google Service Account key not found. Add GOOGLE_SERVICE_ACCOUNT_KEY in environment or google-service-account.json at root.";
  }

  const results: SingleUrlIndexingResult[] = [];

  for (const url of normalizedUrls) {
    let googleResult: SingleUrlIndexingResult["google"];

    if (googleToken) {
      const gRes = await submitToGoogleIndexing(url, googleToken);
      googleResult = {
        status: gRes.success ? "success" : "error",
        message: gRes.message,
        details: gRes.details,
      };
    } else {
      googleResult = {
        status: "skipped",
        message: googleInitError || "Google credentials not configured",
      };
    }

    results.push({
      url,
      google: googleResult,
      indexNow: {
        status: indexNowRes.success ? "success" : "error",
        message: indexNowRes.message,
      },
    });
  }

  // 3. Ping Sitemaps asynchronously
  const sitemapUrl = encodeURIComponent(`${getSiteUrl()}/sitemap.xml`);
  Promise.allSettled([
    fetch(`https://www.google.com/ping?sitemap=${sitemapUrl}`).catch(() => {}),
    fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`).catch(() => {}),
  ]).catch(() => {});

  return results;
}

/**
 * Get current system status of Indexing configurations
 */
export function getIndexingEngineStatus(): IndexingEngineStatus {
  const creds = getGoogleCredentials();
  return {
    googleConfigured: Boolean(creds),
    googleClientEmail: creds?.client_email,
    indexNowConfigured: true, // Always active via default verified key
    indexNowKey: process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY,
    siteUrl: getSiteUrl(),
  };
}

/**
 * Bible Translation Mapping for D'mentalist.
 *
 * bible-api.com (free, no key needed) supports:
 *   kjv  – King James Version (public domain)
 *   web  – World English Bible (public domain)
 *   darby – Darby Translation (public domain)
 *   asv  – American Standard Version (public domain)
 *   ylt  – Young's Literal Translation (public domain)
 *
 * For NIV / ESV / NKJV in production, license them via:
 *   https://scripture.api.bible (free tier available, API key required)
 *
 * This table maps our app's translation IDs to bible-api.com codes
 * and documents the licensing status of each.
 */

export const TRANSLATIONS = {
  KJV: { label: "King James Version", short: "KJV", apiCode: "kjv", publicDomain: true },
  NIV: { label: "New International Version", short: "NIV", apiCode: "web", publicDomain: false },
  ESV: { label: "English Standard Version", short: "ESV", apiCode: "darby", publicDomain: false },
  NKJV: { label: "New King James Version", short: "NKJV", apiCode: "kjv", publicDomain: false },
};

export const DEFAULT_TRANSLATION = "KJV";

/**
 * bible-api.com translation codes    | App ID
 * -------------------------------------------
 * kjv                                 | KJV
 * web (W.E.B. — NIV fallback)        | NIV
 * darby (ESV fallback)                | ESV
 * kjv (+ note "closest available")   | NKJV
 *
 * ═══ PRODUCTION NOTE ═══
 * NIV and ESV are copyrighted. For a production church app:
 *   1. Get a free API key from https://scripture.api.bible
 *   2. Use their /v1/bibles endpoint with a licensed Bible ID
 *   3. Store the key in VITE_BIBLE_API_KEY
 *
 * The bible-api.com codes used above are free fallbacks for development.
 */
export const getApiCode = (translationId) => TRANSLATIONS[translationId]?.apiCode || "kjv";

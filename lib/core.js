// Core shared logic: token signing, quota, prompt building.
// Runs in Cloudflare Pages Functions (Workers runtime) and Node >= 18 (tests).

const enc = new TextEncoder();

function b64url(bytes) {
  let s = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function hmac(data, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(data));
}

/** Sign a Pro token. payload must include exp (unix seconds). */
export async function signToken(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(await hmac(body, secret));
  return `${body}.${sig}`;
}

/** Verify a Pro token. Returns payload or null (bad signature / expired). */
export async function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  const expected = b64url(await hmac(body, secret));
  if (sig !== expected) return null;
  let payload;
  try { payload = JSON.parse(b64urlDecode(body)); } catch { return null; }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

export const FREE_MONTHLY_LIMIT = 5;

/** Free-tier gate. count = replies already used this month. */
export function quotaExceeded(count, isPro) {
  if (isPro) return false;
  return Number(count) >= FREE_MONTHLY_LIMIT;
}

const TONES = {
  professional: { en: "professional and courteous", pt: "profissional e cordial" },
  warm:         { en: "warm and personal",          pt: "caloroso e pessoal" },
  direct:       { en: "brief and to the point",     pt: "breve e direto ao ponto" },
};

/** Build the LLM prompt. Throws on invalid input (money path: bad input must not burn API credits). */
export function buildPrompt({ review, tone = "professional", lang = "en", businessName = "" }) {
  if (!review || typeof review !== "string" || review.trim().length < 5) {
    throw new Error("invalid_review");
  }
  if (review.length > 4000) throw new Error("review_too_long");
  const t = TONES[tone] || TONES.professional;
  const language = lang === "pt" ? "Brazilian Portuguese" : "English";
  const toneDesc = lang === "pt" ? t.pt : t.en;
  const biz = businessName ? businessName.slice(0, 80) : "";
  return [
    `You write replies that a small local business owner posts publicly to customer reviews.`,
    `Write 3 distinct reply options in ${language}, tone: ${toneDesc}.`,
    biz ? `Business name: ${biz}.` : ``,
    `Rules: never admit legal liability; never offer compensation unless the review asks;`,
    `thank the reviewer; if negative, acknowledge briefly and invite offline contact; max 80 words each;`,
    `no emojis unless the review uses them; output ONLY the 3 replies separated by "---".`,
    ``,
    `Review:\n"""${review.trim()}"""`,
  ].filter(Boolean).join("\n");
}

/** Parse the model output into up to 3 replies. */
export function parseReplies(text) {
  return String(text).split(/\n?---\n?/).map(s => s.trim()).filter(Boolean).slice(0, 3);
}

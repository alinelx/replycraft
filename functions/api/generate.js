// POST /api/generate  — generates 3 review replies.
// Body: { review, tone, lang, businessName, usedCount, proToken }
// Env vars: ANTHROPIC_API_KEY, TOKEN_SECRET
import { verifyToken, quotaExceeded, buildPrompt, parseReplies } from "../../lib/core.js";

const MODEL = "claude-haiku-4-5-20251001"; // cheapest adequate model; cost ≈ €0.001/request

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  const pro = await verifyToken(body.proToken, env.TOKEN_SECRET);

  // NOTE: usedCount comes from the client (localStorage). This is soft enforcement —
  // acceptable at MVP: the cost of an abused free call is ~€0.001. Hard enforcement
  // (KV per-IP counters) is in BACKLOG.md.
  if (quotaExceeded(body.usedCount ?? 0, !!pro)) {
    return json({ error: "quota", upgrade: true }, 402);
  }

  let prompt;
  try {
    prompt = buildPrompt(body);
  } catch (e) {
    return json({ error: e.message }, 400);
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) return json({ error: "llm_unavailable" }, 502);
  const data = await res.json();
  const replies = parseReplies(data?.content?.[0]?.text ?? "");
  if (!replies.length) return json({ error: "llm_empty" }, 502);
  return json({ replies, pro: !!pro });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

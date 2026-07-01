// GET /api/verify?session_id=cs_...        — after Stripe Checkout: issue Pro token
// GET /api/verify?subscription_id=sub_...  — token renewal: re-check subscription is active
// Env vars: STRIPE_SECRET_KEY, TOKEN_SECRET
import { signToken } from "../../lib/core.js";

const TOKEN_DAYS = 33; // monthly sub + grace; client renews via subscription_id

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  const subId = url.searchParams.get("subscription_id");

  let subscription;
  if (sessionId) {
    const s = await stripe(env, `checkout/sessions/${sessionId}`);
    if (!s || s.payment_status !== "paid" || !s.subscription) {
      return json({ error: "not_paid" }, 402);
    }
    subscription = typeof s.subscription === "string" ? s.subscription : s.subscription.id;
  } else if (subId) {
    const sub = await stripe(env, `subscriptions/${subId}`);
    if (!sub || !["active", "trialing"].includes(sub.status)) {
      return json({ error: "inactive" }, 402);
    }
    subscription = sub.id;
  } else {
    return json({ error: "missing_param" }, 400);
  }

  const exp = Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400;
  const token = await signToken({ sub: subscription, exp }, env.TOKEN_SECRET);
  return json({ token, subscription, exp });
}

async function stripe(env, path) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    headers: { authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Money-path tests: token auth, quota gate, prompt validation, reply parsing.
// Run: node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { signToken, verifyToken, quotaExceeded, buildPrompt, parseReplies, FREE_MONTHLY_LIMIT } from "../lib/core.js";

const SECRET = "test-secret";
const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

test("valid Pro token round-trips", async () => {
  const token = await signToken({ sub: "sub_123", exp: future }, SECRET);
  const payload = await verifyToken(token, SECRET);
  assert.equal(payload.sub, "sub_123");
});

test("expired token is rejected", async () => {
  const token = await signToken({ sub: "sub_123", exp: past }, SECRET);
  assert.equal(await verifyToken(token, SECRET), null);
});

test("tampered token is rejected", async () => {
  const token = await signToken({ sub: "sub_123", exp: future }, SECRET);
  const [body] = token.split(".");
  const forgedBody = body.slice(0, -2) + "xx";
  assert.equal(await verifyToken(`${forgedBody}.${token.split(".")[1]}`, SECRET), null);
});

test("token signed with wrong secret is rejected", async () => {
  const token = await signToken({ sub: "sub_123", exp: future }, "other-secret");
  assert.equal(await verifyToken(token, SECRET), null);
});

test("garbage tokens are rejected without throwing", async () => {
  for (const bad of [null, undefined, "", "abc", "a.b", 42]) {
    assert.equal(await verifyToken(bad, SECRET), null);
  }
});

test("free quota blocks at the limit, Pro never blocks", () => {
  assert.equal(quotaExceeded(0, false), false);
  assert.equal(quotaExceeded(FREE_MONTHLY_LIMIT - 1, false), false);
  assert.equal(quotaExceeded(FREE_MONTHLY_LIMIT, false), true);
  assert.equal(quotaExceeded(9999, true), false);
});

test("prompt rejects empty/short/huge reviews (protects API spend)", () => {
  assert.throws(() => buildPrompt({ review: "" }), /invalid_review/);
  assert.throws(() => buildPrompt({ review: "ok" }), /invalid_review/);
  assert.throws(() => buildPrompt({ review: "x".repeat(4001) }), /review_too_long/);
});

test("prompt includes language, tone and business name", () => {
  const p = buildPrompt({ review: "Comida ótima, entrega atrasou.", tone: "warm", lang: "pt", businessName: "Padaria Estrela" });
  assert.match(p, /Brazilian Portuguese/);
  assert.match(p, /caloroso/);
  assert.match(p, /Padaria Estrela/);
  const e = buildPrompt({ review: "Great food, slow delivery." });
  assert.match(e, /English/);
});

test("unknown tone falls back to professional instead of failing", () => {
  const p = buildPrompt({ review: "Great service overall!", tone: "sarcastic" });
  assert.match(p, /professional and courteous/);
});

test("parseReplies splits on --- and caps at 3", () => {
  const out = parseReplies("Reply A\n---\nReply B\n---\nReply C\n---\nReply D");
  assert.deepEqual(out, ["Reply A", "Reply B", "Reply C"]);
  assert.deepEqual(parseReplies(""), []);
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  MIN_CLICK_GAP_MS,
  NOOP_COOLDOWN_MS,
  earliestAvailability,
  isLoopbackEndpoint,
  pacingGate,
  parseExpect,
  parseProductIds,
} from "../tools/cdp-cart.mjs";

test("accepts only loopback http CDP endpoints", () => {
  assert.equal(isLoopbackEndpoint("http://127.0.0.1:9222"), true);
  assert.equal(isLoopbackEndpoint("http://localhost:9222"), true);
  assert.equal(isLoopbackEndpoint("http://[::1]:9222"), true);
  assert.equal(isLoopbackEndpoint("http://192.168.1.2:9222"), false);
  assert.equal(isLoopbackEndpoint("http://0.0.0.0:9222"), false);
  assert.equal(isLoopbackEndpoint("not a url"), false);
});

test("reads exact item and SKU IDs from product URLs and --expect", () => {
  assert.deepEqual(parseProductIds("https://www.lazada.sg/products/i301098923-s527128205.html"), { item_id: "301098923", sku_id: "527128205" });
  assert.deepEqual(parseProductIds("https://www.lazada.sg//products/beef-i301098923-s527128205.html?urlFlag=true"), { item_id: "301098923", sku_id: "527128205" });
  assert.equal(parseProductIds("https://www.lazada.sg/products/i301098923.html"), null);
  assert.deepEqual(parseExpect("i301098923-s527128205"), { item_id: "301098923", sku_id: "527128205" });
  assert.equal(parseExpect("301098923-527128205"), null);
});

test("classifies the earliest Product Availability date", () => {
  const today = new Date(2026, 9, 18);
  assert.deepEqual(earliestAvailability(["Today", "18 Oct", "Mon", "19 Oct"], today), {
    label: "Today",
    date: "18 Oct",
    days_away: 0,
    within_two_days: true,
  });
  assert.equal(earliestAvailability(["Thu", "22 Oct"], today).within_two_days, false);
  assert.equal(earliestAvailability(["Fri", "1 Jan"], new Date(2026, 11, 30)).days_away, 2);
  assert.equal(earliestAvailability(["No dates"], today), null);
});

test("pacing enforces a click gap, a cooldown after no-ops, and a hand-back", () => {
  const now = 1_000_000;
  const fresh = { last_click_at: 0, blocked_at: null, retried_after_cooldown: false, hand_back: false };
  assert.deepEqual(pacingGate(fresh, now), { allowed: true, wait_ms: 0 });
  assert.equal(pacingGate({ ...fresh, last_click_at: now - 500 }, now).wait_ms, MIN_CLICK_GAP_MS - 500);
  assert.equal(pacingGate({ ...fresh, blocked_at: now - 1000 }, now).allowed, false);
  assert.equal(pacingGate({ ...fresh, blocked_at: now - NOOP_COOLDOWN_MS - 1 }, now).allowed, true);
  assert.equal(pacingGate({ ...fresh, hand_back: true }, now).allowed, false);
});

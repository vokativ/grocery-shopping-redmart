#!/usr/bin/env node
// Refresh FairPrice prices for every article_id in the catalog mapping, one API lookup per article.
// Writes a bare JSON array snapshot (see experiments/fairprice/snapshots/2026-11-17/fairprice-prices.json).
// Read-only public API calls, at most one request per --delay-ms (default 1100 ms). No browser. See docs/fairprice/site-structure.md section 7.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const USAGE = `Usage: node experiments/fairprice/fetch-prices.mjs --out <snapshot.json>
         [--mapping experiments/fairprice/catalog-mapping.yaml] [--store-id 165] [--delay-ms 1100]`;

const API = "https://website-api.omni.fairprice.com.sg/api/product/v2";
const DEFAULT_MAPPING = new URL("catalog-mapping.yaml", import.meta.url);
const DEFAULT_STORE_ID = "165";
const DEFAULT_DELAY_MS = 1100;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 20_000;
const SGT_OFFSET = "+08:00";
// Basket/category threshold offers never describe a unit price; they are counted and dropped.
const BASKET_OFFER_TYPES = new Set(["BMIN", "BMINXGFG"]);

// ---------------------------------------------------------------- pure row building

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const round2 = (value) => Math.round(value * 100) / 100;

// Offer windows are Asia/Singapore local 'YYYY-MM-DD HH:MM:SS'. Date-only values resolve to start of day, or end of day when endOfDay (same rule as compare.mjs).
function parseSgt(value, endOfDay = false) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?$/.exec(value.trim());
  if (!match) return null;
  const clock = match[2] ? (match[2].length === 5 ? `${match[2]}:00` : match[2]) : endOfDay ? "23:59:59" : "00:00:00";
  const ms = Date.parse(`${match[1]}T${clock}${SGT_OFFSET}`);
  return Number.isNaN(ms) ? null : ms;
}

// A missing/blank bound is open-ended; a present but unparseable bound makes the whole offer unusable (dropped).
function offerWindowContains(offer, nowMs) {
  const blank = (value) => value === null || value === undefined || value === "";
  const from = blank(offer.validFrom) ? null : parseSgt(offer.validFrom);
  const till = blank(offer.validTill) ? null : parseSgt(offer.validTill, true);
  if ((!blank(offer.validFrom) && from === null) || (!blank(offer.validTill) && till === null)) return false;
  if (from !== null && from > nowMs) return false;
  if (till !== null && till < nowMs) return false;
  return true;
}

// Units required by a BXATP offer: rule.buy is keyed by internal product id, each value {q}.
function bxatpBuyQty(offer, productId) {
  const buy = offer.rule?.buy;
  if (!buy || typeof buy !== "object") return null;
  const entry = productId !== undefined && productId !== null && buy[productId] ? buy[productId] : Object.values(buy)[0];
  return toNumber(entry?.q);
}

// Total price for buy_qty units under a bundle offer; null when the rule type is not understood.
function bundleTotal(offer, buyQty, mrp) {
  if (buyQty === 1 && toNumber(offer.price) !== null) return toNumber(offer.price);
  const total = offer.rule?.total;
  const value = toNumber(total?.v);
  if (value === null) return null;
  if (total.t === "FIXED") return value;
  if (total.t === "ABSOLUTE_OFF" && mrp !== null && buyQty !== null) return round2(mrp * buyQty - value);
  return null;
}

function toOffer(offer, product, mrp) {
  const buyQty = offer.type === "BXATP" ? bxatpBuyQty(offer, product.id) : null;
  const quantity = offer.type === "BANYATP" ? toNumber(offer.rule?.quantity) : null;
  const count = buyQty ?? quantity;
  return {
    type: offer.type ?? null,
    description: offer.description ?? null,
    price: toNumber(offer.price),
    buy_qty: buyQty,
    total: count === null ? null : bundleTotal(offer, count, mrp),
    quantity,
    valid_from: offer.validFrom ?? null,
    valid_till: offer.validTill ?? null,
  };
}

// Row for an article with no product data: found false = valid empty lookup, found null = fetch failed (notes say why).
function emptyRow(articleId, found, fetchedAt, notes) {
  const row = {
    article_id: String(articleId),
    found,
    slug: null,
    name: null,
    brand: null,
    display_unit: null,
    mrp_sgd: null,
    discount_sgd: null,
    stock: null,
    stock_scale: null,
    inventory_type: null,
    offers: [],
    single_unit_price_sgd: null,
    bmin_offers_dropped: 0,
    expired_offers_dropped: 0,
    fetched_at: fetchedAt,
  };
  if (notes) row.notes = notes;
  return row;
}

// Snapshot row for a lookup that failed after retries; found: null keeps it distinct from found: false.
export function toFetchErrorRow(articleId, notes, now = new Date()) {
  return emptyRow(articleId, null, now.toISOString(), notes);
}

// Build one snapshot row from an API product (the entry whose clientItemId equals articleId), or a not-found row when product is null.
// Never uses final_price or has_stock: both are unreliable (site-structure section 7).
export function toSnapshotRow(product, articleId, now = new Date()) {
  const fetchedAt = now.toISOString();
  const id = String(articleId);
  if (!product) return emptyRow(id, false, fetchedAt);

  const store = product.storeSpecificData?.[0] ?? {};
  const mrp = toNumber(store.mrp);
  const nowMs = now.getTime();
  const offers = [];
  let bminDropped = 0;
  let expiredDropped = 0;
  for (const offer of product.offers ?? []) {
    if (BASKET_OFFER_TYPES.has(offer.type)) {
      bminDropped += 1;
      continue;
    }
    if (!offerWindowContains(offer, nowMs)) {
      expiredDropped += 1;
      continue;
    }
    offers.push(toOffer(offer, product, mrp));
  }

  // Single-unit BXATP promo price replaces mrp as the unit price; the lowest one wins if several are live.
  let singleUnit = mrp;
  for (const offer of offers) {
    if (offer.type === "BXATP" && offer.buy_qty === 1 && offer.price !== null && offer.price > 0 && (singleUnit === null || offer.price < singleUnit)) {
      singleUnit = offer.price;
    }
  }

  return {
    article_id: id,
    found: true,
    slug: product.slug ?? null,
    name: product.name ?? null,
    brand: product.brand?.name ?? null,
    display_unit: product.metaData?.DisplayUnit ?? null,
    mrp_sgd: mrp,
    discount_sgd: toNumber(store.discount),
    stock: toNumber(store.stock),
    stock_scale: store.stockScale ?? null,
    inventory_type: store.inventoryType ?? null,
    offers,
    single_unit_price_sgd: singleUnit === null ? null : round2(singleUnit),
    bmin_offers_dropped: bminDropped,
    expired_offers_dropped: expiredDropped,
    fetched_at: fetchedAt,
  };
}

// The q=<article_id> search returns the product and sometimes unrelated rows; select by exact clientItemId.
export function pickProduct(payload, articleId) {
  const products = payload?.data?.product;
  if (!Array.isArray(products)) return null;
  return products.find((product) => String(product?.clientItemId) === String(articleId)) ?? null;
}

export function mappingArticleIds(mapping) {
  const ids = new Set();
  for (const entry of mapping?.mappings ?? []) {
    for (const candidate of entry.fairprice ?? []) {
      if (candidate?.article_id !== undefined && candidate.article_id !== null) ids.add(String(candidate.article_id));
    }
  }
  return [...ids];
}

// ---------------------------------------------------------------- network

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

export function lookupUrl(articleId, storeId) {
  const params = new URLSearchParams({ pageType: "search", orderType: "DELIVERY", storeId: String(storeId), page: "1", includeTagDetails: "true", q: String(articleId) });
  return `${API}?${params}`;
}

export const MALFORMED_NOTE = "malformed response";

class MalformedResponseError extends Error {
  constructor() {
    super(MALFORMED_NOTE);
    this.name = "MalformedResponseError";
  }
}

// A 200 whose body lacks data.product as an array is a soft failure (throttled or degraded), not a "not found": it is retried like any fetch error.
export async function fetchProduct(articleId, storeId, delayMs) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(lookupUrl(articleId, storeId), {
        headers: { accept: "application/json", "user-agent": "Mozilla/5.0 (household price check; 1 request/second)" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const payload = await response.json().catch(() => null);
        if (!Array.isArray(payload?.data?.product)) throw new MalformedResponseError();
        return pickProduct(payload, articleId);
      }
      lastError = new Error(`HTTP ${response.status}`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_ATTEMPTS) await sleep(delayMs * attempt * 2);
  }
  throw lastError;
}

// One snapshot row per article: a malformed response that survives the retries is recorded as found: null; other failures still throw.
export async function fetchSnapshotRow(articleId, storeId, delayMs) {
  try {
    return toSnapshotRow(await fetchProduct(articleId, storeId, delayMs), articleId);
  } catch (error) {
    if (error instanceof MalformedResponseError) return toFetchErrorRow(articleId, MALFORMED_NOTE);
    throw error;
  }
}

// ---------------------------------------------------------------- args and main

function parseArgs(argv) {
  const args = { out: null, mapping: null, storeId: DEFAULT_STORE_ID, delayMs: DEFAULT_DELAY_MS };
  const flags = { "--out": "out", "--mapping": "mapping", "--store-id": "storeId", "--delay-ms": "delayMs" };
  for (let index = 0; index < argv.length; index += 1) {
    const key = flags[argv[index]];
    if (!key) throw new Error(`Unknown argument: ${argv[index]}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${argv[index]} requires a value`);
    args[key] = value;
    index += 1;
  }
  if (!args.out) throw new Error("Missing --out");
  if (!/^\d+$/.test(String(args.storeId))) throw new Error("--store-id must be a number");
  args.delayMs = Number(args.delayMs);
  if (!Number.isFinite(args.delayMs) || args.delayMs < 0) throw new Error("--delay-ms must be a non-negative number");
  return args;
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${USAGE}`);
    return 1;
  }
  const mappingPath = args.mapping ? resolve(args.mapping) : DEFAULT_MAPPING;
  const mapping = parse(await readFile(mappingPath, "utf8"));
  const ids = mappingArticleIds(mapping);
  if (ids.length === 0) {
    console.error("Error: mapping has no fairprice article_id values");
    return 1;
  }

  const rows = [];
  const failures = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    if (index > 0) await sleep(args.delayMs);
    try {
      rows.push(await fetchSnapshotRow(id, args.storeId, args.delayMs));
    } catch (error) {
      failures.push(`${id}: ${error.message}`);
    }
    if ((index + 1) % 25 === 0) console.error(`${index + 1}/${ids.length} looked up`);
  }

  await writeFile(resolve(args.out), `${JSON.stringify(rows, null, 2)}\n`);
  const found = rows.filter((row) => row.found === true).length;
  const malformed = rows.filter((row) => row.found === null).length;
  console.log(`Articles: ${ids.length}; found: ${found}; not found: ${rows.length - found - malformed}; malformed responses: ${malformed}; request failures: ${failures.length}`);
  console.log(`Offers dropped: ${rows.reduce((sum, row) => sum + row.bmin_offers_dropped, 0)} BMIN, ${rows.reduce((sum, row) => sum + row.expired_offers_dropped, 0)} expired or with unparseable dates`);
  console.log(`Wrote ${args.out}`);
  if (malformed) console.error(`Malformed responses recorded as found: null (not eligible as fetch_error): ${malformed}`);
  if (failures.length) console.error(`Failed lookups (absent from the snapshot):\n${failures.join("\n")}`);
  return failures.length || malformed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}

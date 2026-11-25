#!/usr/bin/env node
// Read-only static price check of every RedMart preferred product. Plain HTTP GETs of the public
// product pages: no cookies, no login, no cart access. Requests run one at a time with a random pause.
import { accessSync, constants, existsSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadCatalog, validateCatalog } from "./catalog.mjs";
import { platformOf } from "./platforms/index.mjs";
import { describeCatalog, resolveCatalog } from "./resolve-catalog.mjs";

export const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0 Safari/537.36";
const MAX_CONSECUTIVE_CHALLENGES = 2;
const REQUEST_TIMEOUT_MS = 30_000;

const USAGE = `Usage: node tools/fetch-redmart-prices.mjs --out <snapshot.json> [--catalog <path>] [--delay-min 3] [--delay-max 5]`;

function parseArgs(argv) {
  const args = { out: null, catalog: undefined, delayMin: 3, delayMax: 5 };
  const seconds = (flag, value) => {
    const number = Number(value);
    if (value === undefined || value === "" || !Number.isFinite(number) || number < 0) {
      throw new Error(`${flag} needs a non-negative number of seconds`);
    }
    return number;
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--out" || flag === "--catalog") {
      const value = argv[(index += 1)];
      if (!value) throw new Error(`${flag} needs a path`);
      if (flag === "--out") args.out = value;
      else args.catalog = value;
    } else if (flag === "--delay-min") args.delayMin = seconds(flag, argv[(index += 1)]);
    else if (flag === "--delay-max") args.delayMax = seconds(flag, argv[(index += 1)]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!args.out) throw new Error("--out is required");
  if (args.delayMin > args.delayMax) throw new Error("--delay-min cannot exceed --delay-max");
  return args;
}

const isoWithOffset = (date = new Date()) => date.toISOString().replace("Z", "+00:00");

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** pdpTrackingData is a JSON string literal holding JSON; tolerate an inline object too. */
function extractTrackingData(html) {
  const match = html.match(/pdpTrackingData\s*=\s*("(?:[^"\\]|\\.)*"|\{[^;]*\})/);
  if (!match) return null;
  try {
    let value = JSON.parse(match[1]);
    if (typeof value === "string") value = JSON.parse(value);
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function extractAvailability(html) {
  const patterns = [
    /itemprop=["']availability["'][^>]*?(?:href|content)=["']([^"']+)["']/i,
    /(?:href|content)=["']([^"']+)["'][^>]*?itemprop=["']availability["']/i,
    /"availability"\s*:\s*"([^"]+)"/i
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].split("/").pop();
  }
  return null;
}

const IN_STOCK = new Set(["InStock", "InStoreOnly", "OnlineOnly", "LimitedAvailability", "PreOrder"]);
const OUT_OF_STOCK = new Set(["OutOfStock", "SoldOut", "Discontinued"]);

function stockFromAvailability(availability) {
  if (IN_STOCK.has(availability)) return true;
  if (OUT_OF_STOCK.has(availability)) return false;
  return null;
}

function parsePrice(raw) {
  if (raw === undefined || raw === null) return null;
  const match = String(raw).replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function htmlTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim() : null;
}

const CHALLENGE_MARKERS = /punish|x5secdata|_____tmd_____/i;
// HTTP-level blocks count like a body challenge toward the consecutive-stop.
const BLOCKED_HTTP = (status) => status === 403 || status === 429 || (Number.isInteger(status) && status >= 500);

/**
 * Pure parser for one fetched product page.
 * `status` is the HTTP status, `url` the final response URL; `expected` ({itemId, skuId}) defaults to the
 * ids in `url`. Returns the page-derived snapshot fields: status, title_live, price_sgd, in_stock, notes, ...
 */
export function parseRedMartProductHtml(html, { status = null, url = "", expected } = {}) {
  const body = typeof html === "string" ? html : "";
  const urlIds = String(url).match(/i(\d+)-s(\d+)\.html/);
  const wantItem = expected?.itemId !== undefined ? String(expected.itemId) : urlIds?.[1];
  const wantSku = expected?.skuId !== undefined ? String(expected.skuId) : urlIds?.[2];

  const tracking = extractTrackingData(body);
  const availability = extractAvailability(body);
  const result = {
    status: "error",
    http: status,
    title_live: null,
    live_item_id: null,
    live_sku_id: null,
    pdt_price_raw: null,
    price_sgd: null,
    schema_availability: availability,
    in_stock: stockFromAvailability(availability),
    notes: ""
  };

  if (status === 404) return { ...result, status: "unavailable", notes: "HTTP 404" };

  if (!tracking) {
    const title = htmlTitle(body);
    if (/no longer available/i.test(title ?? "") || /no longer available/i.test(body)) {
      return { ...result, title_live: title, status: "unavailable", notes: "page says the product is no longer available" };
    }
    if (BLOCKED_HTTP(status)) return { ...result, in_stock: null, status: "challenge", notes: `http ${status}` };
    const markerInResponse = CHALLENGE_MARKERS.test(body) || CHALLENGE_MARKERS.test(String(url));
    if (markerInResponse || (/captcha/i.test(body) && !title)) {
      return { ...result, in_stock: null, status: "challenge", notes: "Baxia/captcha challenge page; no product data" };
    }
    return { ...result, title_live: title, notes: "pdpTrackingData not found" };
  }

  const title = tracking.pdt_name ? String(tracking.pdt_name) : htmlTitle(body);
  result.title_live = title;
  result.live_item_id = tracking.pdt_sku === undefined ? null : String(tracking.pdt_sku);
  result.live_sku_id = tracking.pdt_simplesku === undefined ? null : String(tracking.pdt_simplesku);
  result.pdt_price_raw = tracking.pdt_price === undefined ? null : String(tracking.pdt_price);
  result.price_sgd = parsePrice(tracking.pdt_price);

  if (/no longer available/i.test(title ?? "")) {
    return { ...result, status: "unavailable", notes: "title says the product is no longer available" };
  }
  if ((wantItem && result.live_item_id !== wantItem) || (wantSku && result.live_sku_id !== wantSku)) {
    return {
      ...result,
      status: "identity_mismatch",
      notes: `page is i${result.live_item_id}-s${result.live_sku_id}, expected i${wantItem}-s${wantSku}`
    };
  }
  if (result.price_sgd === null || !(result.price_sgd > 0)) {
    return { ...result, notes: `price is not a positive number: ${JSON.stringify(result.pdt_price_raw)}` };
  }

  return { ...result, status: "ok", notes: availability ? `schema=${availability}` : "no schema.org availability on page" };
}

export function catalogProducts(catalog) {
  return catalog.items.flatMap((item) =>
    [...item.preferred_products]
      .sort((left, right) => left.rank - right.rank)
      .map((product) => ({ catalog_item_id: item.id, ...product }))
  );
}

function baseRow(product) {
  return {
    catalog_item_id: product.catalog_item_id,
    rank: product.rank,
    item_id: String(product.item_id),
    sku_id: String(product.sku_id),
    canonical_url: product.canonical_url,
    title_catalog: product.title,
    title_live: null,
    pack_size_catalog: product.pack_size ?? null,
    observed_price_sgd: product.observed_price_sgd ?? null,
    price_sgd: null,
    in_stock: null,
    status: "error",
    http: null,
    fetched_at: isoWithOffset(),
    notes: ""
  };
}

const defaultSleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

/**
 * Fetch products strictly one at a time. `fetchFn`, `sleepFn` and `random` are injectable for tests.
 * Stops after two consecutive challenges (including HTTP 403/429/5xx); the remaining products are recorded
 * as not fetched. An aborted `signal` ends the run early with the rest recorded as interrupted.
 */
export async function collectSnapshot(products, options = {}) {
  const { fetchFn = fetch, sleepFn = defaultSleep, random = Math.random, delayMin = 3, delayMax = 5, onRow, signal } = options;
  const rows = [];
  let consecutiveChallenges = 0;
  let stopped = false;
  let interrupted = false;
  const abortedPromise = new Promise((resolve) => {
    if (signal?.aborted) resolve();
    else signal?.addEventListener("abort", resolve, { once: true });
  });

  for (const [index, product] of products.entries()) {
    const row = baseRow(product);
    if (!interrupted && signal?.aborted) interrupted = true;
    if (interrupted) {
      rows.push({ ...row, notes: "not fetched: interrupted" });
      continue;
    }
    if (stopped) {
      rows.push({ ...row, notes: "not fetched: stopped after challenge" });
      continue;
    }
    if (index > 0) {
      await Promise.race([sleepFn(Math.round((delayMin + random() * (delayMax - delayMin)) * 1000)), abortedPromise]);
      if (signal?.aborted) {
        interrupted = true;
        rows.push({ ...row, notes: "not fetched: interrupted" });
        continue;
      }
    }

    row.fetched_at = isoWithOffset();
    try {
      const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
      const response = await fetchFn(product.canonical_url, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout
      });
      const parsed = parseRedMartProductHtml(await response.text(), {
        status: response.status,
        url: response.url || product.canonical_url,
        expected: { itemId: product.item_id, skuId: product.sku_id }
      });
      Object.assign(row, {
        status: parsed.status,
        http: parsed.http,
        title_live: parsed.title_live,
        price_sgd: parsed.price_sgd,
        in_stock: parsed.in_stock,
        notes: parsed.notes,
        pdt_price_raw: parsed.pdt_price_raw,
        schema_availability: parsed.schema_availability,
        live_item_id: parsed.live_item_id,
        live_sku_id: parsed.live_sku_id
      });
    } catch (error) {
      if (signal?.aborted) {
        interrupted = true;
        row.notes = "not fetched: interrupted";
      } else row.notes = `fetch failed: ${error?.cause?.code ?? error?.message ?? error}`;
    }

    rows.push(row);
    if (interrupted) continue;
    onRow?.(row);
    consecutiveChallenges = row.status === "challenge" ? consecutiveChallenges + 1 : 0;
    if (consecutiveChallenges >= MAX_CONSECUTIVE_CHALLENGES) stopped = true;
  }
  return { rows, stopped, interrupted };
}

export function summarizeSnapshot(rows) {
  const counts = {};
  for (const row of rows) counts[row.status] = (counts[row.status] ?? 0) + 1;
  const changes = rows
    .filter((row) => row.status === "ok" && row.observed_price_sgd !== null && Math.round(row.price_sgd * 100) !== Math.round(row.observed_price_sgd * 100))
    .map((row) => ({
      catalog_item_id: row.catalog_item_id,
      rank: row.rank,
      from: row.observed_price_sgd,
      to: row.price_sgd
    }));
  return { counts, changes };
}

function checkOutputPath(out) {
  const directory = dirname(resolve(out));
  let stats;
  try {
    stats = statSync(directory);
  } catch {
    throw new Error(`--out directory does not exist: ${directory}`);
  }
  if (!stats.isDirectory()) throw new Error(`--out parent is not a directory: ${directory}`);
  try {
    accessSync(directory, constants.W_OK);
    if (existsSync(out)) accessSync(out, constants.W_OK);
  } catch {
    throw new Error(`--out is not writable: ${out}`);
  }
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
    checkOutputPath(args.out);
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${USAGE}`);
    process.exit(1);
  }

  let resolved;
  try {
    resolved = resolveCatalog({ flag: args.catalog });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  const catalog = await loadCatalog(resolved.path);
  const errors = validateCatalog(catalog);
  if (errors.length) throw new Error(`Catalog is invalid:\n${errors.join("\n")}`);
  if (platformOf(catalog) !== "redmart") {
    console.error(`Error: this tool only fetches RedMart prices; ${describeCatalog(resolved)} declares platform "${platformOf(catalog)}"`);
    process.exit(1);
  }
  console.log(`Catalog: ${describeCatalog(resolved)}`);

  // The first SIGINT/SIGTERM stops the run and still writes the partial snapshot; a second one kills the process.
  const controller = new AbortController();
  let exitCodeForSignal = 0;
  for (const [name, code] of [["SIGINT", 130], ["SIGTERM", 143]]) {
    process.once(name, () => {
      exitCodeForSignal = code;
      console.error(`Received ${name}; writing the partial snapshot…`);
      controller.abort();
    });
  }

  const products = catalogProducts(catalog);
  console.error(`Checking ${products.length} RedMart products one at a time (read-only, ${args.delayMin}-${args.delayMax}s apart)…`);
  const { rows, stopped, interrupted } = await collectSnapshot(products, {
    delayMin: args.delayMin,
    delayMax: args.delayMax,
    signal: controller.signal,
    onRow: (row) => console.error(`  ${row.catalog_item_id} #${row.rank}: ${row.status}${row.price_sgd === null ? "" : ` $${row.price_sgd.toFixed(2)}`}`)
  });
  await writeFile(args.out, `${JSON.stringify(rows, null, 2)}\n`);

  const { counts, changes } = summarizeSnapshot(rows);
  console.log(`Wrote ${rows.length} rows to ${args.out}`);
  console.log(`Status: ${Object.entries(counts).map(([status, count]) => `${status}=${count}`).join(", ")}`);
  if (changes.length) {
    console.log("Price changes vs catalog observed_price_sgd:");
    for (const change of changes) {
      console.log(`  ${change.catalog_item_id} #${change.rank}: ${change.from.toFixed(2)} → ${change.to.toFixed(2)}`);
    }
  } else console.log("No price changes vs catalog observed_price_sgd.");
  if (stopped) {
    console.error("Stopped after 2 consecutive challenges; remaining products were not fetched. Do not retry until a human has cleared the challenge.");
    process.exitCode = 3;
  }
  if (interrupted) {
    console.error("Interrupted; remaining products were not fetched.");
    process.exitCode = exitCodeForSignal || 130;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

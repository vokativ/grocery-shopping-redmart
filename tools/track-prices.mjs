#!/usr/bin/env node
// Record a RedMart price snapshot: append to price-history.csv and refresh observed_price_sgd /
// observed_price_date in grocery-catalog.yaml, editing YAML nodes in place so nothing else changes.
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Scalar, parseDocument } from "yaml";
import { isCalendarDate, mergePriceHistory, readPriceHistory, writePriceHistory } from "./price-history.mjs";

const USAGE = `Usage: node tools/track-prices.mjs --redmart <snapshot.json> [--catalog grocery-catalog.yaml]
         [--history price-history.csv] [--date YYYY-MM-DD] [--dry-run]`;

// These options reproduce the repository catalog byte for byte when nothing changed.
const STRINGIFY_OPTIONS = { lineWidth: 0, flowCollectionPadding: false };
const DEFAULT_CATALOG = new URL("../grocery-catalog.yaml", import.meta.url);
const DEFAULT_HISTORY = new URL("../price-history.csv", import.meta.url);

function parseArgs(argv) {
  const args = { redmart: null, catalog: fileURLToPath(DEFAULT_CATALOG), history: fileURLToPath(DEFAULT_HISTORY), date: null, dryRun: false };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--dry-run") args.dryRun = true;
    else if (flag === "--redmart" || flag === "--catalog" || flag === "--history" || flag === "--date") {
      const value = argv[(index += 1)];
      if (!value) throw new Error(`${flag} needs a value`);
      args[flag.slice(2)] = value;
    } else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!args.redmart) throw new Error("--redmart is required");
  if (args.date !== null && !isCalendarDate(args.date)) throw new Error("--date must be a real YYYY-MM-DD calendar date");
  return args;
}

const singaporeDate = (instant) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);

const cents = (price) => Math.round(price * 100);
const money = (price) => price.toFixed(2);
const signed = (value, digits = 2) => `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(digits)}`;

function snapshotDate(rows) {
  const times = rows.map((row) => Date.parse(row.fetched_at)).filter(Number.isFinite);
  if (!times.length) throw new Error("Snapshot has no parseable fetched_at; pass --date YYYY-MM-DD");
  return singaporeDate(new Date(Math.max(...times)));
}

function setScalar(map, key, value, configure) {
  const node = map.get(key, true);
  if (node instanceof Scalar) {
    node.value = value;
    configure(node);
    return node;
  }
  const created = new Scalar(value);
  configure(created);
  map.set(key, created);
  return created;
}

/** Sum of the first-ranked product's price times default_quantity over all items. */
function catalogValue(catalog) {
  let total = 0;
  for (const item of catalog.items) {
    const first = [...item.preferred_products].sort((left, right) => left.rank - right.rank)[0];
    if (Number.isFinite(first?.observed_price_sgd)) total += first.observed_price_sgd * item.default_quantity;
  }
  return total;
}

/**
 * Apply an ok-status RedMart snapshot to a parsed catalog document (mutated in place).
 * Returns the history rows, per-product changes and the rows that could not be applied.
 */
export function applySnapshot(doc, snapshot, date) {
  const before = doc.toJS();
  const valueBefore = catalogValue(before);

  const wanted = new Map();
  for (const row of snapshot) wanted.set(JSON.stringify([row.catalog_item_id, Number(row.rank), String(row.item_id), String(row.sku_id)]), row);

  const historyRows = [];
  const changes = [];
  const matched = new Set();
  const notRefreshed = [];

  before.items.forEach((item, itemIndex) => {
    item.preferred_products.forEach((product, productIndex) => {
      const key = JSON.stringify([item.id, product.rank, String(product.item_id), String(product.sku_id)]);
      const row = wanted.get(key);
      if (!row) {
        notRefreshed.push({ id: item.id, rank: product.rank, reason: "not in snapshot" });
        return;
      }
      matched.add(key);
      if (row.status !== "ok") {
        notRefreshed.push({ id: item.id, rank: product.rank, reason: `snapshot status ${row.status}` });
        return;
      }
      if (!Number.isFinite(row.price_sgd) || row.price_sgd <= 0) {
        notRefreshed.push({ id: item.id, rank: product.rank, reason: `invalid snapshot price ${JSON.stringify(row.price_sgd)}` });
        return;
      }

      const historyRow = {
        date,
        store: "redmart",
        catalog_item_id: item.id,
        rank: product.rank,
        product_id: `i${product.item_id}-s${product.sku_id}`,
        title: row.title_live || row.title_catalog || product.title,
        pack_size: product.pack_size ?? "",
        price_sgd: row.price_sgd,
        source: "redmart-static-page"
      };
      // Never move the catalog backwards: an older snapshot still lands in the history only.
      if (typeof product.observed_price_date === "string" && product.observed_price_date > date) {
        historyRows.push(historyRow);
        notRefreshed.push({ id: item.id, rank: product.rank, reason: "older snapshot, catalog kept" });
        return;
      }

      const map = doc.getIn(["items", itemIndex, "preferred_products", productIndex], true);
      const old = product.observed_price_sgd;
      const changed = !Number.isFinite(old) || cents(old) !== cents(row.price_sgd);
      if (changed) setScalar(map, "observed_price_sgd", Math.round(row.price_sgd * 100) / 100, (node) => { node.minFractionDigits = 2; });
      const dateNode = map.get("observed_price_date", true);
      if (dateNode instanceof Scalar) {
        if (dateNode.value !== date) setScalar(map, "observed_price_date", date, (node) => { node.type = Scalar.QUOTE_DOUBLE; });
      } else {
        const pair = doc.createPair("observed_price_date", new Scalar(date));
        pair.value.type = Scalar.QUOTE_DOUBLE;
        const at = map.items.findIndex((candidate) => candidate.key?.value === "observed_price_sgd");
        if (at === -1) map.items.push(pair);
        else map.items.splice(at + 1, 0, pair);
      }

      if (changed) changes.push({ id: item.id, rank: product.rank, old: Number.isFinite(old) ? old : null, new: row.price_sgd });
      historyRows.push(historyRow);
    });
  });

  const skipped = [...wanted.entries()]
    .filter(([key]) => !matched.has(key))
    .map(([, row]) => ({ id: row.catalog_item_id, rank: row.rank, item_id: row.item_id, sku_id: row.sku_id, status: row.status }));

  return { historyRows, changes, skipped, notRefreshed, valueBefore, valueAfter: catalogValue(doc.toJS()) };
}

export function formatReport(result, { date, dryRun }) {
  const lines = [`RedMart price tracking for ${date}${dryRun ? " — DRY RUN (no files written)" : ""}`, ""];
  const unchanged = result.historyRows.length - result.changes.length;
  const up = result.changes.filter((change) => change.old !== null && change.new > change.old).length;
  const down = result.changes.filter((change) => change.old !== null && change.new < change.old).length;

  if (result.changes.length) {
    lines.push("Price changes:");
    for (const change of result.changes) {
      if (change.old === null) lines.push(`  ${change.id} #${change.rank}: (none) → ${money(change.new)}`);
      else {
        const delta = change.new - change.old;
        const percent = change.old === 0 ? 0 : (delta / change.old) * 100;
        lines.push(`  ${change.id} #${change.rank}: ${money(change.old)} → ${money(change.new)} (${signed(delta)}, ${signed(percent, 1)}%)`);
      }
    }
    lines.push("");
  }
  lines.push(`Recorded ${result.historyRows.length} products: ${up} up, ${down} down, ${unchanged} unchanged.`);
  if (result.notRefreshed.length) {
    lines.push(`Not refreshed (${result.notRefreshed.length}):`);
    for (const entry of result.notRefreshed) lines.push(`  ${entry.id} #${entry.rank}: ${entry.reason}`);
  }
  if (result.skipped.length) {
    lines.push(`Skipped, no longer in the catalog (${result.skipped.length}):`);
    for (const entry of result.skipped) lines.push(`  ${entry.id} #${entry.rank} i${entry.item_id}-s${entry.sku_id} (${entry.status})`);
  }
  const delta = result.valueAfter - result.valueBefore;
  const percent = result.valueBefore === 0 ? 0 : (delta / result.valueBefore) * 100;
  lines.push(
    `Full-catalog value at default quantities (first-ranked products): ${money(result.valueBefore)} → ${money(result.valueAfter)} (${signed(delta)}, ${signed(percent, 1)}%)`
  );
  return lines.join("\n");
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${USAGE}`);
    process.exit(1);
  }

  const snapshot = JSON.parse(await readFile(args.redmart, "utf8"));
  if (!Array.isArray(snapshot)) throw new Error(`${args.redmart} must contain a JSON array`);
  const date = args.date ?? snapshotDate(snapshot);

  const source = await readFile(args.catalog, "utf8");
  const doc = parseDocument(source);
  if (doc.errors.length) throw new Error(`Catalog YAML is invalid:\n${doc.errors.join("\n")}`);

  // Read and validate the history and compute every output before touching any file.
  const existingHistory = readPriceHistory(args.history);
  const result = applySnapshot(doc, snapshot, date);
  const merged = mergePriceHistory(existingHistory, result.historyRows, { replaceDateStore: true });
  const catalogOutput = doc.toString(STRINGIFY_OPTIONS);
  console.log(formatReport(result, { date, dryRun: args.dryRun }));
  if (args.dryRun) return;

  // Stage both files next to their targets, then rename, so a write failure cannot leave them out of sync.
  const staged = [];
  try {
    const historyTemp = `${args.history}.tmp-${process.pid}`;
    staged.push(historyTemp);
    writePriceHistory(historyTemp, merged);
    let catalogTemp = null;
    if (catalogOutput !== source) {
      catalogTemp = `${args.catalog}.tmp-${process.pid}`;
      staged.push(catalogTemp);
      await writeFile(catalogTemp, catalogOutput);
    }
    await rename(historyTemp, args.history);
    if (catalogTemp) await rename(catalogTemp, args.catalog);
  } finally {
    await Promise.all(staged.map((path) => rm(path, { force: true })));
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

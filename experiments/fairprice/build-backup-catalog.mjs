#!/usr/bin/env node
// Build the FairPrice BACKUP CATALOG from the catalog mapping plus a fresh FairPrice price snapshot.
// Reference only: the household decided not to shop FairPrice, so no shopping tool reads the output.
// Pure computation over local files: no network, no browser. Eligibility mirrors experiments/fairprice/compare.mjs.
import { readFile, writeFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Document, parse, visit } from "yaml";
import { mergePriceHistory, readPriceHistory, writePriceHistory } from "../../tools/price-history.mjs";

const USAGE = `Usage: node experiments/fairprice/build-backup-catalog.mjs --fairprice <snapshot.json>
         [--mapping experiments/fairprice/catalog-mapping.yaml] [--catalog grocery-catalog.yaml]
         [--out experiments/fairprice/backup-catalog.yaml] [--history price-history.csv]`;

const REPO_ROOT = new URL("../../", import.meta.url);
const DEFAULT_CATALOG = fileURLToPath(new URL("grocery-catalog.yaml", REPO_ROOT));
const DEFAULT_MAPPING = fileURLToPath(new URL("experiments/fairprice/catalog-mapping.yaml", REPO_ROOT));
const DEFAULT_OUT = fileURLToPath(new URL("experiments/fairprice/backup-catalog.yaml", REPO_ROOT));
const PRODUCT_URL = "https://www.fairprice.com.sg/product/";
const ROLE_ORDER = ["same_product", "same_brand", "house_brand", "equivalent"];
const GOOD_MATCH = new Set(["exact", "close"]);
const NOTES_MAX = 200;
const SGT_OFFSET_MS = 8 * 3600 * 1000;
const QUOTED_KEYS = new Set(["date", "observed_price_date", "valid_till"]);

// ---------------------------------------------------------------- helpers

const isNum = (value) => typeof value === "number" && Number.isFinite(value);
const norm = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, "");
const round2 = (value) => Math.round(value * 100) / 100;
const roleRank = (role) => {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
};

function sgtDate(isoTimestamp) {
  const ms = Date.parse(isoTimestamp);
  return Number.isNaN(ms) ? null : new Date(ms + SGT_OFFSET_MS).toISOString().slice(0, 10);
}

export function shortenNotes(text, max = NOTES_MAX) {
  const flat = String(text ?? "").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  return `${flat.slice(0, max - 1).trimEnd()}…`;
}

// Repo-relative paths keep the generated header stable across machines; paths outside the repo stay as given.
function displayPath(path) {
  const root = fileURLToPath(REPO_ROOT);
  const absolute = resolve(path);
  const rel = relative(root, absolute);
  return rel && !rel.startsWith("..") && !rel.startsWith(sep) ? rel.split(sep).join("/") : path;
}

const lowestRank = (item) => Math.min(...(item.preferred_products ?? []).map((product) => product.rank));

// Concept entry for a catalog item: the one covering RedMart's lowest-ranked product, else the lowest reference rank.
export function pickMappingEntry(entries, catalogItem) {
  if (entries.length === 0) return null;
  const target = lowestRank(catalogItem);
  const covering = entries.find((entry) => (entry.redmart_ranks ?? []).includes(target));
  if (covering) return covering;
  const minRank = (entry) => Math.min(...(entry.redmart_ranks?.length ? entry.redmart_ranks : [entry.redmart_reference?.rank ?? Infinity]));
  return [...entries].sort((a, b) => minRank(a) - minRank(b))[0];
}

// RedMart reference for a backup item, always read from the CURRENT catalog: the product at the mapping's reference rank,
// else the catalog's lowest-rank product (then mappingRank carries the mapping's original rank). Mapping text is never copied.
function resolveReference(catalogItem, entry) {
  const products = catalogItem.preferred_products ?? [];
  const mappingRank = entry?.redmart_reference?.rank;
  const lowest = products.find((product) => product.rank === lowestRank(catalogItem));
  const matched = mappingRank === undefined ? undefined : products.find((product) => product.rank === mappingRank);
  if (matched) return matched;
  const reference = { ...(lowest ?? {}) };
  if (mappingRank !== undefined && mappingRank !== null) reference.mappingRank = mappingRank;
  return reference;
}

// ---------------------------------------------------------------- eligibility and ranking

function unitPriceOf(live) {
  if (isNum(live.single_unit_price_sgd)) return live.single_unit_price_sgd;
  return isNum(live.mrp_sgd) ? live.mrp_sgd : null;
}

function evaluateCandidate(candidate, byArticle, referenceRank) {
  const articleId = String(candidate.article_id);
  const row = byArticle.get(articleId) ?? null;
  const live = row?.found === true ? row : null;
  const reasons = [];

  // found: null is a recorded fetch failure (malformed response); found: false is a genuine live miss.
  if (!live) reasons.push(!row ? "missing_snapshot_row" : row.found === null ? "fetch_error" : "not_found_live");
  const marketplace = candidate.marketplace === true || articleId.startsWith("90") || live?.inventory_type === "MKP";
  if (marketplace) reasons.push("marketplace");
  if (candidate.requirement_conflict !== false) reasons.push("requirement_conflict");
  if (!GOOD_MATCH.has(candidate.match_quality)) reasons.push(`match_${candidate.match_quality ?? "unknown"}`);
  if (!isNum(candidate.packs_per_redmart_pack) || candidate.packs_per_redmart_pack <= 0) reasons.push("no_pack_ratio");
  if (live) {
    if (live.stock_scale === "oos" || (isNum(live.stock) && live.stock <= 0)) reasons.push("out_of_stock");
    if (norm(live.display_unit) !== norm(candidate.pack_size)) reasons.push("pack_changed");
  }
  const unitPrice = live ? unitPriceOf(live) : null;
  if (live && unitPrice === null) reasons.push("no_live_price");

  // same_product/same_brand describe a specific RedMart SKU: they only keep that order when they were assigned to the reference rank.
  const roleReferenceRank = candidate.matches_redmart_rank ?? referenceRank;
  const demoted = (candidate.role === "same_product" || candidate.role === "same_brand") && roleReferenceRank !== referenceRank;
  return { candidate, live, unitPrice, reasons, effectiveRole: demoted ? "equivalent" : candidate.role, demoted };
}

function toProduct(evaluated, rank) {
  const { candidate, live, unitPrice } = evaluated;
  const mrp = live.mrp_sgd;
  // The promo is the single-unit BXATP offer that produced the unit price (snapshot offers are already validity-filtered).
  const promoOffer = unitPrice < mrp
    ? (live.offers ?? []).find((offer) => offer.type === "BXATP" && offer.buy_qty === 1 && offer.price === unitPrice)
    : null;
  const product = {
    rank,
    article_id: String(candidate.article_id),
    title: live.name ?? candidate.title,
    brand: live.brand ?? candidate.brand ?? null,
    role: evaluated.effectiveRole,
  };
  if (evaluated.demoted) product.mapping_role = candidate.role;
  Object.assign(product, {
    house_brand: candidate.house_brand === true,
    url: `${PRODUCT_URL}${live.slug || candidate.slug}`,
    pack_size: live.display_unit,
    packs_per_redmart_pack: candidate.packs_per_redmart_pack,
    observed_price_sgd: unitPrice,
    cost_per_redmart_pack_sgd: round2(unitPrice * candidate.packs_per_redmart_pack),
    mrp_sgd: mrp,
    promo: promoOffer ? { description: promoOffer.description ?? null, valid_till: promoOffer.valid_till ?? null } : null,
    observed_price_date: sgtDate(live.fetched_at),
    notes: shortenNotes(candidate.notes),
  });
  return product;
}

function rankProducts(evaluatedList) {
  const cost = (evaluated) => evaluated.unitPrice * evaluated.candidate.packs_per_redmart_pack;
  const sorted = evaluatedList
    .filter((evaluated) => evaluated.reasons.length === 0)
    .sort((a, b) =>
      roleRank(a.effectiveRole) - roleRank(b.effectiveRole)
      || cost(a) - cost(b)
      || String(a.candidate.article_id).localeCompare(String(b.candidate.article_id)));
  return sorted.map((evaluated, index) => toProduct(evaluated, index + 1));
}

// ---------------------------------------------------------------- build

function indexSnapshot(rows) {
  if (!Array.isArray(rows)) throw new Error("FairPrice snapshot must be a JSON array");
  const byArticle = new Map();
  let newest = null;
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object" || row.article_id === undefined) throw new Error(`FairPrice snapshot row ${index} has no article_id`);
    const id = String(row.article_id);
    const existing = byArticle.get(id);
    if (!existing || (existing.found !== true && row.found === true)) byArticle.set(id, row);
    const ms = Date.parse(row.fetched_at);
    if (!Number.isNaN(ms) && (newest === null || ms > newest)) newest = ms;
  });
  return { byArticle, date: newest === null ? null : sgtDate(new Date(newest).toISOString()) };
}

// Pure core: returns { document, historyRows, summary }. Paths are only echoed into generated_from.
export function buildBackupCatalog({ catalog, mapping, snapshotRows, mappingPath, snapshotPath }) {
  if (!Array.isArray(catalog?.items) || catalog.items.length === 0) throw new Error("Catalog has no items[]");
  if (!Array.isArray(mapping?.mappings)) throw new Error("Mapping has no mappings[]");
  const { byArticle, date } = indexSnapshot(snapshotRows);

  const entriesByItem = new Map();
  for (const entry of mapping.mappings) {
    if (!entriesByItem.has(entry.catalog_item_id)) entriesByItem.set(entry.catalog_item_id, []);
    entriesByItem.get(entry.catalog_item_id).push(entry);
  }

  const items = [];
  const historyRows = [];
  for (const catalogItem of catalog.items) {
    const entry = pickMappingEntry(entriesByItem.get(catalogItem.id) ?? [], catalogItem);
    const reference = resolveReference(catalogItem, entry);
    const out = {
      catalog_item_id: catalogItem.id,
      default_quantity: catalogItem.default_quantity,
      redmart_reference: { rank: reference.rank ?? null, title: reference.title ?? null, pack_size: reference.pack_size ?? null },
    };
    if (reference.mappingRank !== undefined) {
      out.redmart_reference.reference_rank_changed = true;
      out.redmart_reference.mapping_rank = reference.mappingRank;
    }

    const seen = new Set();
    const evaluated = [];
    for (const candidate of entry?.fairprice ?? []) {
      const id = String(candidate.article_id);
      if (seen.has(id)) continue;
      seen.add(id);
      evaluated.push(evaluateCandidate(candidate, byArticle, reference.rank ?? null));
    }
    const products = rankProducts(evaluated);
    if (products.length > 0) {
      out.status = "substitute";
      out.fairprice_products = products;
    } else {
      out.status = "no_substitute";
      out.fairprice_products = [];
      out.reasons_excluded = evaluated.map(({ candidate, reasons }) => ({ article_id: String(candidate.article_id), reasons }));
      if (!entry) out.note = "No mapping entry for this catalog item.";
    }
    items.push(out);

    for (const product of products) {
      historyRows.push({
        date: product.observed_price_date,
        store: "fairprice",
        catalog_item_id: catalogItem.id,
        rank: product.rank,
        product_id: `fp-${product.article_id}`,
        title: product.title,
        pack_size: product.pack_size,
        price_sgd: product.observed_price_sgd,
        source: product.observed_price_sgd < product.mrp_sgd ? "fairprice-api-promo" : "fairprice-api",
      });
    }
  }

  const document = {
    backup_catalog_version: 1,
    status: "inactive",
    store: {
      name: mapping.store?.name ?? "NTUC FairPrice online (www.fairprice.com.sg)",
      store_id: mapping.store?.store_id ?? 165,
      url_rule: mapping.store?.url_rule ?? `${PRODUCT_URL}<slug>; slugs can change, re-resolve via API q=<article_id> before use`,
      notes: [
        "Reference only: the household decided not to shop FairPrice. No shopping tool reads this file.",
        "Generated from the catalog mapping and a FairPrice price snapshot; regenerate instead of editing by hand.",
        "observed_price_sgd is the single-unit price (including a single-unit promo) on observed_price_date, not a buying rule.",
        "packs_per_redmart_pack is the number of FairPrice packs that replace one RedMart pack.",
      ],
    },
    generated_from: {
      mapping: mappingPath,
      fairprice_snapshot: snapshotPath,
      date,
    },
    items,
  };

  const withSubstitute = items.filter((item) => item.status === "substitute").length;
  const summary = {
    items: items.length,
    with_substitutes: withSubstitute,
    without_substitutes: items.length - withSubstitute,
    products: items.reduce((sum, item) => sum + item.fairprice_products.length, 0),
  };
  return { document, historyRows, summary };
}

export function renderYaml(document) {
  const doc = new Document(document);
  doc.commentBefore = " FairPrice backup catalog (inactive, reference only). Generated by experiments/fairprice/build-backup-catalog.mjs.";
  visit(doc, {
    Pair(_, pair) {
      if (QUOTED_KEYS.has(pair.key?.value) && typeof pair.value?.value === "string") pair.value.type = "QUOTE_DOUBLE";
    },
  });
  return doc.toString({ lineWidth: 0 });
}

// Append the backup's prices as FairPrice history rows; a re-run replaces that date's FairPrice rows entirely.
export function updateHistory(historyPath, historyRows) {
  const dates = new Set(historyRows.map((row) => row.date));
  const existing = readPriceHistory(historyPath).filter((row) => !(row.store === "fairprice" && dates.has(row.date)));
  writePriceHistory(historyPath, mergePriceHistory(existing, historyRows));
}

// ---------------------------------------------------------------- args and main

function parseArgs(argv) {
  const args = { fairprice: null, mapping: DEFAULT_MAPPING, catalog: DEFAULT_CATALOG, out: DEFAULT_OUT, history: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!["--fairprice", "--mapping", "--catalog", "--out", "--history"].includes(flag)) throw new Error(`Unknown argument: ${flag}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    args[flag.slice(2)] = value;
    index += 1;
  }
  if (!args.fairprice) throw new Error("Missing --fairprice");
  return args;
}

async function readJsonOrYaml(path, parser) {
  try {
    return parser(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read ${path}: ${error.message}`);
  }
}

async function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${USAGE}`);
    return 1;
  }
  const [catalog, mapping, snapshotRows] = await Promise.all([
    readJsonOrYaml(args.catalog, parse),
    readJsonOrYaml(args.mapping, parse),
    readJsonOrYaml(args.fairprice, JSON.parse),
  ]);
  const { document, historyRows, summary } = buildBackupCatalog({
    catalog,
    mapping,
    snapshotRows,
    mappingPath: displayPath(args.mapping),
    snapshotPath: displayPath(args.fairprice),
  });
  await writeFile(resolve(args.out), renderYaml(document));
  if (args.history) updateHistory(resolve(args.history), historyRows);

  console.log(`Backup catalog items: ${summary.items}; with substitutes: ${summary.with_substitutes}; without: ${summary.without_substitutes}; total products: ${summary.products}`);
  console.log(`Wrote ${args.out}${args.history ? `; appended ${historyRows.length} FairPrice rows to ${args.history}` : ""}`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
  }
}

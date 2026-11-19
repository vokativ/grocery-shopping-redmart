#!/usr/bin/env node
// RedMart vs FairPrice price comparison for the household catalog.
// Pure computation over local files: no network, no browser. See docs/fairprice/catalog-mapping.md.
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";

const USAGE = `Usage: node experiments/fairprice/compare.mjs --redmart <json> --fairprice <json>
         [--catalog grocery-catalog.yaml] [--mapping experiments/fairprice/catalog-mapping.yaml]
         [--date YYYY-MM-DD] [--json <out.json>] [--markdown <out.md>]`;

const REPO_ROOT = new URL("../../", import.meta.url);
const DEFAULT_CATALOG = new URL("grocery-catalog.yaml", REPO_ROOT);
const DEFAULT_MAPPING = new URL("experiments/fairprice/catalog-mapping.yaml", REPO_ROOT);

const ROLE_ORDER = ["same_product", "same_brand", "house_brand", "equivalent"];
const GOOD_MATCH = new Set(["exact", "close"]);
const EQUAL_EPSILON = 0.005;
const POLICIES = ["like_for_like", "house_brand_first", "cheapest"];
const MODES = ["normalized", "whole_pack"];

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const args = { redmart: null, fairprice: null, catalog: null, mapping: null, date: null, json: null, markdown: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!["--redmart", "--fairprice", "--catalog", "--mapping", "--date", "--json", "--markdown"].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}`);
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    args[flag.slice(2)] = value;
    index += 1;
  }
  if (args.date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(args.date)) throw new Error("--date must be YYYY-MM-DD");
  if (!args.redmart) throw new Error("Missing --redmart");
  if (!args.fairprice) throw new Error("Missing --fairprice");
  return args;
}

// ---------------------------------------------------------------- helpers

const isNum = (value) => typeof value === "number" && Number.isFinite(value);
const money = (value) => (isNum(value) ? value.toFixed(2) : "n/a");
const norm = (value) => String(value ?? "").toLowerCase().replace(/\s+/g, "");
const dateOnly = (value) => (typeof value === "string" || value instanceof Date ? String(value instanceof Date ? value.toISOString() : value).slice(0, 10) : null);
const esc = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

// Timestamps without an explicit zone are Asia/Singapore local time (UTC+8), matching FairPrice offer windows.
const SGT_OFFSET_MS = 8 * 3600 * 1000;

// Parse 'YYYY-MM-DD', 'YYYY-MM-DD HH:MM[:SS]' or ISO. Date-only values resolve to start of day, or end of day when endOfDay.
function parseSgt(value, endOfDay = false) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?(Z|[+-]\d{2}:?\d{2})?$/i.exec(value.trim());
  if (!match) return null;
  const [, day, time, zone] = match;
  if (!time && zone) return null;
  const clock = time ? (time.length === 5 ? `${time}:00` : time) : endOfDay ? "23:59:59.999" : "00:00:00";
  const offset = zone ? (/^[+-]\d{4}$/.test(zone) ? `${zone.slice(0, 3)}:${zone.slice(3)}` : zone) : "+08:00";
  const ms = Date.parse(`${day}T${clock}${offset}`);
  return Number.isNaN(ms) ? null : ms;
}

const sgtDate = (ms) => new Date(ms + SGT_OFFSET_MS).toISOString().slice(0, 10);

// Snapshot date (SGT) and newest fetched_at (epoch ms) across rows; a wrapper-supplied date wins for the date.
function snapshotMeta(rows, wrappedDate) {
  let fetchedAtMs = null;
  for (const row of rows) {
    const ms = parseSgt(row?.fetched_at);
    if (ms !== null && (fetchedAtMs === null || ms > fetchedAtMs)) fetchedAtMs = ms;
  }
  return { date: wrappedDate ?? (fetchedAtMs === null ? null : sgtDate(fetchedAtMs)), fetchedAtMs };
}

function fail(message) {
  throw new Error(message);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`Cannot read JSON ${path}: ${error.message}`);
  }
}

async function readYaml(path) {
  try {
    return parse(await readFile(path, "utf8"));
  } catch (error) {
    fail(`Cannot read YAML ${path instanceof URL ? path.pathname : path}: ${error.message}`);
  }
}

// Snapshots are normally bare arrays; also accept {rows|items|results|data: [...]} wrappers carrying a date.
function unwrapSnapshot(raw, label) {
  if (Array.isArray(raw)) return { rows: raw, date: null };
  if (raw && typeof raw === "object") {
    for (const key of ["rows", "items", "results", "data", "snapshot"]) {
      if (Array.isArray(raw[key])) {
        const date = dateOnly(raw.date ?? raw.snapshot_date ?? raw.fetched_at ?? raw.captured_at ?? null);
        return { rows: raw[key], date };
      }
    }
  }
  return fail(`${label} snapshot must be a JSON array (or an object wrapping one under rows/items/results/data)`);
}

function requireFields(row, fields, label, index) {
  for (const field of fields) {
    if (!(field in row)) fail(`${label} row ${index} is missing required field "${field}": ${JSON.stringify(row).slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------- loaders

function loadRedmartSnapshot(raw) {
  const { rows, date: wrappedDate } = unwrapSnapshot(raw, "RedMart");
  const meta = snapshotMeta(rows, wrappedDate);
  const byRank = new Map();
  const bySku = new Map();
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") fail(`RedMart row ${index} is not an object`);
    requireFields(row, ["catalog_item_id", "rank", "status", "price_sgd"], "RedMart", index);
    if (!isNum(row.price_sgd) && row.price_sgd !== null) fail(`RedMart row ${index} price_sgd must be number or null`);
    const key = `${row.catalog_item_id}#${row.rank}`;
    if (byRank.has(key)) fail(`RedMart snapshot has duplicate row for ${key}`);
    byRank.set(key, row);
    if (row.item_id != null && row.sku_id != null) bySku.set(`${row.catalog_item_id}#${row.item_id}#${row.sku_id}`, row);
  });
  return { byRank, bySku, ...meta, count: rows.length };
}

function loadFairpriceSnapshot(raw) {
  const { rows, date: wrappedDate } = unwrapSnapshot(raw, "FairPrice");
  const meta = snapshotMeta(rows, wrappedDate);
  const byArticle = new Map();
  rows.forEach((row, index) => {
    if (!row || typeof row !== "object") fail(`FairPrice row ${index} is not an object`);
    requireFields(row, ["article_id", "found"], "FairPrice", index);
    const id = String(row.article_id);
    // Duplicate snapshot rows: prefer a found row over a not-found row, else keep the first.
    const existing = byArticle.get(id);
    if (!existing || (!existing.found && row.found)) byArticle.set(id, row);
  });
  return { byArticle, ...meta, count: rows.length };
}

// ---------------------------------------------------------------- RedMart side

function priceRedmart(item, snapshot) {
  const products = [...(item.preferred_products ?? [])].sort((a, b) => a.rank - b.rank);
  const skipped = [];
  if (!isNum(item.default_quantity) || item.default_quantity <= 0) fail(`Catalog item ${item.id} has no numeric default_quantity`);
  for (const product of products) {
    // Exact item/SKU identity first; a rank-keyed row only counts when it is the same SKU (ranks can be reordered).
    const rankRow = snapshot.byRank.get(`${item.id}#${product.rank}`);
    const row = snapshot.bySku.get(`${item.id}#${product.item_id}#${product.sku_id}`)
      ?? (rankRow && String(rankRow.item_id) === String(product.item_id) && String(rankRow.sku_id) === String(product.sku_id) ? rankRow : undefined);
    let reason = null;
    if (!row) reason = "missing_snapshot_row";
    else if (row.status !== "ok") reason = `status_${row.status}`;
    else if (row.in_stock === false) reason = "out_of_stock";
    else if (!isNum(row.price_sgd)) reason = "no_price";
    if (reason) {
      skipped.push({ rank: product.rank, reason });
      continue;
    }
    const first = products[0]?.rank;
    return {
      priced: true,
      rank_used: product.rank,
      title: row.title_live ?? product.title,
      catalog_title: product.title,
      pack_size: product.pack_size ?? null,
      price_sgd: row.price_sgd,
      original_price_sgd: row.original_price_sgd ?? null,
      item_value_sgd: row.price_sgd * item.default_quantity,
      fallback_reason: product.rank === first ? null : skipped.map((s) => `rank ${s.rank}: ${s.reason}`).join("; "),
      skipped,
    };
  }
  return {
    priced: false,
    rank_used: null,
    skipped,
    unpriced_reason: products.length === 0 ? "no_preferred_products" : skipped.map((s) => `rank ${s.rank}: ${s.reason}`).join("; "),
  };
}

// ---------------------------------------------------------------- FairPrice side

function pickMapping(entries, rankUsed) {
  if (entries.length === 0) return null;
  const minRank = (entry) => Math.min(...(entry.redmart_ranks?.length ? entry.redmart_ranks : [entry.redmart_reference?.rank ?? Infinity]));
  if (rankUsed != null) {
    const match = entries.find((entry) => (entry.redmart_ranks ?? []).includes(rankUsed));
    if (match) return match;
  }
  return [...entries].sort((a, b) => minRank(a) - minRank(b))[0];
}

function validOffers(row, validationMs) {
  const offers = [];
  for (const offer of row?.offers ?? []) {
    let count = null;
    if (offer.type === "BXATP" && isNum(offer.buy_qty)) count = offer.buy_qty;
    else if (offer.type === "BANYATP" && isNum(offer.quantity)) count = offer.quantity;
    if (count === null || count <= 1 || !isNum(offer.total) || offer.total <= 0) continue;
    const fromMs = parseSgt(offer.valid_from);
    const tillMs = parseSgt(offer.valid_till, true);
    if (validationMs !== null && fromMs !== null && fromMs > validationMs) continue;
    if (validationMs !== null && tillMs !== null && tillMs < validationMs) continue;
    offers.push({ type: offer.type, description: offer.description ?? null, count, total_sgd: offer.total, valid_till: dateOnly(offer.valid_till) });
  }
  return offers;
}

// Cheapest way to hold n packs: exact count with bundles, or (only if cheaper) over-buy up to the next multiple of a bundle size.
function wholePackCost(n, unitPrice, offers) {
  let best = { cost: n * unitPrice, offer: null, packs_bought: n, overbuy: false };
  for (const offer of offers) {
    if (n < offer.count) continue;
    const cost = Math.floor(n / offer.count) * offer.total_sgd + (n % offer.count) * unitPrice;
    if (cost < best.cost - 1e-9) best = { cost, offer, packs_bought: n, overbuy: false };
  }
  const exactCost = best.cost;
  let over = null;
  for (const offer of offers) {
    if (n % offer.count === 0) continue;
    const packsBought = Math.ceil(n / offer.count) * offer.count;
    const cost = (packsBought / offer.count) * offer.total_sgd;
    if (cost < exactCost - 1e-9 && (!over || cost < over.cost - 1e-9)) over = { cost, offer, packs_bought: packsBought, overbuy: true };
  }
  return over ?? best;
}

function evaluateCandidate(candidate, snapshot, quantity, validationMs, rankUsed, referenceRank) {
  const articleId = String(candidate.article_id);
  const row = snapshot.byArticle.get(articleId) ?? null;
  const exclusions = [];
  const live = row?.found ? row : null;

  if (!live) exclusions.push(row ? "not_found_live" : "missing_snapshot_row");
  const marketplace = candidate.marketplace === true || articleId.startsWith("90") || live?.inventory_type === "MKP";
  if (marketplace) exclusions.push("marketplace");
  if (candidate.requirement_conflict !== false) exclusions.push("requirement_conflict");
  if (!GOOD_MATCH.has(candidate.match_quality)) exclusions.push(`match_${candidate.match_quality ?? "unknown"}`);
  if (!isNum(candidate.packs_per_redmart_pack) || candidate.packs_per_redmart_pack <= 0) exclusions.push("no_pack_ratio");
  // packs_per_redmart_pack is relative to the mapping's reference product; it is wrong for any other priced rank.
  else if (rankUsed != null && referenceRank != null && rankUsed !== referenceRank) exclusions.push("ratio_for_other_rank");
  if (live) {
    if (live.stock_scale === "oos" || (isNum(live.stock) && live.stock <= 0)) exclusions.push("out_of_stock");
    if (norm(live.display_unit) !== norm(candidate.pack_size)) exclusions.push("pack_changed");
  }
  const unitPrice = live ? (isNum(live.single_unit_price_sgd) ? live.single_unit_price_sgd : isNum(live.mrp_sgd) ? live.mrp_sgd : null) : null;
  if (live && unitPrice === null) exclusions.push("no_live_price");

  // same_product/same_brand describe a specific RedMart SKU, so they only count for ordering when assigned relative
  // to the RedMart rank actually priced. house_brand is a concept-level substitute and keeps its role.
  const roleReferenceRank = candidate.matches_redmart_rank ?? referenceRank;
  const roleForOtherRank = rankUsed != null && (candidate.role === "same_product" || candidate.role === "same_brand") && roleReferenceRank !== rankUsed;
  const result = {
    article_id: articleId,
    role: candidate.role,
    ordering_role: roleForOtherRank ? "equivalent" : candidate.role,
    role_for_other_rank: roleForOtherRank,
    matches_redmart_rank: candidate.matches_redmart_rank ?? null,
    title: live?.name ?? candidate.title,
    mapping_title: candidate.title,
    brand: candidate.brand ?? null,
    house_brand: candidate.house_brand === true,
    pack_size: candidate.pack_size ?? null,
    live_display_unit: live?.display_unit ?? null,
    packs_per_redmart_pack: candidate.packs_per_redmart_pack ?? null,
    match_quality: candidate.match_quality ?? null,
    unit_price_sgd: unitPrice,
    live_stock: live?.stock ?? null,
    live_stock_scale: live?.stock_scale ?? null,
    eligible: exclusions.length === 0,
    exclusions,
    costs: null,
  };
  if (result.eligible) {
    const packsExact = candidate.packs_per_redmart_pack * quantity;
    const n = Math.ceil(packsExact - 1e-9);
    const offers = validOffers(live, validationMs);
    const whole = wholePackCost(n, unitPrice, offers);
    result.costs = {
      normalized: { packs: packsExact, cost_sgd: unitPrice * packsExact },
      whole_pack: {
        packs: n,
        packs_bought: whole.packs_bought,
        overbuy: whole.overbuy,
        cost_sgd: whole.cost,
        offer_used: whole.offer && { type: whole.offer.type, description: whole.offer.description, count: whole.offer.count, total_sgd: whole.offer.total_sgd },
      },
    };
  }
  return result;
}

const roleRank = (role) => {
  const index = ROLE_ORDER.indexOf(role);
  return index === -1 ? ROLE_ORDER.length : index;
};

function byCost(mode) {
  return (a, b) => a.costs[mode].cost_sgd - b.costs[mode].cost_sgd || roleRank(a.ordering_role) - roleRank(b.ordering_role) || a.article_id.localeCompare(b.article_id);
}

function select(candidates, policy, mode) {
  const eligible = candidates.filter((candidate) => candidate.eligible);
  if (eligible.length === 0) return null;
  const likeForLike = () => [...eligible].sort((a, b) => roleRank(a.ordering_role) - roleRank(b.ordering_role) || byCost(mode)(a, b))[0];
  if (policy === "cheapest") return [...eligible].sort(byCost(mode))[0];
  if (policy === "house_brand_first") {
    const houseBrands = eligible.filter((candidate) => candidate.ordering_role === "house_brand");
    return houseBrands.length ? [...houseBrands].sort(byCost(mode))[0] : likeForLike();
  }
  return likeForLike();
}

function describePick(candidate, mode) {
  if (!candidate) return null;
  const entry = candidate.costs[mode];
  return {
    article_id: candidate.article_id,
    title: candidate.title,
    role: candidate.role,
    role_for_other_rank: candidate.role_for_other_rank,
    packs: entry.packs,
    packs_bought: entry.packs_bought ?? null,
    overbuy: entry.overbuy ?? false,
    cost_sgd: entry.cost_sgd,
    offer_used: entry.offer_used ?? null,
  };
}

// ---------------------------------------------------------------- comparison

function compare({ catalog, mapping, redmart, fairprice, inputs, dateOverride }) {
  const mappingDate = dateOnly(mapping.store?.price_snapshot_date);
  const noonMs = (day) => parseSgt(`${day} 12:00:00`);
  let validationMs = null;
  let validationSource = null;
  if (dateOverride) [validationMs, validationSource] = [noonMs(dateOverride), "--date (noon SGT)"];
  else if (fairprice.fetchedAtMs !== null) [validationMs, validationSource] = [fairprice.fetchedAtMs, "fairprice max fetched_at"];
  else if (fairprice.date) [validationMs, validationSource] = [noonMs(fairprice.date), "fairprice snapshot date (noon SGT)"];
  else if (mappingDate) [validationMs, validationSource] = [noonMs(mappingDate), "mapping store.price_snapshot_date (noon SGT)"];
  const entriesByItem = new Map();
  for (const entry of mapping.mappings ?? []) {
    if (!entriesByItem.has(entry.catalog_item_id)) entriesByItem.set(entry.catalog_item_id, []);
    entriesByItem.get(entry.catalog_item_id).push(entry);
  }
  const catalogIds = new Set(catalog.items.map((item) => item.id));
  const orphanMappings = [...entriesByItem.keys()].filter((id) => !catalogIds.has(id));

  const rows = catalog.items.map((item) => {
    const rm = priceRedmart(item, redmart);
    const entries = entriesByItem.get(item.id) ?? [];
    const entry = pickMapping(entries, rm.rank_used);
    const flags = [];
    if (!entry) flags.push("no_mapping_entry");
    if (entry && rm.priced && entry.redmart_reference?.rank !== rm.rank_used) flags.push("ratio_reference_rank_differs");
    if (entry && rm.priced && !(entry.redmart_ranks ?? []).includes(rm.rank_used)) flags.push("rank_used_not_in_mapping_ranks");

    const seen = new Set();
    const candidates = [];
    const duplicates = [];
    for (const candidate of entry?.fairprice ?? []) {
      const id = String(candidate.article_id);
      if (seen.has(id)) {
        duplicates.push(id);
        continue;
      }
      seen.add(id);
      candidates.push(evaluateCandidate(candidate, fairprice, item.default_quantity, validationMs, rm.rank_used, entry.redmart_reference?.rank));
    }
    if (duplicates.length) flags.push(`duplicate_article_ids_ignored:${duplicates.join(",")}`);

    const selections = {};
    for (const policy of POLICIES) {
      selections[policy] = {};
      for (const mode of MODES) selections[policy][mode] = describePick(select(candidates, policy, mode), mode);
    }
    return {
      catalog_item_id: item.id,
      category: item.category ?? null,
      default_quantity: item.default_quantity,
      redmart: rm,
      fairprice: {
        mapping_concept: entry?.concept ?? null,
        mapping_status: entry?.status ?? null,
        mapping_redmart_reference_rank: entry?.redmart_reference?.rank ?? null,
        flags,
        has_eligible: candidates.some((candidate) => candidate.eligible),
        candidates,
      },
      selections,
    };
  });

  const redmartUnpriced = rows.filter((row) => !row.redmart.priced).map((row) => ({ catalog_item_id: row.catalog_item_id, reason: row.redmart.unpriced_reason }));
  const noFairprice = rows
    .filter((row) => row.redmart.priced && !row.fairprice.has_eligible)
    .map((row) => ({
      catalog_item_id: row.catalog_item_id,
      redmart_value_sgd: row.redmart.item_value_sgd,
      reasons: row.fairprice.candidates.map((candidate) => `${candidate.article_id}: ${candidate.exclusions.join("+")}`),
      flags: row.fairprice.flags,
    }));

  const pricedRows = rows.filter((row) => row.redmart.priced);
  const redmartFullCatalogSgd = pricedRows.reduce((sum, row) => sum + row.redmart.item_value_sgd, 0);

  const totals = {};
  for (const policy of POLICIES) {
    totals[policy] = {};
    for (const mode of MODES) {
      let redmartSum = 0;
      let fairpriceSum = 0;
      let comparable = 0;
      let cheaper = 0;
      let equal = 0;
      let dearer = 0;
      for (const row of pricedRows) {
        const pick = row.selections[policy][mode];
        if (!pick) continue;
        comparable += 1;
        redmartSum += row.redmart.item_value_sgd;
        fairpriceSum += pick.cost_sgd;
        const delta = pick.cost_sgd - row.redmart.item_value_sgd;
        if (Math.abs(delta) <= EQUAL_EPSILON) equal += 1;
        else if (delta < 0) cheaper += 1;
        else dearer += 1;
      }
      totals[policy][mode] = {
        comparable_items: comparable,
        redmart_total_sgd: redmartSum,
        fairprice_total_sgd: fairpriceSum,
        difference_sgd: fairpriceSum - redmartSum,
        difference_pct: redmartSum > 0 ? ((fairpriceSum - redmartSum) / redmartSum) * 100 : null,
        fairprice_cheaper: cheaper,
        fairprice_equal: equal,
        fairprice_dearer: dearer,
      };
    }
  }

  return {
    generated_from: inputs,
    dates: {
      redmart_snapshot: redmart.date,
      fairprice_snapshot: dateOverride ?? fairprice.date,
      mapping_price_snapshot: dateOnly(mapping.store?.price_snapshot_date),
      offers_validated_against: validationMs === null ? null : new Date(validationMs).toISOString(),
      offers_validated_against_source: validationSource,
    },
    counts: {
      catalog_items: rows.length,
      redmart_priced: pricedRows.length,
      redmart_unpriced: redmartUnpriced.length,
      no_eligible_fairprice: noFairprice.length,
      redmart_snapshot_rows: redmart.count,
      fairprice_snapshot_rows: fairprice.count,
    },
    redmart_full_catalog_sgd: redmartFullCatalogSgd,
    totals,
    redmart_unpriced: redmartUnpriced,
    no_eligible_fairprice: noFairprice,
    orphan_mapping_items: orphanMappings,
    items: rows,
  };
}

// ---------------------------------------------------------------- markdown

function pct(value) {
  return isNum(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}%` : "n/a";
}

function signed(value) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}`;
}

function renderMarkdown(result) {
  const lines = [];
  const d = result.dates;
  lines.push(`RedMart snapshot: ${d.redmart_snapshot ?? "n/a"}; FairPrice snapshot: ${d.fairprice_snapshot ?? d.mapping_price_snapshot ?? "n/a"}.`);
  lines.push("");
  lines.push(`Catalog items: ${result.counts.catalog_items}; RedMart priced: ${result.counts.redmart_priced}; RedMart unpriced: ${result.counts.redmart_unpriced}; priced items with no eligible FairPrice option: ${result.counts.no_eligible_fairprice}.`);
  lines.push(`Full-catalog RedMart value (all priced items): S$${money(result.redmart_full_catalog_sgd)}.`);
  lines.push("");
  lines.push("### Totals (comparable subset: items priced on both sides)");
  lines.push("");
  lines.push("| Policy | Mode | Items | RedMart S$ | FairPrice S$ | Diff S$ | Diff % | FP cheaper / equal / dearer |");
  lines.push("|---|---|---:|---:|---:|---:|---:|---|");
  for (const policy of POLICIES) {
    for (const mode of MODES) {
      const t = result.totals[policy][mode];
      lines.push(`| ${policy} | ${mode} | ${t.comparable_items} | ${money(t.redmart_total_sgd)} | ${money(t.fairprice_total_sgd)} | ${signed(t.difference_sgd)} | ${pct(t.difference_pct)} | ${t.fairprice_cheaper} / ${t.fairprice_equal} / ${t.fairprice_dearer} |`);
    }
  }
  lines.push("");
  lines.push("Diff is FairPrice minus RedMart; negative means FairPrice is cheaper. `normalized` prices fractional packs; `whole_pack` buys whole packs and applies valid multi-buy offers.");
  lines.push("");
  lines.push("### Per item (policy: like_for_like)");
  lines.push("");
  lines.push("| Item | Qty | RedMart (rank, price) | RedMart S$ | FairPrice pick | Role | Packs (norm / whole) | FP norm S$ | FP whole S$ |");
  lines.push("|---|---:|---|---:|---|---|---|---:|---:|");
  for (const row of result.items) {
    const rm = row.redmart;
    const rmCell = rm.priced ? `#${rm.rank_used} ${esc(rm.title)} @ ${money(rm.price_sgd)}${rm.fallback_reason ? " (fallback)" : ""}` : `unpriced (${esc(rm.unpriced_reason)})`;
    const norm = row.selections.like_for_like.normalized;
    const whole = row.selections.like_for_like.whole_pack;
    let pickCell = "none";
    let roleCell = "";
    const roleLabel = (pick) => `${pick.role}${pick.role_for_other_rank ? " (other rank)" : ""}`;
    if (norm) {
      pickCell = `${esc(norm.title)} (${norm.article_id})`;
      roleCell = roleLabel(norm);
      if (whole && whole.article_id !== norm.article_id) pickCell += `; whole: ${esc(whole.title)} (${whole.article_id})`;
      if (whole && roleLabel(whole) !== roleLabel(norm)) roleCell += ` / ${roleLabel(whole)}`;
    }
    const packs = norm ? `${norm.packs.toFixed(2)} / ${whole.packs_bought}${whole.overbuy ? ` overbuy (need ${whole.packs})` : ""}${whole.offer_used ? ` (${esc(whole.offer_used.description ?? whole.offer_used.type)})` : ""}` : "";
    const flags = row.fairprice.flags.length ? ` [${row.fairprice.flags.join(", ")}]` : "";
    lines.push(`| ${row.catalog_item_id}${flags} | ${row.default_quantity} | ${rmCell} | ${rm.priced ? money(rm.item_value_sgd) : "n/a"} | ${pickCell} | ${roleCell} | ${packs} | ${norm ? money(norm.cost_sgd) : "n/a"} | ${whole ? money(whole.cost_sgd) : "n/a"} |`);
  }
  lines.push("");
  lines.push("### Exclusions and gaps");
  lines.push("");
  lines.push("RedMart unpriced items:");
  lines.push("");
  if (result.redmart_unpriced.length === 0) lines.push("- none");
  for (const entry of result.redmart_unpriced) lines.push(`- ${entry.catalog_item_id}: ${entry.reason}`);
  lines.push("");
  lines.push("Priced on RedMart but no eligible FairPrice option (excluded from comparable totals):");
  lines.push("");
  if (result.no_eligible_fairprice.length === 0) lines.push("- none");
  for (const entry of result.no_eligible_fairprice) {
    const why = entry.reasons.length ? entry.reasons.join("; ") : "no mapped FairPrice candidates";
    lines.push(`- ${entry.catalog_item_id} (RedMart S$${money(entry.redmart_value_sgd)}): ${why}${entry.flags.length ? ` [${entry.flags.join(", ")}]` : ""}`);
  }
  lines.push("");
  lines.push("Excluded FairPrice candidates (items that still have another eligible option):");
  lines.push("");
  let any = false;
  for (const row of result.items) {
    if (!row.fairprice.has_eligible) continue;
    for (const candidate of row.fairprice.candidates) {
      if (candidate.eligible) continue;
      any = true;
      lines.push(`- ${row.catalog_item_id} / ${candidate.article_id} (${candidate.role}): ${candidate.exclusions.join(", ")}`);
    }
  }
  if (!any) lines.push("- none");
  const fallbacks = result.items.filter((row) => row.redmart.priced && row.redmart.fallback_reason);
  lines.push("");
  lines.push("RedMart fallbacks (rank 1 skipped):");
  lines.push("");
  if (fallbacks.length === 0) lines.push("- none");
  for (const row of fallbacks) lines.push(`- ${row.catalog_item_id}: used rank ${row.redmart.rank_used} (${row.redmart.fallback_reason})`);
  lines.push("");
  return lines.join("\n");
}

// ---------------------------------------------------------------- main

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${error.message}\n\n${USAGE}`);
  process.exit(1);
}

const catalog = await readYaml(args.catalog ? resolve(args.catalog) : DEFAULT_CATALOG);
const mapping = await readYaml(args.mapping ? resolve(args.mapping) : DEFAULT_MAPPING);
if (!Array.isArray(catalog?.items) || catalog.items.length === 0) fail("Catalog has no items[]");
if (!Array.isArray(mapping?.mappings)) fail("Mapping has no mappings[]");

const redmart = loadRedmartSnapshot(await readJson(resolve(args.redmart)));
const fairprice = loadFairpriceSnapshot(await readJson(resolve(args.fairprice)));

const result = compare({
  catalog,
  mapping,
  redmart,
  fairprice,
  dateOverride: args.date,
  inputs: {
    redmart: args.redmart,
    fairprice: args.fairprice,
    catalog: args.catalog ?? "grocery-catalog.yaml",
    mapping: args.mapping ?? "experiments/fairprice/catalog-mapping.yaml",
  },
});

if (args.json) await writeFile(resolve(args.json), `${JSON.stringify(result, null, 2)}\n`);
if (args.markdown) await writeFile(resolve(args.markdown), renderMarkdown(result));

console.log(`Catalog items: ${result.counts.catalog_items}; RedMart priced: ${result.counts.redmart_priced}; unpriced: ${result.counts.redmart_unpriced}; no eligible FairPrice: ${result.counts.no_eligible_fairprice}`);
console.log(`Full-catalog RedMart value: S$${money(result.redmart_full_catalog_sgd)}`);
const summary = [];
for (const policy of POLICIES) {
  for (const mode of MODES) {
    const t = result.totals[policy][mode];
    summary.push({
      policy,
      mode,
      items: t.comparable_items,
      redmart_sgd: money(t.redmart_total_sgd),
      fairprice_sgd: money(t.fairprice_total_sgd),
      diff_sgd: signed(t.difference_sgd),
      diff_pct: pct(t.difference_pct),
      "fp cheaper/equal/dearer": `${t.fairprice_cheaper}/${t.fairprice_equal}/${t.fairprice_dearer}`,
    });
  }
}
console.table(summary);
if (result.orphan_mapping_items.length) console.log(`Warning: mapping entries for unknown catalog items: ${result.orphan_mapping_items.join(", ")}`);

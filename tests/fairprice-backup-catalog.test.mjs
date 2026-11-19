import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse } from "yaml";
import { buildBackupCatalog, renderYaml, shortenNotes, updateHistory } from "../experiments/fairprice/build-backup-catalog.mjs";
import { fetchProduct, fetchSnapshotRow, mappingArticleIds, pickProduct, toSnapshotRow } from "../experiments/fairprice/fetch-prices.mjs";
import { readPriceHistory, writePriceHistory } from "../tools/price-history.mjs";

const run = promisify(execFile);
const NOW = new Date("2026-11-19T04:00:00Z"); // 12:00 Singapore time

// ---------------------------------------------------------------- toSnapshotRow

const bxatp = (price, q, validFrom, validTill, total = { t: "FIXED", v: price }) => ({
  type: "BXATP",
  description: q === 1 ? `Buy 1 Widget @ $${price}` : `Buy ${q} for $${total.v}`,
  price: q === 1 ? price : null,
  rule: { buy: { 1493170: { q } }, total },
  validFrom,
  validTill,
});

const apiProduct = (overrides = {}) => ({
  id: 1493170,
  clientItemId: "13232423",
  slug: "widget-30-per-pack-13232423",
  name: "Widget",
  brand: { name: "Fairprice" },
  metaData: { DisplayUnit: "30 per pack" },
  storeSpecificData: [{ mrp: "2.95", discount: "0.45", stock: 290, stockScale: "inStock", inventoryType: null }],
  offers: null,
  final_price: 0,
  has_stock: true,
  ...overrides,
});

test("toSnapshotRow uses a live single-unit BXATP promo as the unit price and keeps bundle totals", () => {
  const row = toSnapshotRow(
    apiProduct({
      offers: [
        bxatp(2.5, 1, "2026-11-01 04:01:00", "2026-12-01 04:00:00"),
        bxatp(4.8, 2, "2026-11-01 04:01:00", "2026-12-01 04:00:00"),
      ],
    }),
    "13232423",
    NOW,
  );
  assert.equal(row.found, true);
  assert.equal(row.article_id, "13232423");
  assert.equal(row.slug, "widget-30-per-pack-13232423");
  assert.equal(row.brand, "Fairprice");
  assert.equal(row.display_unit, "30 per pack");
  assert.equal(row.mrp_sgd, 2.95);
  assert.equal(row.discount_sgd, 0.45);
  assert.equal(row.stock, 290);
  assert.equal(row.stock_scale, "inStock");
  assert.equal(row.single_unit_price_sgd, 2.5);
  assert.equal(row.fetched_at, "2026-11-19T04:00:00.000Z");
  assert.deepEqual(row.offers.map((offer) => [offer.type, offer.buy_qty, offer.total]), [["BXATP", 1, 2.5], ["BXATP", 2, 4.8]]);
  assert.equal(row.offers[0].price, 2.5);
  assert.equal(row.offers[1].price, null);
});

test("toSnapshotRow drops BMIN and expired or not-yet-valid offers and counts them", () => {
  const row = toSnapshotRow(
    apiProduct({
      offers: [
        { type: "BMIN", description: "Spend $75, get $8 off", price: null, rule: {}, validFrom: "2026-11-05 05:00:00", validTill: "2026-12-31 23:59:59" },
        { type: "BMINXGFG", description: "Free gift", price: null, rule: {}, validFrom: "2026-11-05 05:00:00", validTill: "2026-12-31 23:59:59" },
        bxatp(1.9, 1, "2026-10-01 04:01:00", "2026-11-19 11:59:59"), // ended 12:00 SGT minus one second
        bxatp(1.8, 1, "2026-11-19 12:00:01", "2026-12-01 04:00:00"), // starts after now
      ],
    }),
    "13232423",
    NOW,
  );
  assert.equal(row.bmin_offers_dropped, 2);
  assert.equal(row.expired_offers_dropped, 2);
  assert.deepEqual(row.offers, []);
  assert.equal(row.single_unit_price_sgd, 2.95);
});

test("toSnapshotRow records marketplace inventory type and out-of-stock; ignores final_price and has_stock", () => {
  const row = toSnapshotRow(
    apiProduct({
      clientItemId: "90214278",
      storeSpecificData: [{ mrp: "4.60", discount: "0", stock: 0, stockScale: "oos", inventoryType: "MKP" }],
    }),
    "90214278",
    NOW,
  );
  assert.equal(row.inventory_type, "MKP");
  assert.equal(row.stock, 0);
  assert.equal(row.stock_scale, "oos");
  assert.equal(row.single_unit_price_sgd, 4.6);
});

test("toSnapshotRow converts ABSOLUTE_OFF bundles and BANYATP quantities, and returns a not-found row for no product", () => {
  const row = toSnapshotRow(
    apiProduct({
      offers: [
        bxatp(0, 3, "2026-11-01 04:01:00", "2026-12-01 04:00:00", { t: "ABSOLUTE_OFF", v: 0.85 }),
        { type: "BANYATP", description: "Any 2 for $5", price: null, rule: { quantity: 2, total: { t: "FIXED", v: 5 }, variants: [1, 2] }, validFrom: "2026-11-01 04:01:00", validTill: "2026-12-01 04:00:00" },
      ],
    }),
    "13232423",
    NOW,
  );
  assert.equal(row.offers[0].buy_qty, 3);
  assert.equal(row.offers[0].total, 8);
  assert.equal(row.offers[1].quantity, 2);
  assert.equal(row.offers[1].total, 5);
  assert.equal(row.single_unit_price_sgd, 2.95);

  const missing = toSnapshotRow(null, "123", NOW);
  assert.equal(missing.found, false);
  assert.equal(missing.article_id, "123");
  assert.deepEqual(missing.offers, []);
});

test("pickProduct selects by exact clientItemId and mappingArticleIds de-duplicates", () => {
  const payload = { data: { product: [{ clientItemId: "999" }, { clientItemId: "13232423", name: "wanted" }] } };
  assert.equal(pickProduct(payload, "13232423").name, "wanted");
  assert.equal(pickProduct(payload, "1"), null);
  assert.equal(pickProduct({}, "1"), null);
  const ids = mappingArticleIds({ mappings: [{ fairprice: [{ article_id: "1" }, { article_id: 2 }] }, { fairprice: [{ article_id: "1" }] }, {}] });
  assert.deepEqual(ids, ["1", "2"]);
});

test("toSnapshotRow treats a date-only validTill as end of that day and a date-only validFrom as start of day", () => {
  const row = toSnapshotRow(
    apiProduct({
      offers: [
        bxatp(2.4, 1, "2026-11-19", "2026-11-19"), // valid all of 19 Nov SGT, now is 12:00 on the 19th
        bxatp(2.3, 1, "2026-11-01 04:01:00", "2026-11-18"), // ended after 18 Nov
        bxatp(2.2, 1, "2026-11-20", "2026-12-01"), // starts tomorrow
      ],
    }),
    "13232423",
    NOW,
  );
  assert.deepEqual(row.offers.map((offer) => offer.price), [2.4]);
  assert.equal(row.expired_offers_dropped, 2);
  assert.equal(row.single_unit_price_sgd, 2.4);

  const lastSecond = toSnapshotRow(apiProduct({ offers: [bxatp(2.4, 1, null, "2026-11-19")] }), "13232423", new Date("2026-11-19T15:59:00Z")); // 23:59 SGT
  assert.equal(lastSecond.offers.length, 1);
  const nextDay = toSnapshotRow(apiProduct({ offers: [bxatp(2.4, 1, null, "2026-11-19")] }), "13232423", new Date("2026-11-19T16:00:01Z")); // 00:00:01 SGT on the 20th
  assert.equal(nextDay.offers.length, 0);
});

test("toSnapshotRow drops offers whose validity dates cannot be parsed, but keeps open-ended windows", () => {
  const row = toSnapshotRow(
    apiProduct({
      offers: [
        bxatp(2.1, 1, "garbage", "2026-12-01 04:00:00"),
        bxatp(2.2, 1, "2026-11-01 04:01:00", "31/12/2026"),
        bxatp(2.3, 1, "2026-11-01 04:01:00", "tomorrow"),
        bxatp(2.5, 1, null, null), // no window at all: open-ended
        bxatp(2.6, 1, "", ""), // blank bounds: open-ended
      ],
    }),
    "13232423",
    NOW,
  );
  assert.deepEqual(row.offers.map((offer) => offer.price), [2.5, 2.6]);
  assert.equal(row.expired_offers_dropped, 3);
  assert.equal(row.single_unit_price_sgd, 2.5);
});

// Replace global fetch for one test; delayMs 0 keeps the retry back-off instant.
async function withFetch(responses, body) {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    const next = responses[Math.min(calls, responses.length - 1)];
    calls += 1;
    return typeof next === "function" ? next() : next;
  };
  try {
    await body();
  } finally {
    globalThis.fetch = original;
  }
  return calls;
}
const jsonResponse = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });

test("fetchProduct retries a 200 without a data.product array, then fetchSnapshotRow records found: null with 'malformed response'", async () => {
  for (const bad of [() => jsonResponse({}), () => jsonResponse({ data: {} }), () => jsonResponse({ data: { product: null } }), () => new Response("<html>throttled</html>", { status: 200 })]) {
    let row;
    const calls = await withFetch([bad], async () => {
      row = await fetchSnapshotRow("13232423", "165", 0);
    });
    assert.equal(calls, 3, "malformed responses use the existing retry budget");
    assert.equal(row.found, null);
    assert.equal(row.notes, "malformed response");
    assert.equal(row.article_id, "13232423");
    assert.deepEqual(row.offers, []);
  }
});

test("fetchProduct recovers when a retry returns a valid envelope; a valid empty product array is a genuine not-found", async () => {
  let product;
  const calls = await withFetch([() => jsonResponse({}), () => jsonResponse({ data: { product: [{ clientItemId: "13232423", name: "Widget" }] } })], async () => {
    product = await fetchProduct("13232423", "165", 0);
  });
  assert.equal(calls, 2);
  assert.equal(product.name, "Widget");

  let row;
  const emptyCalls = await withFetch([() => jsonResponse({ data: { product: [] } })], async () => {
    row = await fetchSnapshotRow("13232423", "165", 0);
  });
  assert.equal(emptyCalls, 1);
  assert.equal(row.found, false);
  assert.equal(row.notes, undefined);
});

test("fetchSnapshotRow still throws for HTTP failures (no row recorded)", async () => {
  await withFetch([() => jsonResponse({}, 404)], async () => {
    await assert.rejects(fetchSnapshotRow("13232423", "165", 0), /HTTP 404/);
  });
});

// ---------------------------------------------------------------- build-backup-catalog fixtures

const catalogProduct = (rank, title = `Product ${rank}`) => ({ rank, title, item_id: String(rank), sku_id: String(rank), canonical_url: `https://www.lazada.sg/products/i${rank}-s${rank}.html`, pack_size: "1 pack" });
const catalogFixture = () => ({
  catalog_version: 2,
  items: [
    { id: "milk", default_quantity: 2, aliases: ["milk"], preferred_products: [catalogProduct(1, "RedMart Milk 1L"), catalogProduct(2)] },
    { id: "eggs", default_quantity: 1, aliases: ["eggs"], preferred_products: [catalogProduct(1, "Eggs"), catalogProduct(2)] },
    { id: "cheese", default_quantity: 1, aliases: ["cheese"], preferred_products: [catalogProduct(1, "Cheese")] },
    { id: "bread", default_quantity: 3, aliases: ["bread"], preferred_products: [catalogProduct(1, "Bread loaf")] },
    { id: "salt", default_quantity: 1, aliases: ["salt"], preferred_products: [catalogProduct(1, "Salt")] },
  ],
});

const candidate = (articleId, overrides = {}) => ({
  role: "equivalent",
  article_id: articleId,
  slug: `mapping-slug-${articleId}`,
  title: `Mapping title ${articleId}`,
  brand: "Brand",
  house_brand: false,
  marketplace: false,
  pack_size: "1L",
  packs_per_redmart_pack: 1,
  mrp_sgd: 3,
  match_quality: "exact",
  requirement_conflict: false,
  notes: `note ${articleId}`,
  ...overrides,
});

const entry = (catalogItemId, ranks, referenceRank, fairprice) => ({
  catalog_item_id: catalogItemId,
  concept: `${catalogItemId} concept ${referenceRank}`,
  redmart_ranks: ranks,
  redmart_reference: { rank: referenceRank, title: `Reference ${catalogItemId} #${referenceRank}`, pack_size: "1 pack" },
  fairprice,
});

const mappingFixture = () => ({
  mapping_version: 1,
  store: { name: "FairPrice test", store_id: 165, url_rule: "https://www.fairprice.com.sg/product/<slug>" },
  mappings: [
    entry("milk", [1], 1, [
      candidate("13000001", { role: "house_brand", house_brand: true }), // 3.00
      candidate("13000002", { role: "same_brand", matches_redmart_rank: 2 }), // demoted to equivalent, 2.00
      candidate("13000003", { role: "same_product" }), // 4.00, wins on role
      candidate("90000004"), // marketplace by id prefix
      candidate("13000005", { requirement_conflict: true }),
      candidate("13000006", { match_quality: "approximate" }),
      candidate("13000007"), // out of stock
      candidate("13000008"), // pack changed
      candidate("13000009"), // plain equivalent, 2.50, loses to the cheaper demoted one
      candidate("13000010", { marketplace: true }), // marketplace by flag
      candidate("13000011", { packs_per_redmart_pack: null }), // no ratio
      candidate("13000003", { role: "equivalent" }), // duplicate id ignored
    ]),
    entry("eggs", [2], 2, [candidate("13000020", { pack_size: "10 per pack" })]), // does not cover rank 1
    entry("eggs", [1], 1, [candidate("13000021", { pack_size: "12 per pack", packs_per_redmart_pack: 1.25 })]),
    entry("cheese", [3], 3, [candidate("13000030")]),
    entry("cheese", [2], 2, [candidate("13000031", { notes: `${"long ".repeat(80)}end` })]), // lowest reference rank wins
    entry("bread", [1], 1, [candidate("13000040", { match_quality: "approximate" }), candidate("13000041", { marketplace: true })]),
    entry("removed_item", [1], 1, [candidate("13000050")]),
  ],
});

const snapshotRow = (articleId, overrides = {}) => ({
  article_id: articleId,
  found: true,
  slug: `live-slug-${articleId}`,
  name: `Live ${articleId}`,
  brand: "Live Brand",
  display_unit: "1L",
  mrp_sgd: 3,
  discount_sgd: 0,
  stock: 10,
  stock_scale: "inStock",
  inventory_type: null,
  offers: [],
  single_unit_price_sgd: 3,
  bmin_offers_dropped: 0,
  expired_offers_dropped: 0,
  fetched_at: "2026-11-17T15:43:00.000Z", // 2026-11-17 23:43 SGT
  ...overrides,
});

const snapshotFixture = () => [
  snapshotRow("13000001", { single_unit_price_sgd: 3 }),
  snapshotRow("13000002", { single_unit_price_sgd: 2, mrp_sgd: 2.4, offers: [{ type: "BXATP", description: "Buy 1 Live @ $2", price: 2, buy_qty: 1, total: 2, quantity: null, valid_from: "2026-11-01 04:01:00", valid_till: "2026-12-01 04:00:00" }] }),
  snapshotRow("13000003", { single_unit_price_sgd: 4, mrp_sgd: 4, slug: "same-product-live-slug" }),
  snapshotRow("90000004"),
  snapshotRow("13000005"),
  snapshotRow("13000006"),
  snapshotRow("13000007", { stock: 0, stock_scale: "oos" }),
  snapshotRow("13000008", { display_unit: "1.5L" }),
  snapshotRow("13000009", { single_unit_price_sgd: 2.5, mrp_sgd: 2.5 }),
  snapshotRow("13000010"),
  snapshotRow("13000011"),
  snapshotRow("13000020", { display_unit: "10 per pack" }),
  snapshotRow("13000021", { display_unit: "12 PER PACK", single_unit_price_sgd: 4, mrp_sgd: 4 }),
  snapshotRow("13000030"),
  snapshotRow("13000031"),
  snapshotRow("13000040"),
  snapshotRow("13000041"),
  snapshotRow("13000050"),
];

const build = (overrides = {}) =>
  buildBackupCatalog({ catalog: catalogFixture(), mapping: mappingFixture(), snapshotRows: snapshotFixture(), mappingPath: "mapping.yaml", snapshotPath: "snap.json", ...overrides });

const itemOf = (result, id) => result.document.items.find((item) => item.catalog_item_id === id);

test("backup catalog excludes marketplace, conflict, approximate, out-of-stock, pack-changed and unpriced-ratio candidates", () => {
  const milk = itemOf(build(), "milk");
  assert.equal(milk.status, "substitute");
  const ids = milk.fairprice_products.map((product) => product.article_id);
  for (const excluded of ["90000004", "13000005", "13000006", "13000007", "13000008", "13000010", "13000011"]) {
    assert.ok(!ids.includes(excluded), `${excluded} must be excluded`);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("backup catalog ranks like-for-like roles first, demotes other-rank roles, then orders by cost per RedMart pack", () => {
  const milk = itemOf(build(), "milk");
  assert.deepEqual(
    milk.fairprice_products.map((product) => [product.rank, product.article_id, product.role]),
    [
      [1, "13000003", "same_product"],
      [2, "13000001", "house_brand"],
      [3, "13000002", "equivalent"],
      [4, "13000009", "equivalent"],
    ],
  );
  const demoted = milk.fairprice_products[2];
  assert.equal(demoted.mapping_role, "same_brand");
  assert.equal(milk.fairprice_products[0].mapping_role, undefined);
});

test("backup catalog product fields come from the live snapshot", () => {
  const milk = itemOf(build(), "milk");
  const first = milk.fairprice_products[0];
  assert.equal(first.title, "Live 13000003");
  assert.equal(first.url, "https://www.fairprice.com.sg/product/same-product-live-slug");
  assert.equal(first.pack_size, "1L");
  assert.equal(first.observed_price_sgd, 4);
  assert.equal(first.mrp_sgd, 4);
  assert.equal(first.promo, null);
  assert.equal(first.observed_price_date, "2026-11-17");
  assert.equal(first.notes, "note 13000003");

  const promoted = milk.fairprice_products.find((product) => product.article_id === "13000002");
  assert.equal(promoted.observed_price_sgd, 2);
  assert.equal(promoted.mrp_sgd, 2.4);
  assert.deepEqual(promoted.promo, { description: "Buy 1 Live @ $2", valid_till: "2026-12-01 04:00:00" });
  assert.equal(milk.redmart_reference.rank, 1);
  assert.equal(milk.default_quantity, 2);
});

test("backup catalog picks the concept covering RedMart's lowest rank, else the lowest reference rank", () => {
  const result = build();
  const eggs = itemOf(result, "eggs");
  assert.equal(eggs.redmart_reference.rank, 1);
  assert.deepEqual(eggs.fairprice_products.map((product) => product.article_id), ["13000021"]);
  assert.equal(eggs.fairprice_products[0].cost_per_redmart_pack_sgd, 5);

  const cheese = itemOf(result, "cheese");
  assert.equal(cheese.redmart_reference.rank, 1);
  assert.deepEqual(cheese.fairprice_products.map((product) => product.article_id), ["13000031"]);
  assert.ok(cheese.fairprice_products[0].notes.length <= 200);
});

test("backup catalog reports no_substitute with reasons and skips mapping entries for removed catalog items", () => {
  const result = build();
  const bread = itemOf(result, "bread");
  assert.equal(bread.status, "no_substitute");
  assert.deepEqual(bread.fairprice_products, []);
  assert.deepEqual(bread.reasons_excluded, [
    { article_id: "13000040", reasons: ["match_approximate"] },
    { article_id: "13000041", reasons: ["marketplace"] },
  ]);

  const salt = itemOf(result, "salt");
  assert.equal(salt.status, "no_substitute");
  assert.equal(salt.redmart_reference.title, "Salt");

  assert.equal(result.document.items.some((item) => item.catalog_item_id === "removed_item"), false);
  assert.deepEqual(result.document.items.map((item) => item.catalog_item_id), ["milk", "eggs", "cheese", "bread", "salt"]);
  assert.deepEqual(result.summary, { items: 5, with_substitutes: 3, without_substitutes: 2, products: 6 });
});

test("backup catalog excludes articles missing from the snapshot or not found live", () => {
  const rows = snapshotFixture().filter((row) => row.article_id !== "13000040" && row.article_id !== "13000041");
  rows.push(snapshotRow("13000041", { found: false }));
  const bread = itemOf(build({ snapshotRows: rows }), "bread");
  assert.deepEqual(bread.reasons_excluded, [
    { article_id: "13000040", reasons: ["missing_snapshot_row", "match_approximate"] },
    { article_id: "13000041", reasons: ["not_found_live", "marketplace"] },
  ]);
});

test("backup catalog treats found: null as fetch_error and any found other than true as not eligible", () => {
  const rows = snapshotFixture().filter((row) => row.article_id !== "13000040" && row.article_id !== "13000041");
  rows.push(snapshotRow("13000040", { found: null, notes: "malformed response" }));
  rows.push(snapshotRow("13000041", { found: "yes" }));
  const bread = itemOf(build({ snapshotRows: rows }), "bread");
  assert.deepEqual(bread.reasons_excluded, [
    { article_id: "13000040", reasons: ["fetch_error", "match_approximate"] },
    { article_id: "13000041", reasons: ["not_found_live", "marketplace"] },
  ]);

  // A good row for the same article wins over a failed duplicate regardless of order.
  const eggs = itemOf(build({ snapshotRows: [snapshotRow("13000021", { found: null }), ...snapshotFixture()] }), "eggs");
  assert.deepEqual(eggs.fairprice_products.map((product) => product.article_id), ["13000021"]);
});

test("backup catalog redmart_reference comes from the current catalog product, not the mapping text", () => {
  const result = build();
  assert.deepEqual(itemOf(result, "milk").redmart_reference, { rank: 1, title: "RedMart Milk 1L", pack_size: "1 pack" });
  assert.deepEqual(itemOf(result, "eggs").redmart_reference, { rank: 1, title: "Eggs", pack_size: "1 pack" });

  const mapping = mappingFixture();
  mapping.mappings[0].redmart_reference = { rank: 2, title: "stale title", pack_size: "4 x 75 ml (catalog says 75 ml; checked long ago)" };
  const second = itemOf(build({ mapping }), "milk");
  assert.deepEqual(second.redmart_reference, { rank: 2, title: "Product 2", pack_size: "1 pack" });
  assert.ok(!JSON.stringify(second.redmart_reference).includes("stale"));
});

test("backup catalog falls back to the lowest catalog rank and flags reference_rank_changed when the mapped reference rank is gone", () => {
  const cheese = itemOf(build(), "cheese"); // mapping reference rank 2, catalog only has rank 1
  assert.deepEqual(cheese.redmart_reference, { rank: 1, title: "Cheese", pack_size: "1 pack", reference_rank_changed: true, mapping_rank: 2 });
  assert.equal(cheese.status, "substitute");

  const mapping = mappingFixture();
  mapping.mappings[0].redmart_reference = { rank: 7, title: "gone", pack_size: "gone" };
  const milk = itemOf(build({ mapping }), "milk");
  assert.deepEqual(milk.redmart_reference, { rank: 1, title: "RedMart Milk 1L", pack_size: "1 pack", reference_rank_changed: true, mapping_rank: 7 });

  const parsed = parse(renderYaml(build().document));
  assert.equal(parsed.items.find((item) => item.catalog_item_id === "cheese").redmart_reference.reference_rank_changed, true);
  assert.equal(parsed.items.find((item) => item.catalog_item_id === "milk").redmart_reference.reference_rank_changed, undefined);
});

test("backup catalog YAML is parseable with the expected header and fields", () => {
  const result = build();
  const parsed = parse(renderYaml(result.document));
  assert.equal(parsed.backup_catalog_version, 1);
  assert.equal(parsed.status, "inactive");
  assert.equal(parsed.store.store_id, 165);
  assert.deepEqual(parsed.generated_from, { mapping: "mapping.yaml", fairprice_snapshot: "snap.json", date: "2026-11-17" });
  assert.equal(parsed.items.length, 5);
  const first = parsed.items[0].fairprice_products[0];
  assert.equal(typeof first.article_id, "string");
  assert.equal(first.observed_price_date, "2026-11-17");
  assert.deepEqual(parsed, JSON.parse(JSON.stringify(result.document)));
});

test("shortenNotes collapses whitespace and caps length", () => {
  assert.equal(shortenNotes("a\n  b"), "a b");
  assert.equal(shortenNotes("x".repeat(500)).length, 200);
  assert.equal(shortenNotes(undefined), "");
});

test("history rows use FairPrice ids, backup ranks and promo sources, and re-running a date is idempotent", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fp-backup-"));
  try {
    const path = join(dir, "price-history.csv");
    writePriceHistory(path, [
      { date: "2026-11-17", store: "redmart", catalog_item_id: "milk", rank: 1, product_id: "i1-s1", title: "RedMart Milk", pack_size: "1 L", price_sgd: 3.5, source: "redmart-static-page" },
      { date: "2026-11-17", store: "fairprice", catalog_item_id: "milk", rank: 9, product_id: "fp-stale", title: "Stale", pack_size: "1L", price_sgd: 1, source: "fairprice-api" },
    ]);
    const { historyRows } = build();
    const milkRows = historyRows.filter((row) => row.catalog_item_id === "milk");
    assert.deepEqual(milkRows.map((row) => [row.rank, row.product_id, row.price_sgd, row.source]), [
      [1, "fp-13000003", 4, "fairprice-api"],
      [2, "fp-13000001", 3, "fairprice-api"],
      [3, "fp-13000002", 2, "fairprice-api-promo"],
      [4, "fp-13000009", 2.5, "fairprice-api"],
    ]);

    updateHistory(path, historyRows);
    const once = await readFile(path, "utf8");
    updateHistory(path, historyRows);
    assert.equal(await readFile(path, "utf8"), once);

    const rows = readPriceHistory(path);
    assert.equal(rows.filter((row) => row.store === "redmart").length, 1);
    assert.equal(rows.filter((row) => row.store === "fairprice").length, historyRows.length);
    assert.equal(rows.some((row) => row.product_id === "fp-stale"), false);
    assert.equal(rows.every((row) => row.store !== "fairprice" || row.date === "2026-11-17"), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("build-backup-catalog CLI writes the YAML and prints a summary", async () => {
  const dir = await mkdtemp(join(tmpdir(), "fp-backup-cli-"));
  try {
    const catalogPath = join(dir, "catalog.yaml");
    const mappingPath = join(dir, "mapping.yaml");
    const snapshotPath = join(dir, "snapshot.json");
    const outPath = join(dir, "backup.yaml");
    const { stringify } = await import("yaml");
    await writeFile(catalogPath, stringify(catalogFixture()));
    await writeFile(mappingPath, stringify(mappingFixture()));
    await writeFile(snapshotPath, JSON.stringify(snapshotFixture()));
    const { stdout } = await run(process.execPath, [
      "experiments/fairprice/build-backup-catalog.mjs",
      "--fairprice", snapshotPath, "--mapping", mappingPath, "--catalog", catalogPath, "--out", outPath,
    ]);
    assert.match(stdout, /with substitutes: 3; without: 2; total products: 6/);
    const parsed = parse(await readFile(outPath, "utf8"));
    assert.equal(parsed.items.length, 5);

    await assert.rejects(run(process.execPath, ["experiments/fairprice/build-backup-catalog.mjs"]), /Missing --fairprice/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- repository consistency

const backupUrl = new URL("../experiments/fairprice/backup-catalog.yaml", import.meta.url);
const repoBackupExists = existsSync(backupUrl);

test("repository backup catalog is consistent with grocery-catalog.yaml", { skip: !repoBackupExists && "experiments/fairprice/backup-catalog.yaml not generated" }, async () => {
  const backup = parse(await readFile(backupUrl, "utf8"));
  const catalog = parse(await readFile(new URL("../grocery-catalog.yaml", import.meta.url), "utf8"));
  const catalogIds = new Set(catalog.items.map((item) => item.id));
  assert.equal(backup.backup_catalog_version, 1);
  assert.equal(backup.status, "inactive");
  const seen = new Set();
  for (const item of backup.items) {
    assert.ok(catalogIds.has(item.catalog_item_id), `${item.catalog_item_id} is not in grocery-catalog.yaml`);
    assert.ok(!seen.has(item.catalog_item_id), `${item.catalog_item_id} appears twice`);
    seen.add(item.catalog_item_id);
    assert.ok(["substitute", "no_substitute"].includes(item.status), `${item.catalog_item_id} status`);
    item.fairprice_products.forEach((product, index) => {
      assert.equal(product.rank, index + 1, `${item.catalog_item_id} ranks must be 1..n`);
      assert.match(product.url, /^https:\/\/www\.fairprice\.com\.sg\/product\/[^/\s]+$/, `${item.catalog_item_id} product url must end with a slug`);
    });
    assert.equal(item.status === "substitute", item.fairprice_products.length > 0, `${item.catalog_item_id} status matches products`);
  }
  assert.deepEqual([...seen].sort(), [...catalogIds].sort(), "every catalog item has a backup entry");
});

import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  PRICE_HISTORY_COLUMNS,
  formatPrice,
  mergePriceHistory,
  readPriceHistory,
  writePriceHistory
} from "../tools/price-history.mjs";
import { collectSnapshot, parseRedMartProductHtml } from "../tools/fetch-redmart-prices.mjs";

const run = promisify(execFile);
const cwd = new URL("..", import.meta.url);

const historyRow = (overrides = {}) => ({
  date: "2026-11-19",
  store: "redmart",
  catalog_item_id: "apple_juice",
  rank: 1,
  product_id: "i1-s2",
  title: "Apple Juice 1L",
  pack_size: "1 L",
  price_sgd: 4.5,
  source: "redmart-static-page",
  ...overrides
});

const tempDir = () => mkdtemp(join(tmpdir(), "price-tracking-"));

test("price history CSV round-trips commas, quotes and line breaks", async () => {
  const path = join(await tempDir(), "history.csv");
  const rows = [
    historyRow({ title: 'Tea, "Premium" Blend\nTwin pack', pack_size: "2, x 50 g", price_sgd: 7 }),
    historyRow({ catalog_item_id: "eggs", product_id: "i3-s4", title: "", price_sgd: 3.456 })
  ];
  writePriceHistory(path, rows);

  const text = await readFile(path, "utf8");
  assert.ok(text.startsWith(`${PRICE_HISTORY_COLUMNS.join(",")}\n`));
  assert.ok(text.endsWith("\n") && !text.includes("\r"));
  assert.match(text, /"Tea, ""Premium"" Blend\nTwin pack","2, x 50 g",7\.00,/);
  assert.match(text, /,3\.46,/, "prices are written with two decimals");

  const read = readPriceHistory(path);
  assert.equal(read.length, 2);
  assert.equal(read[0].title, 'Tea, "Premium" Blend\nTwin pack');
  assert.equal(read[0].pack_size, "2, x 50 g");
  assert.equal(read[0].price_sgd, 7);
  assert.equal(read[1].title, "");
  assert.equal(typeof read[1].rank, "number");
  assert.equal(formatPrice(4.5), "4.50");
});

test("a missing price history file reads as empty and a wrong header is rejected", async () => {
  const dir = await tempDir();
  assert.deepEqual(readPriceHistory(join(dir, "absent.csv")), []);
  await writeFile(join(dir, "bad.csv"), "date,price\n2026-01-01,1\n");
  assert.throws(() => readPriceHistory(join(dir, "bad.csv")), /header/);
});

test("the CSV reader accepts CRLF line endings", async () => {
  const path = join(await tempDir(), "crlf.csv");
  await writeFile(path, `${PRICE_HISTORY_COLUMNS.join(",")}\r\n2026-11-19,redmart,eggs,1,i1-s2,Eggs,10 pcs,3.50,catalog-baseline\r\n`);
  const [row] = readPriceHistory(path);
  assert.equal(row.price_sgd, 3.5);
  assert.equal(row.source, "catalog-baseline");
});

test("mergePriceHistory replaces the same date/store/product, keeps others and sorts", () => {
  const existing = [
    historyRow({ date: "2026-11-20", catalog_item_id: "zucchini", product_id: "i9-s9" }),
    historyRow({ price_sgd: 4.5 }),
    historyRow({ store: "fairprice", product_id: "fp-1", rank: 1 }),
    historyRow({ catalog_item_id: "apple_juice", rank: 2, product_id: "i5-s6" })
  ];
  const incoming = [historyRow({ price_sgd: 4.8 }), historyRow({ date: "2026-11-18", product_id: "i1-s2" })];

  const merged = mergePriceHistory(existing, incoming);
  assert.equal(merged.length, 5);
  assert.deepEqual(
    merged.map((row) => [row.date, row.store, row.catalog_item_id, row.rank]),
    [
      ["2026-11-18", "redmart", "apple_juice", 1],
      ["2026-11-19", "fairprice", "apple_juice", 1],
      ["2026-11-19", "redmart", "apple_juice", 1],
      ["2026-11-19", "redmart", "apple_juice", 2],
      ["2026-11-20", "redmart", "zucchini", 1]
    ]
  );
  assert.equal(merged.find((row) => row.date === "2026-11-19" && row.product_id === "i1-s2").price_sgd, 4.8);
  assert.deepEqual(mergePriceHistory(merged, incoming), merged, "re-merging the same rows changes nothing");
});

test("mergePriceHistory sorts ranks numerically", () => {
  const merged = mergePriceHistory([], [historyRow({ rank: 10, product_id: "a" }), historyRow({ rank: 2, product_id: "b" })]);
  assert.deepEqual(merged.map((row) => row.rank), [2, 10]);
});

const trackingData = (overrides = {}) => ({ pdt_sku: "111", pdt_simplesku: "222", pdt_name: "Test Juice 1L", pdt_price: "$4.55", ...overrides });
// Lazada embeds the tracking object as a JSON-encoded string, so the page holds JSON inside a JSON string.
const page = (data, extra = "") =>
  `<html><head><title>Test Juice | Lazada</title>${extra}</head><body><script>var pdpTrackingData = ${JSON.stringify(JSON.stringify(data))};</script></body></html>`;
const options = { status: 200, url: "https://www.lazada.sg/products/i111-s222.html" };

test("parseRedMartProductHtml reads title, price and schema availability from an ok page", () => {
  const parsed = parseRedMartProductHtml(
    page(trackingData(), '<link itemprop="availability" href="http://schema.org/InStock"/>'),
    options
  );
  assert.equal(parsed.status, "ok");
  assert.equal(parsed.title_live, "Test Juice 1L");
  assert.equal(parsed.price_sgd, 4.55);
  assert.equal(parsed.in_stock, true);
  assert.equal(parsed.http, 200);

  const outOfStock = parseRedMartProductHtml(
    page(trackingData(), '<script type="application/ld+json">{"offers":{"availability":"https://schema.org/OutOfStock"}}</script>'),
    options
  );
  assert.equal(outOfStock.in_stock, false);
  assert.equal(parseRedMartProductHtml(page(trackingData()), options).in_stock, null);
});

test("parseRedMartProductHtml flags unavailable, identity mismatch and challenge pages", () => {
  assert.equal(parseRedMartProductHtml("<html>Not Found</html>", { ...options, status: 404 }).status, "unavailable");
  assert.equal(
    parseRedMartProductHtml(page(trackingData({ pdt_name: "This product is no longer available" })), options).status,
    "unavailable"
  );
  assert.equal(
    parseRedMartProductHtml("<html><title>This item is No Longer Available</title></html>", options).status,
    "unavailable"
  );

  const mismatch = parseRedMartProductHtml(page(trackingData({ pdt_simplesku: "999" })), options);
  assert.equal(mismatch.status, "identity_mismatch");
  assert.match(mismatch.notes, /s999/);
  const expected = parseRedMartProductHtml(page(trackingData()), { status: 200, url: "https://www.lazada.sg/x", expected: { itemId: "111", skuId: "333" } });
  assert.equal(expected.status, "identity_mismatch", "explicit expected ids win over the response URL");

  const challenge = parseRedMartProductHtml('<html><script>location.href="https://www.lazada.sg/_____tmd_____/punish?x5secdata=abc"</script></html>', options);
  assert.equal(challenge.status, "challenge");
  assert.equal(parseRedMartProductHtml("<html>Please solve the captcha</html>", options).status, "challenge");
  assert.equal(parseRedMartProductHtml("<html>nothing useful</html>", options).status, "error");
  assert.equal(parseRedMartProductHtml(page(trackingData({ pdt_price: "" })), options).status, "error");
});

test("collectSnapshot stops after two consecutive challenges and never fetches the rest", async () => {
  const products = [1, 2, 3, 4].map((n) => ({
    catalog_item_id: `item${n}`,
    rank: 1,
    title: `Item ${n}`,
    item_id: String(n),
    sku_id: String(n * 10),
    canonical_url: `https://www.lazada.sg/products/i${n}-s${n * 10}.html`,
    pack_size: "1 pc",
    observed_price_sgd: 1
  }));
  const fetched = [];
  const sleeps = [];
  const fetchFn = async (url) => {
    fetched.push(url);
    return { status: 200, url, text: async () => "<html>captcha</html>" };
  };

  const { rows, stopped } = await collectSnapshot(products, { fetchFn, sleepFn: async (ms) => sleeps.push(ms), random: () => 0, delayMin: 3, delayMax: 5 });
  assert.equal(stopped, true);
  assert.equal(fetched.length, 2);
  assert.deepEqual(sleeps, [3000], "one pause between the two fetched requests");
  assert.deepEqual(rows.map((row) => row.status), ["challenge", "challenge", "error", "error"]);
  assert.equal(rows[3].notes, "not fetched: stopped after challenge");
  assert.equal(rows[3].price_sgd, null);

  const ok = async (url) => ({ status: 200, url, text: async () => page(trackingData({ pdt_sku: url.match(/i(\d+)-/)[1], pdt_simplesku: url.match(/s(\d+)\./)[1] })) });
  const clean = await collectSnapshot(products, { fetchFn: ok, sleepFn: async () => {}, delayMin: 0, delayMax: 0 });
  assert.equal(clean.stopped, false);
  assert.deepEqual(clean.rows.map((row) => row.status), ["ok", "ok", "ok", "ok"]);
  assert.match(clean.rows[0].fetched_at, /[+-]\d{2}:\d{2}$/);
});

const FIXTURE_CATALOG = `catalog_version: 2
items:
  - id: apple_juice
    category: drinks
    default_quantity: 2
    aliases:
      - apple juice
    preferred_products:
      - rank: 1
        title: "Apple Juice 1L"
        item_id: "111"
        sku_id: "222"
        canonical_url: "https://www.lazada.sg/products/i111-s222.html"
        pack_size: "1 L"
        observed_price_sgd: 4.50
      - rank: 2
        title: "Apple Juice 2L"
        item_id: "112"
        sku_id: "223"
        canonical_url: "https://www.lazada.sg/products/i112-s223.html"
        pack_size: "2 L"
        observed_price_sgd: 7.00
    notes: "Keep this comment, text and layout untouched."

  - id: eggs
    category: fresh
    default_quantity: 1
    aliases:
      - eggs
    preferred_products:
      - rank: 1
        title: "Eggs, Large"
        item_id: "300"
        sku_id: "400"
        canonical_url: "https://www.lazada.sg/products/i300-s400.html"
        pack_size: "10 pcs"
        observed_price_sgd: 3.20
      - rank: 2
        title: "Eggs, Small"
        item_id: "301"
        sku_id: "401"
        canonical_url: "https://www.lazada.sg/products/i301-s401.html"
        pack_size: "10 pcs"
        observed_price_sgd: 2.90
`;

const snapshotRow = (overrides) => ({
  catalog_item_id: "apple_juice",
  rank: 1,
  item_id: "111",
  sku_id: "222",
  canonical_url: "https://www.lazada.sg/products/i111-s222.html",
  title_catalog: "Apple Juice 1L",
  title_live: "Apple Juice 1L (new look)",
  pack_size_catalog: "1 L",
  observed_price_sgd: 4.5,
  price_sgd: 4.8,
  in_stock: true,
  status: "ok",
  http: 200,
  fetched_at: "2026-11-19T17:30:00+00:00",
  notes: "",
  ...overrides
});

async function fixture() {
  const dir = await tempDir();
  const paths = { catalog: join(dir, "catalog.yaml"), history: join(dir, "price-history.csv"), snapshot: join(dir, "snapshot.json") };
  await writeFile(paths.catalog, FIXTURE_CATALOG);
  const snapshot = [
    snapshotRow({}),
    snapshotRow({ rank: 2, item_id: "112", sku_id: "223", price_sgd: 7, title_live: "Apple Juice 2L" }),
    snapshotRow({ catalog_item_id: "eggs", item_id: "300", sku_id: "400", title_live: "Eggs, Large", price_sgd: 3.2 }),
    snapshotRow({ catalog_item_id: "gone", item_id: "9", sku_id: "9", price_sgd: 1 }),
    snapshotRow({ catalog_item_id: "eggs", rank: 2, item_id: "301", sku_id: "401", status: "unavailable", price_sgd: null })
  ];
  await writeFile(paths.snapshot, JSON.stringify(snapshot));
  const track = (...extra) =>
    run(process.execPath, ["tools/track-prices.mjs", "--redmart", paths.snapshot, "--catalog", paths.catalog, "--history", paths.history, ...extra], { cwd });
  return { paths, track };
}

test("track-prices updates changed prices, inserts observed_price_date and appends history", async () => {
  const { paths, track } = await fixture();
  const { stdout } = await track();

  // 19 Nov 17:30 UTC is already 20 Nov in Singapore.
  const catalog = await readFile(paths.catalog, "utf8");
  assert.equal(
    catalog,
    FIXTURE_CATALOG.replace("observed_price_sgd: 4.50\n", 'observed_price_sgd: 4.80\n        observed_price_date: "2026-11-20"\n')
      .replace("observed_price_sgd: 7.00\n", 'observed_price_sgd: 7.00\n        observed_price_date: "2026-11-20"\n')
      .replace("observed_price_sgd: 3.20\n", 'observed_price_sgd: 3.20\n        observed_price_date: "2026-11-20"\n')
  );

  const history = readPriceHistory(paths.history);
  assert.equal(history.length, 3);
  assert.deepEqual(history[0], {
    date: "2026-11-20",
    store: "redmart",
    catalog_item_id: "apple_juice",
    rank: 1,
    product_id: "i111-s222",
    title: "Apple Juice 1L (new look)",
    pack_size: "1 L",
    price_sgd: 4.8,
    source: "redmart-static-page"
  });
  assert.equal(history[2].title, "Eggs, Large");

  assert.match(stdout, /apple_juice #1: 4\.50 → 4\.80 \(\+0\.30, \+6\.7%\)/);
  assert.match(stdout, /1 up, 0 down, 2 unchanged/);
  assert.match(stdout, /gone #1/, "products missing from the catalog are reported");
  assert.match(stdout, /eggs #2: snapshot status unavailable/, "unavailable snapshot rows are reported, not written");
  assert.match(stdout, /12\.20 → 12\.80/, "catalog value: 2 × 4.50 + 3.20 → 2 × 4.80 + 3.20");
});

test("a second identical run is idempotent for the catalog and the history", async () => {
  const { paths, track } = await fixture();
  await track();
  const catalogAfterFirst = await readFile(paths.catalog, "utf8");
  const historyAfterFirst = await readFile(paths.history, "utf8");

  const { stdout } = await track();
  assert.equal(await readFile(paths.catalog, "utf8"), catalogAfterFirst);
  assert.equal(await readFile(paths.history, "utf8"), historyAfterFirst);
  assert.match(stdout, /0 up, 0 down, 3 unchanged/);
});

test("a later date refreshes observed_price_date and adds history rows without duplicating", async () => {
  const { paths, track } = await fixture();
  await track();
  await track("--date", "2026-11-25");

  const catalog = await readFile(paths.catalog, "utf8");
  assert.equal((catalog.match(/observed_price_date: "2026-11-25"/g) ?? []).length, 3);
  assert.equal(catalog.includes("2026-11-20"), false);
  const dates = readPriceHistory(paths.history).map((row) => row.date);
  assert.deepEqual(dates, ["2026-11-20", "2026-11-20", "2026-11-20", "2026-11-25", "2026-11-25", "2026-11-25"]);
});

test("track-prices --dry-run reports without writing anything", async () => {
  const { paths, track } = await fixture();
  const { stdout } = await track("--dry-run");
  assert.match(stdout, /DRY RUN/);
  assert.match(stdout, /4\.50 → 4\.80/);
  assert.equal(await readFile(paths.catalog, "utf8"), FIXTURE_CATALOG);
  assert.equal(existsSync(paths.history), false);
});

test("track-prices reports malformed invocations", async () => {
  await assert.rejects(run(process.execPath, ["tools/track-prices.mjs"], { cwd }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /--redmart is required/);
    return true;
  });
  await assert.rejects(run(process.execPath, ["tools/track-prices.mjs", "--redmart", "x.json", "--date", "19/11"], { cwd }), /--date must be YYYY-MM-DD/);
});

test("an older snapshot records history but never moves the catalog backwards", async () => {
  const { paths, track } = await fixture();
  await track();
  const catalogAfterFirst = await readFile(paths.catalog, "utf8");

  const older = [snapshotRow({ price_sgd: 9.99 })];
  await writeFile(paths.snapshot, JSON.stringify(older));
  const { stdout } = await track("--date", "2026-11-01");

  assert.equal(await readFile(paths.catalog, "utf8"), catalogAfterFirst, "price and observed_price_date stay as they were");
  assert.match(stdout, /apple_juice #1: older snapshot, catalog kept/);
  const history = readPriceHistory(paths.history);
  const oldRow = history.find((row) => row.date === "2026-11-01");
  assert.equal(oldRow.price_sgd, 9.99);
  assert.equal(history.filter((row) => row.date === "2026-11-20").length, 3);
});

test("track-prices rejects zero and non-finite snapshot prices", async () => {
  const { paths, track } = await fixture();
  await writeFile(
    paths.snapshot,
    JSON.stringify([snapshotRow({ price_sgd: 0 }), snapshotRow({ rank: 2, item_id: "112", sku_id: "223", price_sgd: -1 }), snapshotRow({ catalog_item_id: "eggs", item_id: "300", sku_id: "400", price_sgd: "3.20" })])
  );
  const { stdout } = await track();

  assert.match(stdout, /apple_juice #1: invalid snapshot price 0/);
  assert.match(stdout, /apple_juice #2: invalid snapshot price -1/);
  assert.match(stdout, /eggs #1: invalid snapshot price "3\.20"/);
  assert.equal(await readFile(paths.catalog, "utf8"), FIXTURE_CATALOG);
  assert.deepEqual(readPriceHistory(paths.history), []);
});

test("readPriceHistory rejects invalid rows with the line number", async () => {
  const dir = await tempDir();
  const header = PRICE_HISTORY_COLUMNS.join(",");
  const good = "2026-11-19,redmart,eggs,1,i1-s2,Eggs,10 pcs,3.50,catalog-baseline";
  const cases = [
    ["2026-11-19,redmart,eggs,1,i1-s2,Eggs,10 pcs,,catalog-baseline", /line 3.*price_sgd/],
    ["2026-11-19,redmart,eggs,1,i1-s2,Eggs,10 pcs,0.00,catalog-baseline", /line 3.*price_sgd/],
    ["2026-11-19,redmart,eggs,1,i1-s2,Eggs,10 pcs,abc,catalog-baseline", /line 3.*price_sgd/],
    ["19/11/2026,redmart,eggs,1,i1-s2,Eggs,10 pcs,3.50,x", /line 3.*date/],
    ["2026-11-19,walmart,eggs,1,i1-s2,Eggs,10 pcs,3.50,x", /line 3.*store/],
    ["2026-11-19,redmart,eggs,1.5,i1-s2,Eggs,10 pcs,3.50,x", /line 3.*rank/],
    ["2026-11-19,redmart,eggs,,i1-s2,Eggs,10 pcs,3.50,x", /line 3.*rank/],
    ["2026-11-19,redmart,eggs,1,,Eggs,10 pcs,3.50,x", /line 3.*product_id/]
  ];
  for (const [bad, pattern] of cases) {
    const path = join(dir, "bad.csv");
    await writeFile(path, `${header}\n${good}\n${bad}\n`);
    assert.throws(() => readPriceHistory(path), pattern, bad);
  }
  // Line numbers count line breaks inside quoted fields.
  const path = join(dir, "multiline.csv");
  await writeFile(path, `${header}\n2026-11-19,redmart,eggs,1,i1-s2,"Eggs\nLarge",10 pcs,3.50,x\n2026-11-19,redmart,eggs,2,i1-s3,Eggs,10 pcs,0,x\n`);
  assert.throws(() => readPriceHistory(path), /line 4/);
});

test("track-prices stops on an invalid history row and writes nothing", async () => {
  const { paths, track } = await fixture();
  const badHistory = `${PRICE_HISTORY_COLUMNS.join(",")}\n2026-11-19,redmart,eggs,1,i1-s2,Eggs,10 pcs,,catalog-baseline\n`;
  await writeFile(paths.history, badHistory);

  await assert.rejects(track(), (error) => {
    assert.match(error.stderr, /line 2.*price_sgd/);
    return true;
  });
  assert.equal(await readFile(paths.catalog, "utf8"), FIXTURE_CATALOG, "the catalog was not touched");
  assert.equal(await readFile(paths.history, "utf8"), badHistory);
});

test("mergePriceHistory with replaceDateStore drops every existing row of that date and store", () => {
  const existing = [
    historyRow({ product_id: "i1-s2" }),
    historyRow({ product_id: "i9-s9", catalog_item_id: "gone" }),
    historyRow({ store: "fairprice", product_id: "fp-1" }),
    historyRow({ date: "2026-11-18", product_id: "i9-s9", catalog_item_id: "gone" })
  ];
  const merged = mergePriceHistory(existing, [historyRow({ product_id: "i1-s2", price_sgd: 5 })], { replaceDateStore: true });
  assert.deepEqual(merged.map((row) => [row.date, row.store, row.product_id]), [
    ["2026-11-18", "redmart", "i9-s9"],
    ["2026-11-19", "fairprice", "fp-1"],
    ["2026-11-19", "redmart", "i1-s2"]
  ]);
  assert.equal(mergePriceHistory(existing, [historyRow({ product_id: "i1-s2" })]).length, 4, "the default merge keeps the other rows");
});

test("a same-day track-prices rerun removes rows of products that dropped out of the snapshot", async () => {
  const { paths, track } = await fixture();
  await track();
  assert.equal(readPriceHistory(paths.history).length, 3);

  await writeFile(paths.snapshot, JSON.stringify([snapshotRow({})]));
  await track();
  const history = readPriceHistory(paths.history);
  assert.deepEqual(history.map((row) => row.product_id), ["i111-s222"]);
});

test("collectSnapshot counts HTTP 403/429/5xx toward the consecutive-block stop", async () => {
  const products = [1, 2, 3, 4].map((n) => ({
    catalog_item_id: `item${n}`,
    rank: 1,
    title: `Item ${n}`,
    item_id: String(n),
    sku_id: String(n * 10),
    canonical_url: `https://www.lazada.sg/products/i${n}-s${n * 10}.html`,
    pack_size: "1 pc",
    observed_price_sgd: 1
  }));
  for (const codes of [[403, 429], [503, 500], [429, 429]]) {
    const fetched = [];
    const fetchFn = async (url) => {
      fetched.push(url);
      return { status: codes[fetched.length - 1], url, text: async () => "" };
    };
    const { rows, stopped } = await collectSnapshot(products, { fetchFn, sleepFn: async () => {}, delayMin: 0, delayMax: 0 });
    assert.equal(stopped, true);
    assert.equal(fetched.length, 2, `${codes} stops the run after two blocked responses`);
    assert.deepEqual(rows.slice(0, 2).map((row) => [row.status, row.notes]), codes.map((code) => ["challenge", `http ${code}`]));
    assert.equal(rows[2].notes, "not fetched: stopped after challenge");
  }

  // A blocked response between successes resets the counter.
  const mixed = [403, 200, 403, 200].map(String);
  let call = 0;
  const fetchFn = async (url) => {
    const code = Number(mixed[call++]);
    const n = url.match(/i(\d+)-/)[1];
    return { status: code, url, text: async () => (code === 200 ? page(trackingData({ pdt_sku: n, pdt_simplesku: String(n * 10) })) : "") };
  };
  const { stopped } = await collectSnapshot(products, { fetchFn, sleepFn: async () => {}, delayMin: 0, delayMax: 0 });
  assert.equal(stopped, false);
});

test("collectSnapshot records the rest as interrupted when its signal aborts", async () => {
  const products = [1, 2, 3].map((n) => ({
    catalog_item_id: `item${n}`,
    rank: 1,
    title: `Item ${n}`,
    item_id: String(n),
    sku_id: String(n * 10),
    canonical_url: `https://www.lazada.sg/products/i${n}-s${n * 10}.html`,
    pack_size: "1 pc",
    observed_price_sgd: 1
  }));
  const controller = new AbortController();
  const fetchFn = async (url) => {
    controller.abort();
    return { status: 200, url, text: async () => page(trackingData({ pdt_sku: "1", pdt_simplesku: "10" })) };
  };
  const { rows, interrupted, stopped } = await collectSnapshot(products, { fetchFn, sleepFn: async () => {}, signal: controller.signal });
  assert.equal(interrupted, true);
  assert.equal(stopped, false);
  assert.equal(rows[0].status, "ok");
  assert.deepEqual(rows.slice(1).map((row) => [row.status, row.notes]), [["error", "not fetched: interrupted"], ["error", "not fetched: interrupted"]]);
});

test("an unavailable page that mentions captcha is unavailable, not a challenge", () => {
  const gone = parseRedMartProductHtml(
    '<html><head><title>Product no longer available | Lazada</title></head><body><script src="/captcha.js"></script></body></html>',
    options
  );
  assert.equal(gone.status, "unavailable");
  assert.equal(parseRedMartProductHtml("<html><body>This item is no longer available. captcha</body></html>", options).status, "unavailable");

  const normal = parseRedMartProductHtml(page(trackingData(), '<script src="https://cdn.example/captcha.js"></script>'), options);
  assert.equal(normal.status, "ok", "a page with tracking data is never a challenge");
  assert.equal(parseRedMartProductHtml("<html><title>Shop</title><body>captcha</body></html>", options).status, "error", "a titled non-product page with a captcha word is not a challenge");
  assert.equal(parseRedMartProductHtml("<html>x</html>", { ...options, url: "https://www.lazada.sg/_____tmd_____/punish?x5secdata=1" }).status, "challenge");
});

test("a product page with a zero price is an error, not ok", () => {
  for (const price of ["$0.00", "0"]) {
    const parsed = parseRedMartProductHtml(page(trackingData({ pdt_price: price })), options);
    assert.equal(parsed.status, "error", price);
  }
});

test("fetch-redmart-prices fails fast when the --out directory does not exist", async () => {
  const dir = await tempDir();
  await assert.rejects(
    run(process.execPath, ["tools/fetch-redmart-prices.mjs", "--out", join(dir, "missing", "snapshot.json")], { cwd }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /--out directory does not exist/);
      return true;
    }
  );
});

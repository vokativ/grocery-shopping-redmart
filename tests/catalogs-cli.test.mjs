import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { clearCommand, currentCommand, listCatalogs, listCommand, selectCommand } from "../tools/catalogs.mjs";
import { SELECTION_FILE, readSelection, writeSelection } from "../tools/resolve-catalog.mjs";
import { assertTrackable } from "../tools/track-prices.mjs";

const run = promisify(execFile);
const cwd = new URL("..", import.meta.url);

// Command logic is exercised through its exported functions with a fake root and an explicit empty env,
// so neither the real GROCERY_CATALOG nor the repository's selection file is ever read.
const REDMART = `catalog_version: 2
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
`;

const FAIRPRICE = `catalog_version: 2
store:
  platform: fairprice
  name: FairPrice Test Store
items:
  - id: milk
    category: dairy
    default_quantity: 1
    aliases:
      - milk
    preferred_products:
      - rank: 1
        title: "Fresh Milk 1L"
        article_id: "123456"
        pack_size: "1 L"
`;

const INVALID = "catalog_version: nope\nitems: []\n";

function fakeRoot(files = {}) {
  const root = mkdtempSync(join(tmpdir(), "catalogs-cli-"));
  for (const [name, content] of Object.entries(files)) {
    const path = join(root, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, content);
  }
  return root;
}

const fullRoot = () =>
  fakeRoot({
    "grocery-catalog.yaml": REDMART,
    "grocery-catalog.local.yaml": REDMART,
    "catalogs/redmart/alex.yaml": `store:\n  platform: redmart\n${REDMART.replace("apple_juice", "banana")}`,
    "catalogs/notes.yaml": "just: some notes\n",
    "examples/fairprice.catalog.yaml": FAIRPRICE,
    "examples/redmart.catalog.yaml": REDMART,
    "examples/other.yaml": REDMART
  });

const env = {};

test("list --json reports candidates, labels, platform, status and needs_choice before anything was chosen", async () => {
  const root = fullRoot();
  const report = JSON.parse((await listCommand({ json: true, root, env })).stdout);

  assert.deepEqual(Object.keys(report), ["active", "selection", "needs_choice", "reason", "candidates", "notes"]);
  assert.equal(report.needs_choice, true);
  assert.equal(report.selection, null);
  assert.equal(typeof report.reason, "string");
  assert.deepEqual(report.active, { path: "grocery-catalog.local.yaml", source: "local", platform: "redmart", status: "active" });

  assert.deepEqual(
    report.candidates.map((candidate) => [candidate.path, candidate.label]),
    [
      ["grocery-catalog.local.yaml", "personal-local"],
      ["grocery-catalog.yaml", "bundled-root"],
      ["catalogs/redmart/alex.yaml", "shared"],
      ["examples/fairprice.catalog.yaml", "example"],
      ["examples/redmart.catalog.yaml", "example"]
    ],
    "catalogs/notes.yaml has no store.platform and examples/other.yaml is not *.catalog.yaml"
  );
  const fairprice = report.candidates.find((candidate) => candidate.path === "examples/fairprice.catalog.yaml");
  assert.deepEqual(fairprice, {
    path: "examples/fairprice.catalog.yaml",
    label: "example",
    platform: "fairprice",
    status: "experimental",
    items: 1,
    store_name: "FairPrice Test Store",
    valid: true,
    active: false
  });
  const local = report.candidates[0];
  assert.deepEqual([local.platform, local.status, local.items, local.store_name, local.valid, local.active], ["redmart", "active", 1, null, true, true]);
  assert.equal(report.candidates.filter((candidate) => candidate.active).length, 1);
  assert.ok(report.notes.some((note) => /grocery-catalog\.local\.yaml/.test(note)), "the default is explained");
});

test("list falls back to the root catalog and reports invalid candidates with at most three errors", async () => {
  const root = fakeRoot({ "grocery-catalog.yaml": REDMART, "catalogs/redmart/bad.yaml": `store:\n  platform: redmart\n${INVALID}` });
  const report = await listCatalogs({ root, env });
  assert.equal(report.active.source, "root");
  const bad = report.candidates.find((candidate) => candidate.path === "catalogs/redmart/bad.yaml");
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length >= 1 && bad.errors.length <= 3);
});

test("needs_choice is false once a selection, env var or flag exists", async () => {
  const root = fullRoot();
  assert.equal((await listCatalogs({ root, env })).needs_choice, true);
  assert.equal((await listCatalogs({ root, env: { GROCERY_CATALOG: "grocery-catalog.yaml" } })).needs_choice, false);
  assert.equal((await listCatalogs({ root, env, flag: join(root, "grocery-catalog.yaml") })).needs_choice, false);

  writeSelection({ catalog: "grocery-catalog.yaml", platform: "redmart" }, root);
  const report = await listCatalogs({ root, env });
  assert.equal(report.needs_choice, false);
  assert.equal(report.selection.catalog, "grocery-catalog.yaml");
  assert.equal(report.active.source, "selection");
});

test("a selection that overrides the local catalog is called out", async () => {
  const root = fullRoot();
  writeSelection({ catalog: "examples/fairprice.catalog.yaml", platform: "fairprice" }, root);
  const report = await listCatalogs({ root, env });
  assert.deepEqual([report.active.path, report.active.platform, report.active.status], ["examples/fairprice.catalog.yaml", "fairprice", "experimental"]);
  assert.ok(report.notes.some((note) => /selection overrides grocery-catalog\.local\.yaml/.test(note)));
  assert.ok(report.notes.some((note) => /example/.test(note)));
  assert.equal(report.candidates.find((candidate) => candidate.active).path, "examples/fairprice.catalog.yaml");
});

test("list never throws on a stale or malformed selection", async () => {
  const root = fullRoot();
  writeSelection({ catalog: "catalogs/gone.yaml", platform: "redmart" }, root);
  const stale = await listCatalogs({ root, env });
  assert.equal(stale.active, null);
  assert.equal(stale.needs_choice, false);
  assert.ok(stale.notes.some((note) => /not found.*gone\.yaml/.test(note)));
  assert.equal(stale.candidates.some((candidate) => candidate.active), false);

  writeFileSync(join(root, SELECTION_FILE), "{ broken");
  const malformed = await listCatalogs({ root, env });
  assert.equal(malformed.active, null);
  assert.equal(malformed.selection, null);
  assert.equal(malformed.needs_choice, false);
  assert.equal(malformed.notes.filter((note) => /not valid JSON/.test(note)).length, 1);
});

test("list human output has a row per candidate, marks the active one and repeats the notes", async () => {
  const root = fullRoot();
  const { code, stdout } = await listCommand({ root, env });
  assert.equal(code, 0);
  assert.match(stdout, /^Active: grocery-catalog\.local\.yaml \(source: local, platform: redmart, status: active\)/);
  assert.match(stdout, /^\* +grocery-catalog\.local\.yaml +personal-local +redmart +active +1/m);
  assert.match(stdout, /examples\/fairprice\.catalog\.yaml +example +fairprice +experimental +1 +FairPrice Test Store +valid/);
  assert.match(stdout, /^Note: /m);
});

test("select refuses a missing, unreadable, invalid or unsupported catalog and writes nothing", async () => {
  const root = fakeRoot({
    "grocery-catalog.yaml": REDMART,
    "bad.yaml": INVALID,
    "weird.yaml": REDMART.replace("catalog_version: 2", "store:\n  platform: carrefour\ncatalog_version: 2"),
    "broken.yaml": "items: [unclosed\n"
  });
  for (const [path, pattern] of [
    [join(root, "missing.yaml"), /not found/],
    [join(root, "bad.yaml"), /invalid/],
    [join(root, "weird.yaml"), /carrefour/],
    [join(root, "broken.yaml"), /cannot read catalog/]
  ]) {
    const outcome = await selectCommand(path, { root, env });
    assert.equal(outcome.code, 1, path);
    assert.match(outcome.stderr, pattern, path);
  }
  assert.equal((await selectCommand(undefined, { root, env })).code, 1);
  assert.equal(existsSync(join(root, SELECTION_FILE)), false);
});

test("select validates, writes the selection and prints the active catalog; relative paths use the given cwd", async () => {
  const root = fullRoot();
  const outcome = await selectCommand("catalogs/redmart/alex.yaml", { root, env, cwd: root });
  assert.equal(outcome.code, 0);
  assert.match(outcome.stdout, /Selected catalogs\/redmart\/alex\.yaml/);
  assert.match(outcome.stdout, /Catalog: catalogs\/redmart\/alex\.yaml \(source: selection\)/);
  assert.match(outcome.stdout, /Platform: redmart \(active\)/);
  const selection = readSelection(root);
  assert.equal(selection.catalog, "catalogs/redmart/alex.yaml");
  assert.equal(selection.platform, "redmart");
  assert.equal(selection.acknowledged_experimental, false);
});

test("select records the experimental acknowledgement only when asked", async () => {
  const root = fullRoot();
  const without = await selectCommand("examples/fairprice.catalog.yaml", { root, env, cwd: root });
  assert.equal(without.code, 0, "a valid selection succeeds; `current` reports the missing confirmation");
  assert.equal(readSelection(root).acknowledged_experimental, false);
  assert.match(without.stdout, /Platform: fairprice \(experimental\)/);

  const confirmed = await selectCommand("examples/fairprice.catalog.yaml", { root, env, cwd: root, acknowledgeExperimental: true });
  assert.equal(confirmed.code, 0);
  assert.equal(readSelection(root).acknowledged_experimental, true);
  assert.equal(confirmed.stderr, "");
});

test("select warns when GROCERY_CATALOG overrides the new selection", async () => {
  const root = fullRoot();
  const outcome = await selectCommand("catalogs/redmart/alex.yaml", { root, cwd: root, env: { GROCERY_CATALOG: "grocery-catalog.yaml" } });
  assert.match(outcome.stderr, /GROCERY_CATALOG is set and overrides the selection/);
  assert.match(outcome.stdout, /source: env/);
});

test("current prints the active catalog, platform and status", async () => {
  const root = fullRoot();
  const outcome = await currentCommand({ root, env });
  assert.equal(outcome.code, 0);
  assert.equal(outcome.stdout, "Catalog: grocery-catalog.local.yaml (source: local)\nPlatform: redmart (active)");
});

test("current --expect-platform exits 0 on a match and 2 on a mismatch", async () => {
  const root = fullRoot();
  assert.equal((await currentCommand({ root, env, expectPlatform: "redmart" })).code, 0);
  const mismatch = await currentCommand({ root, env, expectPlatform: "fairprice" });
  assert.equal(mismatch.code, 2);
  assert.match(mismatch.stderr, /expected fairprice but the active catalog is redmart/);
});

test("current exits 3 for an unconfirmed experimental selection and 0 once acknowledged", async () => {
  const root = fullRoot();
  writeSelection({ catalog: "examples/fairprice.catalog.yaml", platform: "fairprice", acknowledged_experimental: false }, root);
  const unconfirmed = await currentCommand({ root, env });
  assert.equal(unconfirmed.code, 3);
  assert.match(unconfirmed.stderr, /experimental/);
  assert.equal((await currentCommand({ root, env, expectPlatform: "fairprice" })).code, 3);
  assert.equal((await currentCommand({ root, env, expectPlatform: "redmart" })).code, 2, "a platform mismatch is reported first");

  writeSelection({ catalog: "examples/fairprice.catalog.yaml", platform: "fairprice", acknowledged_experimental: true }, root);
  assert.equal((await currentCommand({ root, env })).code, 0);
});

test("a flag or env source counts as acknowledged for an experimental catalog", async () => {
  const root = fullRoot();
  writeSelection({ catalog: "grocery-catalog.yaml", platform: "redmart" }, root);
  const target = join(root, "examples", "fairprice.catalog.yaml");
  assert.equal((await currentCommand({ root, env: { GROCERY_CATALOG: target } })).code, 0);
  assert.equal((await currentCommand({ root, env, flag: target })).code, 0);
});

test("current exits 1 when the active catalog cannot be resolved or read", async () => {
  const root = fullRoot();
  writeSelection({ catalog: "catalogs/gone.yaml", platform: "redmart" }, root);
  const stale = await currentCommand({ root, env });
  assert.equal(stale.code, 1);
  assert.match(stale.stderr, /catalog from selection not found/);
  assert.equal((await currentCommand({ root, env: { GROCERY_CATALOG: "nope.yaml" } })).code, 1);

  const broken = fakeRoot({ "grocery-catalog.yaml": "items: [unclosed\n" });
  assert.equal((await currentCommand({ root: broken, env })).code, 1);

  const unsupported = fakeRoot({ "grocery-catalog.yaml": REDMART.replace("catalog_version: 2", "store:\n  platform: carrefour\ncatalog_version: 2") });
  const outcome = await currentCommand({ root: unsupported, env });
  assert.equal(outcome.code, 1);
  assert.match(outcome.stderr, /carrefour/);
});

test("clear deletes the selection file and is harmless when there is none", async () => {
  const root = fullRoot();
  writeSelection({ catalog: "grocery-catalog.yaml", platform: "redmart" }, root);
  assert.match(clearCommand({ root }).stdout, /Cleared/);
  assert.equal(existsSync(join(root, SELECTION_FILE)), false);
  assert.match(clearCommand({ root }).stdout, /No .* to clear/);
  assert.equal((await listCatalogs({ root, env })).needs_choice, true);
});

test("price tracking refuses non-redmart and example catalogs", () => {
  const root = fakeRoot();
  assert.doesNotThrow(() => assertTrackable(join(root, "grocery-catalog.local.yaml"), "redmart", root));
  assert.throws(() => assertTrackable(join(root, "catalogs", "fairprice", "a.yaml"), "fairprice", root), /only redmart/);
  assert.throws(() => assertTrackable(join(root, "examples", "redmart.catalog.yaml"), "redmart", root), /refuses example catalogs/);
});

// The scripts below are spawned with an explicit --catalog, which is resolved before the env var or the selection file.
test("dry-run --catalog prints the catalog line on stderr for --json and first on stdout otherwise", async () => {
  const root = fakeRoot({ "mine.yaml": REDMART });
  const catalog = join(root, "mine.yaml");

  const json = await run(process.execPath, ["tools/dry-run.mjs", "--json", "--catalog", catalog, "2 apple juice"], { cwd });
  assert.equal(JSON.parse(json.stdout)[0].matched, true, "stdout stays a bare JSON array");
  assert.equal(json.stderr.trim(), `Catalog: ${catalog} (source: flag)`);

  const human = await run(process.execPath, ["tools/dry-run.mjs", "--catalog", catalog, "apple juice"], { cwd });
  assert.equal(human.stdout.split("\n")[0], `Catalog: ${catalog} (source: flag)`);

  await assert.rejects(run(process.execPath, ["tools/dry-run.mjs", "--catalog", join(root, "gone.yaml"), "eggs"], { cwd }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /catalog from flag not found/);
    return true;
  });
});

test("validate-catalog accepts repeated --catalog and fails when any catalog is invalid", async () => {
  const root = fakeRoot({ "a.yaml": REDMART, "b.yaml": FAIRPRICE, "bad.yaml": INVALID });
  const ok = await run(process.execPath, ["tools/validate-catalog.mjs", "--catalog", join(root, "a.yaml"), "--catalog", join(root, "b.yaml")], { cwd });
  assert.equal(ok.stdout.match(/^Catalog: /gm).length, 2);
  assert.equal(ok.stdout.match(/^Catalog is valid: 1 household items, 0 household basket\(s\)\.$/gm).length, 2);

  await assert.rejects(
    run(process.execPath, ["tools/validate-catalog.mjs", "--catalog", join(root, "a.yaml"), "--catalog", join(root, "bad.yaml")], { cwd }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /Catalog is valid/);
      assert.match(error.stderr, /Catalog validation failed/);
      return true;
    }
  );
});

test("track-prices and fetch-redmart-prices refuse a fairprice catalog before doing any work", async () => {
  const root = fakeRoot({ "fp.yaml": FAIRPRICE, "snapshot.json": "[]" });
  const catalog = join(root, "fp.yaml");
  await assert.rejects(
    run(process.execPath, ["tools/track-prices.mjs", "--redmart", join(root, "snapshot.json"), "--catalog", catalog, "--history", join(root, "h.csv"), "--dry-run"], { cwd }),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /only redmart/);
      return true;
    }
  );
  await assert.rejects(run(process.execPath, ["tools/fetch-redmart-prices.mjs", "--out", join(root, "out.json"), "--catalog", catalog], { cwd }), (error) => {
    assert.equal(error.code, 1);
    assert.match(error.stderr, /only fetches RedMart/);
    return true;
  });
  assert.equal(existsSync(join(root, "out.json")), false);
  assert.equal(readFileSync(catalog, "utf8"), FAIRPRICE);
});

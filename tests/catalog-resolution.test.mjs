import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  REPO_ROOT,
  SELECTION_FILE,
  clearSelection,
  describeCatalog,
  historyPathFor,
  isExampleCatalog,
  readSelection,
  resolveCatalog,
  writeSelection
} from "../tools/resolve-catalog.mjs";

// Every test builds its own fake root and passes `env: {}`, so neither the real
// GROCERY_CATALOG nor the repository's selection file can influence the result.
function fakeRoot(files = ["grocery-catalog.yaml"]) {
  const root = mkdtempSync(join(tmpdir(), "catalog-resolution-"));
  for (const name of files) {
    const path = join(root, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, "catalog_version: 2\n");
  }
  return root;
}

const resolveIn = (root, options = {}) => resolveCatalog({ env: {}, root, ...options });

test("REPO_ROOT is the repository root", () => {
  assert.equal(existsSync(join(REPO_ROOT, "tools", "resolve-catalog.mjs")), true);
  assert.equal(existsSync(join(REPO_ROOT, "package.json")), true);
});

test("with no flag, env, selection or local file the root catalog is used", () => {
  const root = fakeRoot();
  assert.deepEqual(resolveIn(root), { path: join(root, "grocery-catalog.yaml"), source: "root" });
});

test("a local catalog beats the root catalog", () => {
  const root = fakeRoot(["grocery-catalog.yaml", "grocery-catalog.local.yaml"]);
  assert.deepEqual(resolveIn(root), { path: join(root, "grocery-catalog.local.yaml"), source: "local" });
});

test("a selection beats the local catalog and its path is relative to the root", () => {
  const root = fakeRoot(["grocery-catalog.yaml", "grocery-catalog.local.yaml", "catalogs/redmart/a.yaml"]);
  writeSelection({ catalog: "catalogs/redmart/a.yaml", platform: "redmart", acknowledged_experimental: false }, root);
  assert.deepEqual(resolveIn(root), { path: join(root, "catalogs", "redmart", "a.yaml"), source: "selection" });
});

test("GROCERY_CATALOG beats the selection and a relative value is resolved against the root, not the cwd", () => {
  const root = fakeRoot(["grocery-catalog.yaml", "catalogs/redmart/a.yaml", "catalogs/redmart/b.yaml"]);
  writeSelection({ catalog: "catalogs/redmart/a.yaml", platform: "redmart" }, root);
  const resolved = resolveIn(root, { env: { GROCERY_CATALOG: "catalogs/redmart/b.yaml" } });
  assert.deepEqual(resolved, { path: join(root, "catalogs", "redmart", "b.yaml"), source: "env" });
});

test("an empty GROCERY_CATALOG is ignored", () => {
  const root = fakeRoot();
  assert.equal(resolveIn(root, { env: { GROCERY_CATALOG: "" } }).source, "root");
});

test("the flag beats everything and a relative flag is resolved against the cwd", () => {
  const root = fakeRoot(["grocery-catalog.yaml", "catalogs/redmart/a.yaml", "catalogs/redmart/b.yaml"]);
  writeSelection({ catalog: "catalogs/redmart/a.yaml", platform: "redmart" }, root);
  const target = join(root, "catalogs", "redmart", "b.yaml");
  const relativeFlag = relative(process.cwd(), target);
  assert.notEqual(relativeFlag, target);
  assert.deepEqual(resolveIn(root, { flag: relativeFlag, env: { GROCERY_CATALOG: "catalogs/redmart/a.yaml" } }), { path: target, source: "flag" });
});

test("a stale flag, env or selection is a hard error and never falls through", () => {
  const root = fakeRoot(["grocery-catalog.yaml", "grocery-catalog.local.yaml"]);
  assert.throws(() => resolveIn(root, { flag: join(root, "missing.yaml") }), /catalog from flag not found: .*missing\.yaml/);
  assert.throws(() => resolveIn(root, { env: { GROCERY_CATALOG: "missing.yaml" } }), /catalog from env not found: .*missing\.yaml/);
  writeSelection({ catalog: "catalogs/gone.yaml", platform: "redmart" }, root);
  assert.throws(() => resolveIn(root), /catalog from selection not found: .*gone\.yaml/);
});

test("a directory is not a catalog", () => {
  const root = fakeRoot();
  mkdirSync(join(root, "dir.yaml"));
  assert.throws(() => resolveIn(root, { flag: join(root, "dir.yaml") }), /catalog from flag not found/);
});

test("a malformed selection file throws instead of being ignored", () => {
  const root = fakeRoot();
  writeFileSync(join(root, SELECTION_FILE), "{ not json");
  assert.throws(() => resolveIn(root), /not valid JSON/);
  assert.throws(() => readSelection(root), /not valid JSON/);
  writeFileSync(join(root, SELECTION_FILE), JSON.stringify({ platform: "redmart" }));
  assert.throws(() => resolveIn(root), /string "catalog"/);
  writeFileSync(join(root, SELECTION_FILE), JSON.stringify(["x"]));
  assert.throws(() => resolveIn(root), /string "catalog"/);
});

test("selection write, read and clear round-trip", () => {
  const root = fakeRoot(["catalogs/redmart/a.yaml"]);
  assert.equal(readSelection(root), null);
  assert.equal(clearSelection(root), false);

  const written = writeSelection({ catalog: join(root, "catalogs", "redmart", "a.yaml"), platform: "redmart", acknowledged_experimental: false }, root);
  assert.equal(written.catalog, "catalogs/redmart/a.yaml", "paths inside the root are stored repo-relative with forward slashes");
  assert.equal(written.platform, "redmart");
  assert.equal(written.acknowledged_experimental, false);
  assert.match(written.selected_at, /^\d{4}-\d{2}-\d{2}$/);

  const raw = readFileSync(join(root, SELECTION_FILE), "utf8");
  assert.equal(raw, `${JSON.stringify(written, null, 2)}\n`);
  assert.deepEqual(readSelection(root), written);

  assert.equal(clearSelection(root), true);
  assert.equal(existsSync(join(root, SELECTION_FILE)), false);
  assert.equal(readSelection(root), null);
});

test("a selection outside the root is stored as an absolute path and acknowledgement is strictly boolean", () => {
  const root = fakeRoot();
  const outside = fakeRoot(["mine.yaml"]);
  const written = writeSelection({ catalog: join(outside, "mine.yaml"), platform: "fairprice", acknowledged_experimental: "yes" }, root);
  assert.equal(written.catalog, join(outside, "mine.yaml"));
  assert.equal(written.acknowledged_experimental, false);
  assert.equal(resolveIn(root).path, join(outside, "mine.yaml"));
});

test("historyPathFor keeps price-history.csv for the root catalog only", () => {
  const root = fakeRoot();
  assert.equal(historyPathFor(join(root, "grocery-catalog.yaml"), root), join(root, "price-history.csv"));
  assert.equal(historyPathFor(join(root, "grocery-catalog.local.yaml"), root), join(root, "grocery-catalog.local.price-history.local.csv"));
  assert.equal(historyPathFor(join(root, "catalogs", "redmart", "alex.yaml"), root), join(root, "catalogs", "redmart", "alex.price-history.local.csv"));
  assert.equal(historyPathFor(join(root, "elsewhere", "cat.yml"), root), join(root, "elsewhere", "cat.price-history.local.csv"));
  // Same file name in another directory is not the root catalog.
  assert.equal(historyPathFor(join(root, "sub", "grocery-catalog.yaml"), root), join(root, "sub", "grocery-catalog.price-history.local.csv"));
});

test("isExampleCatalog is true only under <root>/examples/", () => {
  const root = fakeRoot();
  assert.equal(isExampleCatalog(join(root, "examples", "redmart.catalog.yaml"), root), true);
  assert.equal(isExampleCatalog(join(root, "examples", "nested", "x.yaml"), root), true);
  assert.equal(isExampleCatalog(join(root, "examples"), root), false);
  assert.equal(isExampleCatalog(join(root, "grocery-catalog.yaml"), root), false);
  assert.equal(isExampleCatalog(join(root, "examples-old", "x.yaml"), root), false);
  assert.equal(isExampleCatalog(join(root, "catalogs", "examples", "x.yaml"), root), false);
});

test("describeCatalog shows a repo-relative path inside the root and the full path outside", () => {
  const root = fakeRoot();
  assert.equal(describeCatalog({ path: join(root, "catalogs", "redmart", "a.yaml"), source: "selection" }, root), "catalogs/redmart/a.yaml (source: selection)");
  assert.equal(describeCatalog({ path: "/somewhere/else.yaml", source: "flag" }, root), "/somewhere/else.yaml (source: flag)");
});

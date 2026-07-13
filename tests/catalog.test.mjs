import assert from "node:assert/strict";
import test from "node:test";
import { loadCatalog, matchList, validateCatalog } from "../tools/catalog.mjs";

test("the repository catalog is valid", async () => {
  const catalog = await loadCatalog();
  assert.deepEqual(validateCatalog(catalog), []);
});

test("matching uses exact normalized aliases and quantity overrides", async () => {
  const catalog = await loadCatalog();
  const results = matchList(catalog, ["EGGS", "2 watermelon", "unknown treat"]);
  assert.equal(results[0].matched, true);
  assert.equal(results[0].item_id, "eggs");
  assert.equal(results[0].quantity, 1);
  assert.equal(results[1].item_id, "watermelon");
  assert.equal(results[1].quantity, 2);
  assert.deepEqual(results[2], { input: "unknown treat", matched: false });
});

test("validation detects duplicate pairs and canonical URL mismatch", () => {
  const catalog = {
    catalog_version: 1,
    items: [
      {
        id: "one",
        default_quantity: 1,
        aliases: ["one"],
        preferred_products: [
          { rank: 1, item_id: "1", sku_id: "2", canonical_url: "https://www.lazada.sg/products/i9-s2.html" },
          { rank: 2, item_id: "1", sku_id: "2", canonical_url: "https://www.lazada.sg/products/i1-s2.html" }
        ]
      }
    ]
  };
  const errors = validateCatalog(catalog);
  assert.ok(errors.some((error) => error.includes("does not match")));
  assert.ok(errors.some((error) => error.includes("duplicates item/SKU pair")));
});

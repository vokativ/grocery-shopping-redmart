import assert from "node:assert/strict";
import test from "node:test";
import { CANONICAL_URL, matchList, validateCatalog } from "../tools/catalog.mjs";
import { platformOf, platformStatus, platforms } from "../tools/platforms/index.mjs";

const fairpriceCatalog = () => ({
  catalog_version: 2,
  store: { platform: "fairprice", name: "FairPrice", country: "SG", store_id: "<YOUR_STORE_ID>" },
  items: [
    {
      id: "eggs",
      default_quantity: 1,
      aliases: ["eggs"],
      preferred_products: [
        { rank: 1, title: "Eggs 10s", article_id: 13018571, slug: "eggs-10s-13018571", pack_size: "10 pcs", marketplace: false },
        { rank: 2, title: "Eggs 6s", article_id: "13018572", pack_size: "6 pcs" }
      ]
    },
    {
      id: "milk",
      default_quantity: 2,
      aliases: ["milk"],
      preferred_products: [
        { rank: 1, title: "Milk 1L", article_id: "10001", canonical_url: "https://www.fairprice.com.sg/product/milk-1l-10001", pack_size: "1 L" }
      ]
    },
    {
      id: "rice",
      default_quantity: 1,
      aliases: ["rice"],
      preferred_products: [{ rank: 1, title: "Rice 5kg", article_id: "10002", pack_size: "5 kg" }]
    },
    {
      id: "tea",
      default_quantity: 1,
      aliases: ["tea"],
      preferred_products: [{ rank: 1, title: "Tea 20s", article_id: "10003", pack_size: "20 bags" }]
    }
  ],
  household_baskets: [
    { id: "breakfast", default_quantity: 3, aliases: ["breakfast"], members: [{ item: "eggs" }, { item: "milk" }] }
  ]
});

const redmartCatalog = () => ({
  catalog_version: 2,
  items: [
    {
      id: "eggs",
      default_quantity: 1,
      aliases: ["eggs"],
      preferred_products: [
        { rank: 1, title: "Eggs", item_id: "11", sku_id: "21", canonical_url: "https://www.lazada.sg/products/i11-s21.html", pack_size: "10 pcs" }
      ]
    },
    {
      id: "milk",
      default_quantity: 1,
      aliases: ["milk"],
      preferred_products: [
        { rank: 2, title: "Milk fallback", item_id: "12", sku_id: "22", canonical_url: "https://www.lazada.sg/products/i12-s22.html", pack_size: "1 L" },
        { rank: 1, title: "Milk", item_id: "13", sku_id: "23", canonical_url: "https://www.lazada.sg/products/i13-s23.html", pack_size: "1 L" }
      ],
      alias_product_ranks: { "milk": [1] }
    }
  ]
});

const firstProduct = (catalog) => catalog.items[0].preferred_products[0];

test("platform registry reports status and defaults a missing store.platform to redmart", () => {
  assert.deepEqual(Object.keys(platforms), ["redmart", "fairprice"]);
  assert.equal(platformOf({}), "redmart");
  assert.equal(platformOf({ store: { name: "x" } }), "redmart");
  assert.equal(platformOf(null), "redmart");
  assert.equal(platformOf(fairpriceCatalog()), "fairprice");
  assert.equal(platformStatus("redmart"), "active");
  assert.equal(platformStatus("fairprice"), "experimental");
  assert.equal(platformStatus("shopee"), undefined);
  assert.equal(platformStatus("constructor"), undefined);
  assert.ok(CANONICAL_URL instanceof RegExp);
});

test("a redmart catalog validates with or without an explicit store.platform", () => {
  assert.deepEqual(validateCatalog(redmartCatalog()), []);
  const explicit = redmartCatalog();
  explicit.store = { platform: "redmart" };
  assert.deepEqual(validateCatalog(explicit), []);
});

test("an unknown platform yields the single contract error and nothing else", () => {
  const catalog = redmartCatalog();
  catalog.store = { platform: "shopee" };
  catalog.items = [];
  assert.deepEqual(validateCatalog(catalog), [
    'store.platform "shopee" is not supported; supported: redmart, fairprice'
  ]);
  assert.throws(() => matchList(catalog, ["eggs"]), /not supported/);
});

test("a valid fairprice catalog passes, accepting numeric and string article ids", () => {
  assert.deepEqual(validateCatalog(fairpriceCatalog()), []);
});

test("fairprice rejects duplicate article ids across items, comparing numbers with strings", () => {
  const catalog = fairpriceCatalog();
  catalog.items[1].preferred_products[0].article_id = 13018571;
  const errors = validateCatalog(catalog);
  assert.deepEqual(errors, ["items[1].preferred_products[0] duplicates article_id 13018571"]);

  const stringTwin = fairpriceCatalog();
  stringTwin.items[1].preferred_products[0].article_id = "13018571";
  assert.deepEqual(validateCatalog(stringTwin), errors);
});

test("fairprice rejects missing, non-digit and inexact article ids", () => {
  for (const bad of [undefined, null, "", "abc", "12a", "-5", 1.5, -1, 2 ** 60, true]) {
    const catalog = fairpriceCatalog();
    if (bad === undefined) delete firstProduct(catalog).article_id;
    else firstProduct(catalog).article_id = bad;
    assert.deepEqual(
      validateCatalog(catalog),
      ["items[0].preferred_products[0].article_id must contain digits only"],
      `article_id ${String(bad)} must be rejected`
    );
  }
});

test("fairprice rejects a non-string slug, a non-boolean marketplace and a foreign canonical_url", () => {
  const slug = fairpriceCatalog();
  firstProduct(slug).slug = 42;
  assert.deepEqual(validateCatalog(slug), ["items[0].preferred_products[0].slug must be a string when present"]);

  const marketplace = fairpriceCatalog();
  firstProduct(marketplace).marketplace = "yes";
  assert.deepEqual(validateCatalog(marketplace), ["items[0].preferred_products[0].marketplace must be a boolean when present"]);

  for (const url of ["https://www.lazada.sg/products/i1-s2.html", "http://www.fairprice.com.sg/product/x", 7]) {
    const bad = fairpriceCatalog();
    firstProduct(bad).canonical_url = url;
    assert.deepEqual(
      validateCatalog(bad),
      ["items[0].preferred_products[0].canonical_url must start with https://www.fairprice.com.sg/product/ when present"],
      `canonical_url ${url} must be rejected`
    );
  }
});

test("fairprice still enforces the platform-neutral rank and alias rules", () => {
  const catalog = fairpriceCatalog();
  catalog.items[0].preferred_products[1].rank = 1;
  catalog.items[2].aliases = ["eggs"];
  assert.deepEqual(validateCatalog(catalog), [
    "items[0].preferred_products[1].rank duplicates rank 1",
    'items[2].aliases entry "eggs" duplicates the alias already declared by items[0]'
  ]);
});

test("redmart identity checks do not apply to a fairprice catalog and vice versa", () => {
  const redmartLike = redmartCatalog();
  redmartLike.store = { platform: "fairprice" };
  const errors = validateCatalog(redmartLike);
  assert.ok(errors.some((error) => error.endsWith("article_id must contain digits only")), errors.join("\n"));
  assert.ok(errors.every((error) => !error.includes("item_id") && !error.includes("sku_id")), errors.join("\n"));

  const fairpriceLike = fairpriceCatalog();
  delete fairpriceLike.store.platform;
  assert.ok(validateCatalog(fairpriceLike).some((error) => error.includes("item_id must contain digits only")));
});

test("a fairprice catalog flows through matchList with article identity and no canonical_url", () => {
  const catalog = fairpriceCatalog();
  const [eggs, rice, milk] = matchList(catalog, ["eggs", "2 rice", "milk"]);

  const [eggSelection] = eggs.selections;
  assert.equal(eggSelection.product, "Eggs 10s");
  assert.equal(eggSelection.article_id, "13018571", "numeric YAML ids are normalized to strings");
  assert.equal(eggSelection.slug, "eggs-10s-13018571");
  assert.equal(eggSelection.marketplace, false);
  assert.equal("canonical_url" in eggSelection, false);
  assert.deepEqual(Object.keys(eggSelection), ["item_id", "product", "pack_size", "quantity", "article_id", "slug", "marketplace", "candidates"]);

  const [riceSelection] = rice.selections;
  assert.equal(rice.quantity, 2);
  assert.deepEqual(Object.keys(riceSelection), ["item_id", "product", "pack_size", "quantity", "article_id", "candidates"],
    "absent optional fields are omitted rather than set to undefined");

  assert.equal(milk.selections[0].article_id, "10001");
  assert.equal("canonical_url" in milk.selections[0], false);
});

test("fairprice basket allocation keeps working and carries each member's own identity", () => {
  const catalog = fairpriceCatalog();
  assert.deepEqual(validateCatalog(catalog), []);
  const [basket, explicit] = matchList(catalog, ["breakfast", "1 breakfast"]);
  assert.deepEqual(basket.selections.map((s) => [s.item_id, s.quantity, s.article_id]), [
    ["eggs", 2, "13018571"],
    ["milk", 1, "10001"]
  ]);
  assert.deepEqual(explicit.selections.map((s) => [s.item_id, s.quantity, s.article_id]), [["eggs", 1, "13018571"]]);
});

test("fairprice suggestions tolerate products without item_id or canonical_url", () => {
  const [result] = matchList(fairpriceCatalog(), ["tea bags"]);
  assert.equal(result.matched, false);
  const suggestion = result.suggestions.find((entry) => entry.item_id === "tea");
  assert.equal(suggestion.requires_confirmation, true);
  assert.equal(suggestion.candidates[0].article_id, "10003");
});

test("redmart matchList keeps canonical_url between quantity and candidates", () => {
  const catalog = redmartCatalog();
  assert.deepEqual(validateCatalog(catalog), []);
  const [eggs, milk] = matchList(catalog, ["eggs", "milk"]);
  assert.deepEqual(Object.keys(eggs.selections[0]), ["item_id", "product", "pack_size", "quantity", "canonical_url", "candidates"]);
  assert.equal(eggs.selections[0].canonical_url, "https://www.lazada.sg/products/i11-s21.html");
  assert.equal("article_id" in eggs.selections[0], false);
  assert.deepEqual(
    Object.keys(milk.selections[0]),
    ["item_id", "product", "pack_size", "quantity", "canonical_url", "candidates", "eligible_candidates"]
  );
  assert.equal(milk.selections[0].canonical_url, "https://www.lazada.sg/products/i13-s23.html");
});

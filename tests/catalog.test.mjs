import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { allocateBasket, loadCatalog, matchList, validateCatalog } from "../tools/catalog.mjs";

const run = promisify(execFile);

// Members deliberately declare their ranks out of order and carry distinct products, so a
// regression that picks the wrong rank or attaches the wrong member's product is visible.
const basketCatalog = () => ({
  catalog_version: 2,
  items: [
    {
      id: "yuzu",
      default_quantity: 2,
      aliases: ["yuzu sodaly"],
      preferred_products: [
        { rank: 2, title: "Yuzu fallback 6 x 250ml", item_id: "111", sku_id: "211", canonical_url: "https://www.lazada.sg/products/i111-s211.html", pack_size: "6 x 250 ml" },
        { rank: 1, title: "Yuzu preferred 4 x 250ml", item_id: "11", sku_id: "21", canonical_url: "https://www.lazada.sg/products/i11-s21.html", pack_size: "4 x 250 ml" }
      ]
    },
    {
      id: "guava",
      default_quantity: 2,
      aliases: ["guava sodaly"],
      preferred_products: [
        { rank: 2, title: "Guava fallback 6 x 250ml", item_id: "122", sku_id: "222", canonical_url: "https://www.lazada.sg/products/i122-s222.html", pack_size: "6 x 250 ml" },
        { rank: 1, title: "Guava preferred 4 x 250ml", item_id: "12", sku_id: "22", canonical_url: "https://www.lazada.sg/products/i12-s22.html", pack_size: "4 x 250 ml" }
      ]
    },
    {
      id: "ginger",
      default_quantity: 1,
      aliases: ["ginger sodaly"],
      preferred_products: [
        { rank: 1, title: "Ginger preferred 4 x 250ml", item_id: "13", sku_id: "23", canonical_url: "https://www.lazada.sg/products/i13-s23.html", pack_size: "4 x 250 ml" }
      ]
    }
  ],
  // The basket total differs from every member default, so deriving the total from a member fails.
  household_baskets: [
    { id: "mix", default_quantity: 3, aliases: ["sodaly"], members: [{ item: "yuzu" }, { item: "guava" }] }
  ]
});

const allocationOf = (result) => result.selections.map((selection) => [selection.item_id, selection.quantity]);

test("the repository catalog is valid and still declares the Sodaly mix", async () => {
  const catalog = await loadCatalog();
  assert.deepEqual(validateCatalog(catalog), []);

  const basket = catalog.household_baskets.find((entry) => entry.id === "remedy_sodaly_mix");
  assert.ok(basket, "remedy_sodaly_mix must exist in the repository catalog");
  assert.equal(basket.default_quantity, 2);
  for (const alias of ["sodaly", "remedy sodaly"]) {
    assert.ok(basket.aliases.includes(alias), `basket must keep the ${alias} alias`);
  }
  assert.deepEqual(
    basket.members.map((member) => member.item),
    ["remedy_sodaly_guava", "remedy_sodaly_yuzu"],
    "member order decides who absorbs an odd remainder"
  );
});

test("matching uses exact normalized aliases and quantity overrides", async () => {
  const catalog = await loadCatalog();
  const results = matchList(catalog, ["EGGS", "2 watermelon", "unknown treat"]);
  assert.equal(results.length, 3);
  assert.equal(results[0].matched, true);
  assert.equal(results[0].item_id, "eggs");
  assert.equal(results[0].quantity, 1);
  assert.equal(results[0].selections.length, 1);
  assert.equal(results[0].selections[0].item_id, "eggs");
  assert.equal(results[0].selections[0].quantity, 1);
  assert.equal(results[1].item_id, "watermelon");
  assert.equal(results[1].quantity, 2);
  assert.equal(results[1].selections[0].quantity, 2);
  assert.deepEqual(results[2], { input: "unknown treat", input_index: 2, matched: false, selections: [] });
});

test("a generic basket alias expands into a mixed selection and keeps one result per input", async () => {
  const catalog = await loadCatalog();
  const results = matchList(catalog, ["Sodaly", "guava sodaly"]);
  assert.equal(results.length, 2, "each input line yields exactly one result");

  const [mix, singleFlavour] = results;
  assert.equal(mix.matched, true);
  assert.equal(mix.basket_id, "remedy_sodaly_mix");
  assert.equal(mix.item_id, undefined, "a basket result is not an item result");
  assert.equal(mix.quantity, 2, "basket quantity is the total pack count");
  assert.deepEqual(allocationOf(mix), [["remedy_sodaly_guava", 1], ["remedy_sodaly_yuzu", 1]]);
  assert.equal(mix.selections[0].canonical_url, "https://www.lazada.sg/products/i2645682408-s17039227072.html");
  assert.equal(mix.selections[1].canonical_url, "https://www.lazada.sg/products/i3182702274-s21649460937.html");

  assert.equal(singleFlavour.basket_id, undefined, "an explicit flavour never expands");
  assert.equal(singleFlavour.item_id, "remedy_sodaly_guava");
  assert.deepEqual(allocationOf(singleFlavour), [["remedy_sodaly_guava", 2]]);
});

test("each expanded member resolves to its own rank 1 product", () => {
  const [mix] = matchList(basketCatalog(), ["sodaly"]);
  assert.equal(mix.quantity, 3, "the basket default is the total, not a member default");
  assert.deepEqual(mix.selections, [
    {
      item_id: "yuzu",
      product: "Yuzu preferred 4 x 250ml",
      pack_size: "4 x 250 ml",
      quantity: 2,
      canonical_url: "https://www.lazada.sg/products/i11-s21.html"
    },
    {
      item_id: "guava",
      product: "Guava preferred 4 x 250ml",
      pack_size: "4 x 250 ml",
      quantity: 1,
      canonical_url: "https://www.lazada.sg/products/i12-s22.html"
    }
  ]);
});

test("an explicit basket quantity overrides the total and gives the remainder to earlier members", async () => {
  const catalog = await loadCatalog();
  const [three, one] = matchList(catalog, ["3 sodaly", "1 x sodaly"]);
  assert.deepEqual(
    allocationOf(three),
    [["remedy_sodaly_guava", 2], ["remedy_sodaly_yuzu", 1]],
    "guava is declared first, so it absorbs the odd pack"
  );
  assert.deepEqual(
    allocationOf(one),
    [["remedy_sodaly_guava", 1]],
    "fewer packs than members drops the unallocated members instead of adding zero-quantity rows"
  );
});

test("basket totals spread through matchList in declared member order", () => {
  const catalog = basketCatalog();
  catalog.household_baskets[0].members = [{ item: "yuzu" }, { item: "guava" }, { item: "ginger" }];
  const [zero, two, threeUp, five] = matchList(catalog, ["0 sodaly", "2 sodaly", "3 sodaly", "5 sodaly"]);
  assert.deepEqual(allocationOf(zero), []);
  assert.deepEqual(allocationOf(two), [["yuzu", 1], ["guava", 1]]);
  assert.deepEqual(allocationOf(threeUp), [["yuzu", 1], ["guava", 1], ["ginger", 1]]);
  assert.deepEqual(allocationOf(five), [["yuzu", 2], ["guava", 2], ["ginger", 1]]);
});

test("allocateBasket rejects a basket with no usable members", () => {
  assert.throws(() => allocateBasket({ id: "broken" }, 2), /has no members/);
  assert.throws(() => allocateBasket({ id: "broken", members: [] }, 2), /has no members/);
});

test("a zero basket total stays a matched input that contributes no cart rows", () => {
  const [result] = matchList(basketCatalog(), ["0 sodaly"]);
  assert.equal(result.matched, true);
  assert.equal(result.basket_id, "mix");
  assert.equal(result.quantity, 0);
  assert.deepEqual(result.selections, []);
});

test("a quantity too large to represent exactly is reported unmatched rather than rounded", () => {
  const [result] = matchList(basketCatalog(), ["99999999999999999999 sodaly"]);
  assert.equal(result.matched, false);
  assert.deepEqual(result.selections, []);
});

test("an unvalidated basket member reference fails loudly instead of building a wrong cart", () => {
  const catalog = basketCatalog();
  catalog.household_baskets[0].members = [{ item: "yuzu" }, { item: "not-a-real-item" }];
  assert.throws(() => matchList(catalog, ["sodaly"]), /references unknown item not-a-real-item/);
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

test("validation rejects an alias claimed by two entries, whichever kind they are", () => {
  const duplicateAcrossKinds = basketCatalog();
  duplicateAcrossKinds.items[1].aliases = ["guava sodaly", "sodaly"];
  assert.ok(
    validateCatalog(duplicateAcrossKinds).some((error) => error.includes('"sodaly" duplicates the alias already declared by')),
    "an item must not steal a basket alias"
  );

  const duplicateItems = basketCatalog();
  duplicateItems.items[1].aliases = ["yuzu sodaly"];
  assert.ok(
    validateCatalog(duplicateItems).some((error) => error.includes('"yuzu sodaly" duplicates')),
    "two items must not share an alias"
  );

  const duplicateBaskets = basketCatalog();
  duplicateBaskets.household_baskets.push({
    id: "other-mix",
    default_quantity: 2,
    aliases: ["sodaly"],
    members: [{ item: "yuzu" }, { item: "ginger" }]
  });
  assert.ok(
    validateCatalog(duplicateBaskets).some((error) => error.includes('"sodaly" duplicates')),
    "two baskets must not share an alias"
  );

  const differentCasing = basketCatalog();
  differentCasing.items[1].aliases = ["guava sodaly", "  SoDaLy  "];
  assert.ok(
    validateCatalog(differentCasing).some((error) => error.includes("duplicates the alias already declared by")),
    "collision detection must normalize case and surrounding whitespace exactly like matching"
  );
});

test("validation rejects an alias that the quantity grammar would swallow", () => {
  const basketAlias = basketCatalog();
  basketAlias.household_baskets[0].aliases = ["2 sodaly"];
  assert.ok(validateCatalog(basketAlias).some((error) => error.includes("starts with a quantity prefix")));

  const itemAlias = basketCatalog();
  itemAlias.items[0].aliases = ["2 yuzu sodaly"];
  assert.ok(
    validateCatalog(itemAlias).some((error) => error.includes("starts with a quantity prefix")),
    "the guard must apply to ordinary item aliases too"
  );
});

test("validation enforces basket shape, member references, and no nesting", () => {
  const missingMember = basketCatalog();
  missingMember.household_baskets[0].members = [{ item: "yuzu" }, { item: "not-a-real-item" }];
  assert.ok(
    validateCatalog(missingMember).some((error) => error.includes("not-a-real-item does not match any catalog item")),
    "an unknown member id must fail"
  );

  const tooFew = basketCatalog();
  tooFew.household_baskets[0].members = [{ item: "yuzu" }];
  assert.ok(validateCatalog(tooFew).some((error) => error.includes("at least two catalog items")));

  const notAnArray = basketCatalog();
  notAnArray.household_baskets[0].members = { length: 2 };
  assert.ok(
    validateCatalog(notAnArray).some((error) => error.includes("at least two catalog items")),
    "members must be a real array, not an object that merely has a length"
  );

  const duplicateMember = basketCatalog();
  duplicateMember.household_baskets[0].members = [{ item: "yuzu" }, { item: "yuzu" }];
  assert.ok(validateCatalog(duplicateMember).some((error) => error.includes("duplicates member yuzu")));

  const nested = basketCatalog();
  nested.household_baskets.push({
    id: "outer",
    default_quantity: 2,
    aliases: ["everything"],
    members: [{ item: "mix" }, { item: "yuzu" }]
  });
  assert.ok(validateCatalog(nested).some((error) => error.includes("baskets cannot nest")));

  const collidingId = basketCatalog();
  collidingId.household_baskets[0].id = "yuzu";
  assert.ok(validateCatalog(collidingId).some((error) => error.includes("duplicates the item id yuzu")));

  const duplicateBasketId = basketCatalog();
  duplicateBasketId.household_baskets.push(
    { id: "mix", default_quantity: 2, aliases: ["another mix"], members: [{ item: "yuzu" }, { item: "guava" }] },
    { id: "mix", default_quantity: 2, aliases: ["a third mix"], members: [{ item: "yuzu" }, { item: "ginger" }] }
  );
  const duplicateIdErrors = validateCatalog(duplicateBasketId).filter((error) => error.includes("id duplicates mix"));
  assert.deepEqual(
    duplicateIdErrors,
    ["household_baskets[1].id duplicates mix", "household_baskets[2].id duplicates mix"],
    "every duplicate occurrence must be reported, not just the first"
  );
});

test("validation requires positive whole quantities for items and baskets", () => {
  for (const badQuantity of [0, -2, 1.5, "2", Number.MAX_SAFE_INTEGER + 2]) {
    const catalog = basketCatalog();
    catalog.household_baskets[0].default_quantity = badQuantity;
    assert.ok(
      validateCatalog(catalog).some((error) => error.includes("household_baskets[0].default_quantity must be a positive integer")),
      `basket default_quantity ${badQuantity} must be rejected`
    );

    const itemCatalog = basketCatalog();
    itemCatalog.items[0].default_quantity = badQuantity;
    assert.ok(
      itemCatalog.items[0].default_quantity === badQuantity &&
        validateCatalog(itemCatalog).some((error) => error.includes("items[0].default_quantity must be a positive integer")),
      `item default_quantity ${badQuantity} must be rejected`
    );
  }
});
test("a missing household_baskets section is valid but a malformed one is not", () => {
  const withoutBaskets = basketCatalog();
  delete withoutBaskets.household_baskets;
  assert.deepEqual(validateCatalog(withoutBaskets), []);

  const emptyBaskets = basketCatalog();
  emptyBaskets.household_baskets = [];
  assert.deepEqual(validateCatalog(emptyBaskets), []);

  for (const malformedValue of [{}, null, "sodaly", 3]) {
    const malformed = basketCatalog();
    malformed.household_baskets = malformedValue;
    assert.ok(
      validateCatalog(malformed).some((error) => error.includes("household_baskets must be an array when present")),
      `household_baskets: ${JSON.stringify(malformedValue)} must be rejected`
    );
  }
});

test("the dry run prints member rows and counts inputs separately from cart rows", async () => {
  const { stdout } = await run(process.execPath, [
    "tools/dry-run.mjs",
    "Sodaly, eggs, unknown thing, 0 sodaly"
  ], { cwd: new URL("..", import.meta.url) });

  assert.match(stdout, /remedy_sodaly_mix → remedy_sodaly_guava/, "member rows must be attributed to their basket");
  assert.match(stdout, /remedy_sodaly_mix → remedy_sodaly_yuzu/);
  assert.match(stdout, /Remedy Sodaly Guava - Multipack 250ML X 4/);
  assert.match(stdout, /No packs allocated/, "a zero-total basket stays visible in the table");
  assert.match(
    stdout,
    /Matched 3\/4 list items\./,
    "the ratio stays input-level: three of four lines matched"
  );
  assert.match(
    stdout,
    /Proposed cart rows after basket expansion: 3\./,
    "cart rows count selections, not input lines"
  );
  assert.match(stdout, /Unmatched \(requires human handling\): unknown thing/);
});

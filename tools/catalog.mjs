import { readFile } from "node:fs/promises";
import { parse } from "yaml";

export const CANONICAL_URL = /^https:\/\/www\.lazada\.sg\/products\/i(\d+)-s(\d+)\.html$/;
const QUANTITY_PREFIX = /^(\d+)\s+(?:x\s+)?(.+)$/i;
const QUANTITY_SHAPED_ALIAS = /^\d+\s/;

export function normalizeAlias(alias) {
  return alias.toLowerCase().trim();
}

export async function loadCatalog(path = new URL("../grocery-catalog.yaml", import.meta.url)) {
  const source = await readFile(path, "utf8");
  const catalog = parse(source);
  return catalog;
}

export function validateCatalog(catalog) {
  const errors = [];
  const itemIds = new Set();
  const basketIds = new Set();
  const pairs = new Set();
  const aliasOwners = new Map();

  if (!catalog || typeof catalog !== "object") return ["catalog must be a YAML object"];
  if (!Number.isInteger(catalog.catalog_version)) errors.push("catalog_version must be an integer");
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) {
    errors.push("items must be a non-empty array");
    return errors;
  }

  const baskets = catalog.household_baskets;
  const basketsPresent = baskets !== undefined;
  if (basketsPresent && !Array.isArray(baskets)) errors.push("household_baskets must be an array when present");
  const basketList = basketsPresent && Array.isArray(baskets) ? baskets : [];
  for (const basket of basketList) {
    if (typeof basket?.id === "string" && basket.id.trim()) basketIds.add(basket.id);
  }

  // Aliases are the household's only lookup key, so one alias must never name two concepts.
  // Duplicates used to resolve silently to whichever entry was declared last.
  const registerAliases = (aliases, at) => {
    if (!Array.isArray(aliases) || aliases.length === 0 || aliases.some((alias) => typeof alias !== "string" || !alias.trim())) {
      errors.push(`${at}.aliases must contain non-empty strings`);
      return;
    }
    for (const alias of aliases) {
      const key = normalizeAlias(alias);
      if (QUANTITY_SHAPED_ALIAS.test(key)) {
        errors.push(`${at}.aliases entry "${alias}" starts with a quantity prefix and can never be matched`);
        continue;
      }
      const owner = aliasOwners.get(key);
      if (owner) errors.push(`${at}.aliases entry "${alias}" duplicates the alias already declared by ${owner}`);
      else aliasOwners.set(key, at);
    }
  };

  catalog.items.forEach((item, itemIndex) => {
    const at = `items[${itemIndex}]`;
    if (!item?.id || typeof item.id !== "string") errors.push(`${at}.id must be a non-empty string`);
    else if (itemIds.has(item.id)) errors.push(`${at}.id duplicates ${item.id}`);
    else itemIds.add(item.id);

    if (!Number.isSafeInteger(item?.default_quantity) || item.default_quantity <= 0) {
      errors.push(`${at}.default_quantity must be a positive integer`);
    }
    registerAliases(item?.aliases, at);
    if (!Array.isArray(item?.preferred_products) || item.preferred_products.length === 0) {
      errors.push(`${at}.preferred_products must be a non-empty array`);
      return;
    }

    const ranks = new Set();
    item.preferred_products.forEach((product, productIndex) => {
      const productAt = `${at}.preferred_products[${productIndex}]`;
      if (!Number.isInteger(product?.rank) || product.rank <= 0) errors.push(`${productAt}.rank must be a positive integer`);
      else if (ranks.has(product.rank)) errors.push(`${productAt}.rank duplicates rank ${product.rank}`);
      else ranks.add(product.rank);

      const itemId = String(product?.item_id ?? "");
      const skuId = String(product?.sku_id ?? "");
      if (!/^\d+$/.test(itemId)) errors.push(`${productAt}.item_id must contain digits only`);
      if (!/^\d+$/.test(skuId)) errors.push(`${productAt}.sku_id must contain digits only`);
      const match = typeof product?.canonical_url === "string" && product.canonical_url.match(CANONICAL_URL);
      if (!match) errors.push(`${productAt}.canonical_url is not canonical`);
      else if (match[1] !== itemId || match[2] !== skuId) errors.push(`${productAt}.canonical_url does not match item_id and sku_id`);

      const pair = `${itemId}:${skuId}`;
      if (pairs.has(pair)) errors.push(`${productAt} duplicates item/SKU pair ${pair}`);
      else pairs.add(pair);
    });
  });

  // Baskets are validated after every item id is known, so a basket may reference a member
  // declared later in the file.
  basketList.forEach((basket, basketIndex) => {
    const at = `household_baskets[${basketIndex}]`;
    if (!basket?.id || typeof basket.id !== "string" || !basket.id.trim()) errors.push(`${at}.id must be a non-empty string`);
    else if (itemIds.has(basket.id)) errors.push(`${at}.id duplicates the item id ${basket.id}`);

    if (!Number.isSafeInteger(basket?.default_quantity) || basket.default_quantity <= 0) {
      errors.push(`${at}.default_quantity must be a positive integer`);
    }
    registerAliases(basket?.aliases, at);

    if (!Array.isArray(basket?.members) || basket.members.length < 2) {
      errors.push(`${at}.members must reference at least two catalog items`);
      return;
    }
    const seenMembers = new Set();
    basket.members.forEach((member, memberIndex) => {
      const memberAt = `${at}.members[${memberIndex}]`;
      const reference = member?.item;
      if (typeof reference !== "string" || !reference.trim()) {
        errors.push(`${memberAt}.item must be a non-empty string`);
        return;
      }
      if (basketIds.has(reference)) errors.push(`${memberAt}.item ${reference} references a basket; baskets cannot nest`);
      else if (!itemIds.has(reference)) errors.push(`${memberAt}.item ${reference} does not match any catalog item`);
      if (seenMembers.has(reference)) errors.push(`${memberAt}.item duplicates member ${reference}`);
      else seenMembers.add(reference);
    });
  });

  basketList.forEach((basket, basketIndex) => {
    if (typeof basket?.id !== "string" || !basket.id.trim()) return;
    const first = basketList.findIndex((other) => other?.id === basket.id);
    if (first !== basketIndex) errors.push(`household_baskets[${basketIndex}].id duplicates ${basket.id}`);
  });

  return errors;
}

/**
 * Spread a basket's total pack count across its members in declared order.
 * Earliest members absorb the remainder, and members allocated nothing are omitted
 * so a basket never produces a zero-quantity cart row.
 */
export function allocateBasket(basket, totalQuantity) {
  const members = basket?.members;
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error(`household basket ${basket?.id ?? "(unnamed)"} has no members; run validateCatalog first`);
  }
  const base = Math.floor(totalQuantity / members.length);
  const remainder = totalQuantity % members.length;
  return members
    .map((member, index) => ({ item: member.item, quantity: base + (index < remainder ? 1 : 0) }))
    .filter((allocation) => allocation.quantity > 0);
}

function buildSelection(item, quantity) {
  const product = [...item.preferred_products].sort((a, b) => a.rank - b.rank)[0];
  return {
    item_id: item.id,
    product: product.title,
    pack_size: product.pack_size ?? "—",
    quantity,
    canonical_url: product.canonical_url
  };
}

/**
 * Returns exactly one result per non-empty input line; blank lines are dropped before matching.
 * `selections` holds the concrete products that line resolves to: one for an ordinary household
 * item, one per allocated member for a basket, and none when a basket total allocates nothing.
 * Ordinary results no longer carry flat `product`/`pack_size`/`canonical_url` fields; read
 * `selections[0]` instead. This shape change is why `catalog_version` moved from 1 to 2.
 */
export function matchList(catalog, lines) {
  const itemsById = new Map(catalog.items.map((item) => [item.id, item]));
  const aliasMap = new Map();
  for (const item of catalog.items) {
    for (const alias of item.aliases ?? []) aliasMap.set(normalizeAlias(alias), { kind: "item", entry: item });
  }
  for (const basket of catalog.household_baskets ?? []) {
    for (const alias of basket.aliases ?? []) aliasMap.set(normalizeAlias(alias), { kind: "basket", entry: basket });
  }

  return lines.filter(Boolean).map((raw, inputIndex) => {
    const line = raw.trim();
    const quantityMatch = line.match(QUANTITY_PREFIX);
    const requestedQuantity = quantityMatch ? Number(quantityMatch[1]) : null;
    // A quantity we cannot represent exactly is never silently rounded into a cart.
    const unusableQuantity = requestedQuantity !== null && !Number.isSafeInteger(requestedQuantity);
    const words = normalizeAlias(quantityMatch ? quantityMatch[2] : line);
    const hit = unusableQuantity ? undefined : aliasMap.get(words);
    if (!hit) return { input: line, input_index: inputIndex, matched: false, selections: [] };

    const quantity = requestedQuantity ?? hit.entry.default_quantity;
    if (hit.kind === "item") {
      return {
        input: line,
        input_index: inputIndex,
        matched: true,
        item_id: hit.entry.id,
        quantity,
        selections: [buildSelection(hit.entry, quantity)]
      };
    }

    const selections = allocateBasket(hit.entry, quantity).map((allocation) => {
      const member = itemsById.get(allocation.item);
      // Reachable only on an unvalidated catalog; fail loudly instead of building a wrong cart.
      if (!member) {
        throw new Error(`household basket ${hit.entry.id} references unknown item ${allocation.item}; run validateCatalog first`);
      }
      return buildSelection(member, allocation.quantity);
    });
    return {
      input: line,
      input_index: inputIndex,
      matched: true,
      basket_id: hit.entry.id,
      quantity,
      selections
    };
  });
}

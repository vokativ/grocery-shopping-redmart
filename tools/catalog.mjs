import { readFile } from "node:fs/promises";
import { parse } from "yaml";

export const CANONICAL_URL = /^https:\/\/www\.lazada\.sg\/products\/i(\d+)-s(\d+)\.html$/;

export async function loadCatalog(path = new URL("../grocery-catalog.yaml", import.meta.url)) {
  const source = await readFile(path, "utf8");
  const catalog = parse(source);
  return catalog;
}

export function validateCatalog(catalog) {
  const errors = [];
  const ids = new Set();
  const pairs = new Set();

  if (!catalog || typeof catalog !== "object") return ["catalog must be a YAML object"];
  if (!Number.isInteger(catalog.catalog_version)) errors.push("catalog_version must be an integer");
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) {
    errors.push("items must be a non-empty array");
    return errors;
  }

  catalog.items.forEach((item, itemIndex) => {
    const at = `items[${itemIndex}]`;
    if (!item?.id || typeof item.id !== "string") errors.push(`${at}.id must be a non-empty string`);
    else if (ids.has(item.id)) errors.push(`${at}.id duplicates ${item.id}`);
    else ids.add(item.id);

    if (!Number.isInteger(item?.default_quantity) || item.default_quantity <= 0) {
      errors.push(`${at}.default_quantity must be a positive integer`);
    }
    if (!Array.isArray(item?.aliases) || item.aliases.length === 0 || item.aliases.some((alias) => typeof alias !== "string" || !alias.trim())) {
      errors.push(`${at}.aliases must contain non-empty strings`);
    }
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

  return errors;
}

export function matchList(catalog, lines) {
  const aliasMap = new Map();
  for (const item of catalog.items) {
    for (const alias of item.aliases) aliasMap.set(alias.toLowerCase().trim(), item);
  }

  return lines.filter(Boolean).map((raw) => {
    const line = raw.trim();
    const quantityMatch = line.match(/^(\d+)\s+(?:x\s+)?(.+)$/i);
    const requestedQuantity = quantityMatch ? Number(quantityMatch[1]) : null;
    const words = (quantityMatch ? quantityMatch[2] : line).trim().toLowerCase();
    const item = aliasMap.get(words);
    if (!item) return { input: line, matched: false };
    const product = [...item.preferred_products].sort((a, b) => a.rank - b.rank)[0];
    return {
      input: line,
      matched: true,
      item_id: item.id,
      product: product.title,
      pack_size: product.pack_size ?? "—",
      quantity: requestedQuantity ?? item.default_quantity,
      canonical_url: product.canonical_url
    };
  });
}

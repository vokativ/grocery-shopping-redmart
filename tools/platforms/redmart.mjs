export const CANONICAL_URL = /^https:\/\/www\.lazada\.sg\/products\/i(\d+)-s(\d+)\.html$/;

export const name = "redmart";

export function validateProduct(product, at, ctx) {
  const itemId = String(product?.item_id ?? "");
  const skuId = String(product?.sku_id ?? "");
  if (!/^\d+$/.test(itemId)) ctx.errors.push(`${at}.item_id must contain digits only`);
  if (!/^\d+$/.test(skuId)) ctx.errors.push(`${at}.sku_id must contain digits only`);
  const match = typeof product?.canonical_url === "string" && product.canonical_url.match(CANONICAL_URL);
  if (!match) ctx.errors.push(`${at}.canonical_url is not canonical`);
  else if (match[1] !== itemId || match[2] !== skuId) ctx.errors.push(`${at}.canonical_url does not match item_id and sku_id`);

  const pair = `${itemId}:${skuId}`;
  if (ctx.seenIdentities.has(pair)) ctx.errors.push(`${at} duplicates item/SKU pair ${pair}`);
  else ctx.seenIdentities.add(pair);
}

export function selectionFields(product) {
  return { canonical_url: product.canonical_url };
}

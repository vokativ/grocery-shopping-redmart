export const name = "fairprice";

const PRODUCT_URL_PREFIX = "https://www.fairprice.com.sg/product/";

// YAML parses a bare numeric article id as a number; accept it only while it is still exact.
const articleIdOf = (product) => {
  const raw = product?.article_id;
  if (typeof raw === "number") return Number.isSafeInteger(raw) && raw >= 0 ? String(raw) : "";
  return typeof raw === "string" ? raw : "";
};

export function validateProduct(product, at, ctx) {
  const articleId = articleIdOf(product);
  if (!/^\d+$/.test(articleId)) ctx.errors.push(`${at}.article_id must contain digits only`);
  else if (ctx.seenIdentities.has(articleId)) ctx.errors.push(`${at} duplicates article_id ${articleId}`);
  else ctx.seenIdentities.add(articleId);

  if (product?.slug !== undefined && typeof product.slug !== "string") ctx.errors.push(`${at}.slug must be a string when present`);
  if (product?.marketplace !== undefined && typeof product.marketplace !== "boolean") {
    ctx.errors.push(`${at}.marketplace must be a boolean when present`);
  }
  if (product?.canonical_url !== undefined &&
      (typeof product.canonical_url !== "string" || !product.canonical_url.startsWith(PRODUCT_URL_PREFIX))) {
    ctx.errors.push(`${at}.canonical_url must start with ${PRODUCT_URL_PREFIX} when present`);
  }
}

export function selectionFields(product) {
  return {
    article_id: articleIdOf(product),
    ...(product.slug !== undefined ? { slug: product.slug } : {}),
    ...(product.marketplace !== undefined ? { marketplace: product.marketplace } : {})
  };
}

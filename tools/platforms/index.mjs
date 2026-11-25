import * as redmart from "./redmart.mjs";
import * as fairprice from "./fairprice.mjs";

export const platforms = { redmart, fairprice };

const STATUS = { redmart: "active", fairprice: "experimental" };

export function platformOf(catalog) {
  return catalog?.store?.platform ?? "redmart";
}

export function platformStatus(name) {
  return Object.hasOwn(STATUS, name) ? STATUS[name] : undefined;
}

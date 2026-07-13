#!/usr/bin/env node
import { loadCatalog, validateCatalog } from "./catalog.mjs";

const catalog = await loadCatalog();
const errors = validateCatalog(catalog);
if (errors.length) {
  console.error(`Catalog validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Catalog is valid: ${catalog.items.length} household items.`);
}

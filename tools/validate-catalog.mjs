#!/usr/bin/env node
import { loadCatalog, validateCatalog } from "./catalog.mjs";
import { describeCatalog, resolveCatalog } from "./resolve-catalog.mjs";

const USAGE = "Usage: node tools/validate-catalog.mjs [--catalog <path>]...";

function parseArgs(argv) {
  const catalogs = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--catalog") {
      const value = argv[(index += 1)];
      if (value === undefined || value.startsWith("--")) throw new Error("--catalog requires a path");
      catalogs.push(value);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  return catalogs;
}

let flags;
try {
  flags = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${error.message}\n\n${USAGE}`);
  process.exit(1);
}

for (const flag of flags.length ? flags : [undefined]) {
  let resolved;
  try {
    resolved = resolveCatalog({ flag });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  console.log(`Catalog: ${describeCatalog(resolved)}`);
  let catalog;
  try {
    catalog = await loadCatalog(resolved.path);
  } catch (error) {
    console.error(`Cannot read catalog: ${error.message}`);
    process.exitCode = 1;
    continue;
  }
  const errors = validateCatalog(catalog);
  if (errors.length) {
    console.error(`Catalog validation failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    const baskets = catalog.household_baskets?.length ?? 0;
    console.log(`Catalog is valid: ${catalog.items.length} household items, ${baskets} household basket(s).`);
  }
}

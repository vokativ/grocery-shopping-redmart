#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadCatalog, matchList, validateCatalog } from "./catalog.mjs";

function parseArgs(argv) {
  const fileIndex = argv.indexOf("--file");
  return { file: fileIndex >= 0 ? argv[fileIndex + 1] : null, list: fileIndex < 0 ? argv.join(" ") : null };
}

const args = parseArgs(process.argv.slice(2));
if (!args.file && !args.list) {
  console.error('Usage: npm run dry-run -- "eggs, 2 watermelon"\n   or: npm run dry-run -- --file examples/grocery-list.txt');
  process.exit(1);
}

const catalog = await loadCatalog();
const errors = validateCatalog(catalog);
if (errors.length) throw new Error(`Catalog is invalid:\n${errors.join("\n")}`);
const input = args.file ? await readFile(args.file, "utf8") : args.list;
const lines = input.split(/[,\n]/).map((line) => line.trim()).filter(Boolean);
const results = matchList(catalog, lines);

console.log("PROPOSED CART — DRY RUN ONLY (no browser actions)\n");
console.table(results.map((result) => result.matched ? {
  input: result.input,
  item: result.item_id,
  product: result.product,
  pack: result.pack_size,
  quantity: result.quantity
} : { input: result.input, item: "UNMATCHED", product: "Not added", pack: "—", quantity: "—" }));

const unmatched = results.filter((result) => !result.matched);
console.log(`Matched ${results.length - unmatched.length}/${results.length} list items.`);
if (unmatched.length) console.log(`Unmatched (requires human handling): ${unmatched.map((item) => item.input).join(", ")}`);

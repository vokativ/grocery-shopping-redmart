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

const rows = [];
for (const result of results) {
  if (!result.matched) {
    rows.push({ input: result.input, item: "UNMATCHED", product: "Not added", pack: "—", quantity: "—" });
    continue;
  }
  if (!result.selections.length) {
    rows.push({ input: result.input, item: result.basket_id ?? result.item_id, product: "No packs allocated", pack: "—", quantity: 0 });
    continue;
  }
  result.selections.forEach((selection, index) => {
    rows.push({
      input: index === 0 ? result.input : "",
      item: result.basket_id ? `${result.basket_id} → ${selection.item_id}` : selection.item_id,
      product: selection.product,
      pack: selection.pack_size,
      quantity: selection.quantity
    });
  });
}
console.table(rows);

// One result per input line, so this count stays input-level even when baskets expand.
const unmatched = results.filter((result) => !result.matched);
const cartRows = results.reduce((total, result) => total + result.selections.length, 0);
console.log(`Matched ${results.length - unmatched.length}/${results.length} list items.`);
console.log(`Proposed cart rows after basket expansion: ${cartRows}.`);
if (unmatched.length) console.log(`Unmatched (requires human handling): ${unmatched.map((item) => item.input).join(", ")}`);

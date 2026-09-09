#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { loadCatalog, matchList, validateCatalog } from "./catalog.mjs";

const USAGE = `Usage: npm run dry-run -- [--json] "eggs, 2 watermelon"
   or: npm run dry-run -- [--json] --file examples/grocery-list.txt`;

function parseArgs(argv) {
  let file = null;
  let json = false;
  const list = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      if (json) throw new Error("--json may only be specified once");
      json = true;
    } else if (arg === "--file") {
      const value = argv[index + 1];
      if (file !== null) throw new Error("--file may only be specified once");
      if (value === undefined || value.startsWith("--")) throw new Error("--file requires a path");
      file = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      list.push(arg);
    }
  }

  if (file !== null && list.length > 0) throw new Error("--file cannot be combined with grocery list text");
  if (file === null && !list.join(" ").trim()) throw new Error("Missing grocery list input");
  return { file, json, list: list.join(" ") };
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(`Error: ${error.message}\n\n${USAGE}`);
  process.exit(1);
}

const catalog = await loadCatalog();
const errors = validateCatalog(catalog);
if (errors.length) throw new Error(`Catalog is invalid:\n${errors.join("\n")}`);
const input = args.file ? await readFile(args.file, "utf8") : args.list;
const lines = input.split(/[,\n]/).map((line) => line.trim()).filter(Boolean);
if (!lines.length) {
  console.error(`Error: Grocery list input contains no items\n\n${USAGE}`);
  process.exit(1);
}
const results = matchList(catalog, lines);

if (args.json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log("PROPOSED CART — DRY RUN ONLY (no browser actions; availability unverified)\n");
}

if (!args.json) {
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

  for (const result of results) {
    for (const selection of result.selections) {
      if (selection.candidates.length < 2) continue;
      console.log(`\nApproved backups for ${selection.item_id} (availability unverified):`);
      for (const candidate of selection.candidates.slice(1)) {
        console.log(`  Rank ${candidate.rank}: ${candidate.title} (${candidate.pack_size ?? "—"})`);
      }
    }
  }

  // One result per input line, so this count stays input-level even when baskets expand.
  const unmatched = results.filter((result) => !result.matched);
  const cartRows = results.reduce((total, result) => total + result.selections.length, 0);
  console.log(`Matched ${results.length - unmatched.length}/${results.length} list items.`);
  console.log(`Proposed cart rows after basket expansion: ${cartRows}.`);
  if (unmatched.length) console.log(`Unmatched (requires human handling): ${unmatched.map((item) => item.input).join(", ")}`);
}

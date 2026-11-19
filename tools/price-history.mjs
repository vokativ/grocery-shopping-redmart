import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const PRICE_HISTORY_COLUMNS = [
  "date",
  "store",
  "catalog_item_id",
  "rank",
  "product_id",
  "title",
  "pack_size",
  "price_sgd",
  "source"
];

export function formatPrice(price) {
  return Number(price).toFixed(2);
}

function quoteField(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** RFC 4180 parser: quoted fields may hold commas, doubled quotes and line breaks; CRLF or LF ends a record. */
function parseCsv(text) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;
  let fieldStarted = false;
  let line = 1;
  let recordLine = 1;

  const endField = () => {
    record.push(field);
    field = "";
    fieldStarted = false;
  };
  const endRecord = () => {
    endField();
    records.push({ fields: record, line: recordLine });
    record = [];
  };
  const nextLine = () => {
    line += 1;
    recordLine = line;
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') {
        field += char;
        if (char === "\n") line += 1;
      } else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"' && !fieldStarted) {
      quoted = true;
      fieldStarted = true;
    } else if (char === ",") endField();
    else if (char === "\n") {
      endRecord();
      nextLine();
    } else if (char === "\r") {
      if (text[index + 1] === "\n") index += 1;
      endRecord();
      nextLine();
    } else {
      field += char;
      fieldStarted = true;
    }
  }
  if (quoted) throw new Error("Unterminated quoted field in CSV");
  if (fieldStarted || field !== "" || record.length > 0) endRecord();
  return records.filter(({ fields }) => !(fields.length === 1 && fields[0] === ""));
}

const STORES = new Set(["redmart", "fairprice"]);

export function isCalendarDate(text) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(text);
}

/** Reads and validates price-history.csv; throws with the offending line number on any invalid row. */
export function readPriceHistory(path) {
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const records = parseCsv(text);
  if (records.length === 0) return [];

  const [{ fields: header }, ...body] = records;
  if (header.join(",") !== PRICE_HISTORY_COLUMNS.join(",")) {
    throw new Error(`${path} header must be exactly: ${PRICE_HISTORY_COLUMNS.join(",")}`);
  }
  return body.map(({ fields, line }) => {
    const fail = (problem) => {
      throw new Error(`${path} line ${line}: ${problem}`);
    };
    if (fields.length !== PRICE_HISTORY_COLUMNS.length) {
      fail(`has ${fields.length} fields, expected ${PRICE_HISTORY_COLUMNS.length}`);
    }
    const row = Object.fromEntries(PRICE_HISTORY_COLUMNS.map((column, position) => [column, fields[position]]));
    if (!isCalendarDate(row.date)) fail(`date must be YYYY-MM-DD, got ${JSON.stringify(row.date)}`);
    if (!STORES.has(row.store)) fail(`store must be redmart or fairprice, got ${JSON.stringify(row.store)}`);
    if (row.product_id.trim() === "") fail("product_id is empty");
    if (!/^\d+$/.test(row.rank)) fail(`rank must be an integer, got ${JSON.stringify(row.rank)}`);
    if (!/^\d+(?:\.\d+)?$/.test(row.price_sgd.trim()) || !(Number(row.price_sgd) > 0)) {
      fail(`price_sgd must be a number greater than 0, got ${JSON.stringify(row.price_sgd)}`);
    }
    row.rank = Number(row.rank);
    row.price_sgd = Number(row.price_sgd);
    return row;
  });
}

const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function compareRows(left, right) {
  return (
    compareText(left.date, right.date) ||
    compareText(left.store, right.store) ||
    compareText(left.catalog_item_id, right.catalog_item_id) ||
    Number(left.rank) - Number(right.rank) ||
    compareText(left.product_id, right.product_id)
  );
}

const rowKey = (row) => JSON.stringify([row.date, row.store, row.product_id]);

/**
 * Merge new rows into the history. By default only rows with the same (date, store, product_id) are replaced.
 * With `replaceDateStore`, every existing row for a (date, store) pair present in newRows is dropped first,
 * so a same-day re-run also removes rows of products that are no longer produced.
 */
export function mergePriceHistory(existingRows, newRows, { replaceDateStore = false } = {}) {
  // A later duplicate inside newRows wins, like a re-run of the same date.
  const replacements = new Map(newRows.map((row) => [rowKey(row), row]));
  const replacedGroups = new Set(newRows.map((row) => JSON.stringify([row.date, row.store])));
  const kept = existingRows.filter((row) =>
    replaceDateStore ? !replacedGroups.has(JSON.stringify([row.date, row.store])) : !replacements.has(rowKey(row))
  );
  return [...kept, ...replacements.values()].sort(compareRows);
}

export function writePriceHistory(path, rows) {
  const lines = [PRICE_HISTORY_COLUMNS.join(",")];
  for (const row of rows) {
    lines.push(
      PRICE_HISTORY_COLUMNS.map((column) => quoteField(column === "price_sgd" ? formatPrice(row[column]) : row[column])).join(",")
    );
  }
  writeFileSync(path, `${lines.join("\n")}\n`);
}

#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_PLACEHOLDER = "__CATALOG_REVIEW_DATA__";
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultTemplatePath = path.resolve(
  moduleDir,
  "../templates/redmart-catalog-review-template.html"
);

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeOptionalString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeRequiredString(value, fieldName, index) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`Candidate ${index + 1} is missing ${fieldName}`);
  }
  return normalized;
}

function finiteNumberOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function integerOrNull(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue) ? numberValue : null;
}

function positiveIntegerOrNull(value) {
  const integerValue = integerOrNull(value);
  return integerValue !== null && integerValue > 0 ? integerValue : null;
}

function normalizeFamilyWords(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeCandidate(candidate, index) {
  if (!isObject(candidate)) {
    throw new Error(`Candidate ${index + 1} must be an object`);
  }

  const observedQuantity = integerOrNull(candidate.observed_quantity);
  const usualQuantity =
    positiveIntegerOrNull(candidate.usual_quantity) ??
    positiveIntegerOrNull(candidate.observed_quantity) ??
    1;

  return {
    ...candidate,
    candidate_id: normalizeRequiredString(candidate.candidate_id, "candidate_id", index),
    title: normalizeRequiredString(candidate.title, "title", index),
    pack_size: normalizeOptionalString(candidate.pack_size),
    observed_price_sgd: finiteNumberOrNull(candidate.observed_price_sgd),
    observed_quantity: observedQuantity,
    purchase_hint: normalizeOptionalString(candidate.purchase_hint),
    include: candidate.include === undefined ? true : Boolean(candidate.include),
    usual_quantity: usualQuantity,
    family_words: normalizeFamilyWords(candidate.family_words),
    attention_tag: normalizeOptionalString(candidate.attention_tag),
    notes: normalizeOptionalString(candidate.notes)
  };
}

export function normalizeReviewData(raw) {
  if (!isObject(raw)) {
    throw new Error("Review data must be a JSON object");
  }

  if (!Array.isArray(raw.candidates)) {
    throw new Error("Review data candidates must be an array");
  }

  return {
    ...raw,
    review_schema_version: raw.review_schema_version ?? 1,
    source: isObject(raw.source) ? raw.source : {},
    candidates: raw.candidates.map(normalizeCandidate)
  };
}

export async function renderCatalogReview({ inputPath, outputPath, template } = {}) {
  const rawInput = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(rawInput);
  const normalized = normalizeReviewData(parsed);
  const templateHtml = template ?? (await readFile(defaultTemplatePath, "utf8"));

  if (!templateHtml.includes(DATA_PLACEHOLDER)) {
    throw new Error(`Template is missing ${DATA_PLACEHOLDER}`);
  }

  const embeddedData = JSON.stringify(normalized).replaceAll("<", "\\u003c");
  const outputHtml = templateHtml.replaceAll(DATA_PLACEHOLDER, embeddedData);

  await writeFile(outputPath, outputHtml, "utf8");

  return {
    outputPath,
    candidateCount: normalized.candidates.length
  };
}

function parseArgs(argv) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--input" || arg === "--output") {
      args[arg.slice(2)] = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

function printUsage() {
  console.error(
    "Usage: node tools/render-catalog-review.mjs --input candidates.json --output redmart-catalog-review-YYYY-MM-DD.html"
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.input || !args.output) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const result = await renderCatalogReview({
    inputPath: args.input,
    outputPath: args.output
  });

  console.log(`Wrote ${result.outputPath} with ${result.candidateCount} candidates.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeReviewData,
  renderCatalogReview
} from "../tools/render-catalog-review.mjs";

test("normalizeReviewData preserves candidate review fields", () => {
  const normalized = normalizeReviewData({
    candidates: [
      {
        candidate_id: "cand_1",
        title: "RedMart Cherry Tomato",
        observed_quantity: 2,
        observed_price_sgd: "1.85",
        family_words: ["cherry tomatoes", "tomatoes"]
      }
    ]
  });

  assert.equal(normalized.review_schema_version, 1);
  assert.equal(normalized.candidates[0].include, true);
  assert.equal(normalized.candidates[0].usual_quantity, 2);
  assert.deepEqual(normalized.candidates[0].family_words, ["cherry tomatoes", "tomatoes"]);
  assert.equal(normalized.candidates[0].observed_price_sgd, 1.85);

  const defaulted = normalizeReviewData({
    candidates: [{ candidate_id: "cand_1", title: "Title" }]
  });
  assert.equal(defaulted.candidates[0].purchase_hint, "Bought in RedMart order history");
});

test("normalizeReviewData rejects missing required fields", () => {
  assert.throws(
    () => normalizeReviewData({ candidates: [{ candidate_id: "cand_1" }] }),
    /missing title/
  );
  assert.throws(
    () => normalizeReviewData({ candidates: [{ title: "RedMart Cherry Tomato" }] }),
    /missing candidate_id/
  );
});

test("renderCatalogReview writes static html with escaped embedded data", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "catalog-review-render-"));
  const inputPath = join(tempDir, "candidates.json");
  const outputPath = join(tempDir, "review.html");

  await writeFile(
    inputPath,
    JSON.stringify({
      candidates: [
        {
          candidate_id: "cand_1",
          title: "Safe <script> Title"
        }
      ]
    }),
    "utf8"
  );

  const result = await renderCatalogReview({ inputPath, outputPath });
  const html = await readFile(outputPath, "utf8");

  assert.deepEqual(result, { outputPath, candidateCount: 1 });
  assert.match(html, /id="catalog-review-data"/);
  assert.doesNotMatch(html, /__CATALOG_REVIEW_DATA__/);
  assert.match(html, /Safe \\u003cscript> Title/);
  assert.match(html, /catalog-review-approved-payload/);
});

test("renderCatalogReview rejects templates without the data placeholder", async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "catalog-review-render-"));
  const inputPath = join(tempDir, "candidates.json");
  const outputPath = join(tempDir, "review.html");

  await writeFile(
    inputPath,
    JSON.stringify({
      candidates: [
        {
          candidate_id: "cand_1",
          title: "RedMart Cherry Tomato"
        }
      ]
    }),
    "utf8"
  );

  await assert.rejects(
    () => renderCatalogReview({ inputPath, outputPath, template: "<html></html>" }),
    /Template is missing/
  );
});

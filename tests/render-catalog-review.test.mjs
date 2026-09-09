import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeReviewData,
  renderCatalogReview
} from "../tools/render-catalog-review.mjs";


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

  await renderCatalogReview({ inputPath, outputPath });
  const html = await readFile(outputPath, "utf8");

  const embedded = html.match(/<script\b[^>]*\bid="catalog-review-data"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(embedded, "rendered page must expose parseable review data");
  assert.equal(JSON.parse(embedded[1]).candidates[0].title, "Safe <script> Title");
  assert.doesNotMatch(embedded[1], /<script>/, "candidate text must not become executable HTML");
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

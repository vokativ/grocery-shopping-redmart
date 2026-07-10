import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const templatePath = new URL("../templates/redmart-catalog-review-template.html", import.meta.url);
const template = await readFile(templatePath, "utf8");

test("template contains required data and approval hooks", () => {
  assert.match(template, /__CATALOG_REVIEW_DATA__/);
  assert.match(template, /id="catalog-review-data"/);
  assert.match(template, /id="candidate-rows"/);
  assert.match(template, /id="catalog-review-approved-payload"/);
  assert.match(template, /data-approve-top/);
  assert.match(template, /data-approve-bottom/);
});

test("approved user-facing language is present and forbidden actions are absent", () => {
  const requiredCopy = [
    "Review products to remember",
    "Everything is included unless you mark it as not included.",
    "Family words",
    "Family words are optional.",
    "Usual quantity",
    "Do not include",
    "Include",
    "Approved. Go back to the agent to continue.",
    "DO NOT CLOSE THIS TAB.",
    "The agent will close it for you when it is done."
  ];

  for (const copy of requiredCopy) {
    assert.match(template, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(template, /Remove from catalog/);
  assert.doesNotMatch(template, /Export/);
  assert.doesNotMatch(template, /Download JSON/);
  assert.doesNotMatch(template, />\s*Copy\s*</);
});

test("template uses system fonts and no external assets", () => {
  assert.match(
    template,
    /font-family:\s*system-ui,\s*-apple-system,\s*BlinkMacSystemFont,\s*"Segoe UI",\s*sans-serif;/
  );
  assert.doesNotMatch(template, /https?:\/\//);
  assert.doesNotMatch(template, /@import/);
  assert.doesNotMatch(template, /<link\b[^>]*rel=["']stylesheet["']/i);
  assert.doesNotMatch(template, /<script\b[^>]*\bsrc=/i);
});

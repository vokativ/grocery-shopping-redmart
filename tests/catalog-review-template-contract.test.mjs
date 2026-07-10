import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const templatePath = new URL("../templates/redmart-catalog-review-template.html", import.meta.url);
const template = await readFile(templatePath, "utf8");

function extractFunctionBody(source, signature) {
  const signatureIndex = source.indexOf(signature);
  assert.notEqual(signatureIndex, -1, `${signature} should exist`);

  const bodyStart = source.indexOf("{", signatureIndex);
  assert.notEqual(bodyStart, -1, `${signature} should have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
    }
    if (depth === 0) {
      return source.slice(bodyStart + 1, index);
    }
  }

  assert.fail(`${signature} body should close`);
}

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

test("candidate state uses index-qualified keys while preserving payload ids", () => {
  assert.match(
    template,
    /function candidatePayloadId\(candidate, index\) \{\s*return String\(candidate\.candidate_id \?\? `candidate-\$\{index \+ 1\}`\);\s*\}/s
  );
  assert.match(
    template,
    /function candidateKey\(candidate, index\) \{\s*return `\$\{index\}:\$\{candidatePayloadId\(candidate, index\)\}`;\s*\}/s
  );
  assert.doesNotMatch(
    template,
    /function candidateKey\(candidate, index\) \{\s*return String\(candidate\.candidate_id/
  );
  assert.match(
    template,
    /const payloadCandidateId = candidatePayloadId\(candidate, index\);[\s\S]*?candidate_id: payloadCandidateId/
  );
  assert.doesNotMatch(template, /candidate_id: key/);
});

test("not-included rows preserve state but approval payload excludes edits", () => {
  const initialStateBody = extractFunctionBody(template, "function initialState(candidate, key)");
  assert.doesNotMatch(initialStateBody, /usual_quantity:\s*included\s*\?/);
  assert.doesNotMatch(initialStateBody, /family_words:\s*included\s*&&/);

  const setIncludedBody = extractFunctionBody(template, "function setIncluded(row, include)");
  assert.doesNotMatch(setIncludedBody, /entry\.family_words\s*=\s*\[\]/);
  assert.doesNotMatch(setIncludedBody, /entry\.usual_quantity\s*=\s*0/);

  assert.match(
    template,
    /if \(!entry\.include\) \{\s*return \{[\s\S]*?include: false,[\s\S]*?usual_quantity: 0,[\s\S]*?family_words: \[\],[\s\S]*?\};\s*\}/
  );
});

test("candidate-provided row values are escaped before insertion", () => {
  assert.match(template, /<span class="\$\{statusClass\}">\$\{escapeHtml\(statusText\)\}<\/span>/);
  assert.match(template, /const domId = `\$\{safeDomId\(key\)\}-\$\{index\}`;/);
  assert.match(template, /data-candidate-key="\$\{escapeAttribute\(key\)\}"/);
  assert.match(template, /for="words-\$\{escapeAttribute\(domId\)\}"/);
  assert.match(template, /id="quantity-\$\{escapeAttribute\(domId\)\}"/);
  assert.match(template, /value="\$\{escapeAttribute\(wordsValue\)\}"/);
  assert.match(template, /value="\$\{escapeAttribute\(quantityValue\)\}"/);
});

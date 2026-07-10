# Catalog Review HTML Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, self-contained HTML catalog review template that agents can fill with RedMart candidate products, let a household user approve in Chrome, and then read the approved payload before updating `grocery-catalog.yaml`.

**Architecture:** Add a checked-in static HTML template with all user-facing UI, CSS, row-state behavior, quantity controls, approval behavior, and a hidden approved-payload DOM field. Add a small Node renderer that copies the template into a temporary per-run review page by replacing a single JSON data slot, plus Node built-in tests and documentation for agents/users. Generated per-run review files remain temporary and ignored.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Node.js ESM scripts, Node built-in `node:test`, existing Markdown docs.

---

## File Structure

- Create `templates/redmart-catalog-review-template.html`
  - Permanent project asset.
  - Self-contained HTML page with CSS, JavaScript, data-slot placeholder, row rendering, include/not-include behavior, quantity steppers, approval state, and hidden approved payload.
- Create `tools/render-catalog-review.mjs`
  - CLI helper used by agents to inject candidate JSON into the template and write a temporary review HTML file.
  - Does not require npm packages or network access.
- Create `examples/redmart-catalog-review-candidates.sample.json`
  - Small sample candidate dataset for testing and documentation.
- Create `tests/render-catalog-review.test.mjs`
  - Tests renderer behavior, JSON escaping, required approval payload fields, and ignored user-facing copy.
- Create `tests/catalog-review-template-contract.test.mjs`
  - Tests template contract: placeholder exists, required DOM ids exist, required labels exist, forbidden UI words are absent.
- Modify `.gitignore`
  - Ignore `.superpowers/`, `redmart-catalog-review-*.html`, and `redmart-catalog-approval-*.json`.
- Modify `AGENTS.md`
  - Replace Markdown candidate-review boundary with the HTML review flow for initial seeding/substantial updates.
  - Explain how to render the page, ask the user to approve, read the payload, and then update YAML.
- Modify `README.md`
  - Add a short user-facing explanation of the friendly review page during setup.

## Task 1: Add Ignore Rules And Sample Candidate Data

**Files:**
- Modify: `.gitignore`
- Create: `examples/redmart-catalog-review-candidates.sample.json`

- [ ] **Step 1: Update `.gitignore`**

Add these lines after `.DS_Store`:

```gitignore
.superpowers/
redmart-catalog-review-*.html
redmart-catalog-approval-*.json
```

- [ ] **Step 2: Add sample candidate JSON**

Create `examples/redmart-catalog-review-candidates.sample.json`:

```json
{
  "review_schema_version": 1,
  "source": {
    "kind": "redmart-order-history",
    "generated_at": "2026-07-10T00:00:00+08:00",
    "notes": "Sample data for the reusable catalog review template."
  },
  "candidates": [
    {
      "candidate_id": "cand_redmart_cherry_tomato",
      "title": "RedMart Cherry Tomato",
      "pack_size": "250g",
      "observed_price_sgd": 1.85,
      "observed_quantity": 2,
      "purchase_hint": "Bought once",
      "include": true,
      "usual_quantity": 2,
      "family_words": ["cherry tomatoes", "tomatoes"],
      "attention_tag": null,
      "notes": "Visible RedMart order row candidate."
    },
    {
      "candidate_id": "cand_chobani_kids_strawberry",
      "title": "Chobani Kids Pouch Greek Yogurt Strawberry 100G",
      "pack_size": "100g",
      "observed_price_sgd": 2.95,
      "observed_quantity": 4,
      "purchase_hint": "Bought 5 times",
      "include": true,
      "usual_quantity": 4,
      "family_words": ["kids yogurt", "strawberry yogurt", "chobani"],
      "attention_tag": "Needs words",
      "notes": "Several yogurt variants may need distinct family words."
    },
    {
      "candidate_id": "cand_white_castle_butter_cookies",
      "title": "White Castle Butter Cookies",
      "pack_size": "454g",
      "observed_price_sgd": 6.8,
      "observed_quantity": 1,
      "purchase_hint": "Bought once",
      "include": true,
      "usual_quantity": 1,
      "family_words": [],
      "attention_tag": null,
      "notes": "Sample one-off product for not-included row testing."
    }
  ]
}
```

- [ ] **Step 3: Verify JSON parses**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('examples/redmart-catalog-review-candidates.sample.json','utf8')); console.log('sample ok')"
```

Expected output:

```text
sample ok
```

- [ ] **Step 4: Commit**

```bash
git add .gitignore examples/redmart-catalog-review-candidates.sample.json
git commit -m "chore: add catalog review sample data"
```

## Task 2: Add Reusable HTML Review Template

**Files:**
- Create: `templates/redmart-catalog-review-template.html`
- Create: `tests/catalog-review-template-contract.test.mjs`

- [ ] **Step 1: Create the template HTML**

Create `templates/redmart-catalog-review-template.html` with this structure. Keep it self-contained; do not reference external CSS, fonts, images, or scripts.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RedMart Catalog Review</title>
  <style>
    :root {
      color-scheme: light;
      --page: #f7f3ed;
      --surface: #fffdf9;
      --surface-muted: #f0ede8;
      --text: #243128;
      --muted: #66736b;
      --border: #ded6ca;
      --accent: #2f6f4e;
      --accent-strong: #1f5a3c;
      --warning-bg: #fff3cf;
      --warning-text: #73520b;
      --inactive-bg: #ece8e1;
      --inactive-text: #777067;
      --danger: #8b3a2f;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 16px;
      line-height: 1.5;
      letter-spacing: 0;
      color: var(--text);
      background: var(--page);
    }

    button,
    input {
      font: inherit;
      letter-spacing: 0;
    }

    .page-header {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 22px 32px;
      background: rgba(255, 253, 249, 0.97);
      border-bottom: 1px solid var(--border);
      box-shadow: 0 1px 4px rgba(36, 49, 40, 0.08);
    }

    .eyebrow {
      margin: 0 0 4px;
      color: var(--muted);
      font-size: 0.86rem;
      font-weight: 650;
    }

    h1 {
      margin: 0;
      font-size: 1.85rem;
      line-height: 1.2;
    }

    .subtitle {
      margin: 6px 0 0;
      color: var(--muted);
    }

    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 24px;
      max-width: 1220px;
      margin: 0 auto;
      padding: 26px 30px 34px;
    }

    .rows {
      display: grid;
      gap: 16px;
    }

    .row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 190px;
      gap: 22px;
      align-items: start;
      padding: 20px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      box-shadow: 0 1px 2px rgba(36, 49, 40, 0.04);
    }

    .row.not-included {
      background: var(--inactive-bg);
      color: var(--inactive-text);
      opacity: 0.72;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 9px;
      margin-bottom: 8px;
      color: var(--muted);
      font-size: 0.9rem;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 750;
      background: #e3f3e9;
      color: var(--accent-strong);
    }

    .pill.warning {
      background: var(--warning-bg);
      color: var(--warning-text);
    }

    .pill.inactive {
      background: #d8d2c8;
      color: #5d574f;
    }

    .title {
      margin: 0 0 12px;
      font-size: 1.35rem;
      line-height: 1.28;
      font-weight: 760;
    }

    label {
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 0.82rem;
      font-weight: 750;
      text-transform: uppercase;
    }

    .words-input {
      width: 100%;
      min-height: 48px;
      padding: 11px 12px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--text);
    }

    .not-included .words-input {
      background: #e1dcd4;
      color: var(--inactive-text);
    }

    .actions {
      display: grid;
      justify-items: start;
      gap: 12px;
    }

    .stepper {
      display: flex;
      align-items: center;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
    }

    .stepper button {
      width: 52px;
      min-height: 48px;
      border: 0;
      background: #f8f5ef;
      color: var(--text);
      font-size: 1.45rem;
      cursor: pointer;
    }

    .stepper output {
      display: inline-grid;
      place-items: center;
      width: 66px;
      min-height: 48px;
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      font-size: 1.35rem;
      font-weight: 760;
    }

    .secondary-action {
      min-height: 44px;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: 10px;
      background: #fff;
      color: var(--text);
      cursor: pointer;
    }

    .secondary-action.danger {
      color: var(--danger);
    }

    .approve-button {
      min-height: 48px;
      padding: 12px 18px;
      border: 0;
      border-radius: 12px;
      background: var(--accent);
      color: #fff;
      font-weight: 760;
      cursor: pointer;
    }

    .help-panel,
    .bottom-approval,
    .approved-panel {
      border: 1px solid var(--border);
      border-radius: 14px;
      background: var(--surface);
      padding: 20px;
    }

    .help-panel {
      align-self: start;
      position: sticky;
      top: 118px;
    }

    .help-panel h2,
    .bottom-approval h2,
    .approved-panel h2 {
      margin: 0 0 10px;
      font-size: 1.2rem;
    }

    .bottom-approval {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .approved-panel {
      display: none;
      max-width: 760px;
      margin: 52px auto;
      text-align: center;
    }

    .approved .layout,
    .approved .page-header {
      display: none;
    }

    .approved .approved-panel {
      display: block;
    }

    .do-not-close {
      margin: 18px 0;
      color: #7a1f16;
      font-size: 1.55rem;
      font-weight: 850;
    }

    .payload {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    }

    @media (max-width: 860px) {
      .page-header,
      .bottom-approval {
        align-items: stretch;
        flex-direction: column;
      }

      .layout {
        grid-template-columns: 1fr;
        padding: 18px;
      }

      .row {
        grid-template-columns: 1fr;
      }

      .help-panel {
        position: static;
      }
    }
  </style>
</head>
<body>
  <script type="application/json" id="catalog-review-data">__CATALOG_REVIEW_DATA__</script>

  <header class="page-header">
    <div>
      <p class="eyebrow">RedMart catalog setup</p>
      <h1>Review products to remember</h1>
      <p class="subtitle">Everything is included unless you mark it as not included.</p>
    </div>
    <button type="button" class="approve-button" data-approve-top>Approve products</button>
  </header>

  <section class="approved-panel" aria-live="polite">
    <h2>Approved. Go back to the agent to continue.</h2>
    <p class="do-not-close">DO NOT CLOSE THIS TAB.</p>
    <p>The agent will close it for you when it is done.</p>
  </section>

  <main class="layout">
    <section class="rows" id="candidate-rows" aria-label="Candidate products"></section>

    <aside class="help-panel">
      <h2>Your part</h2>
      <p><strong>Skip one-offs.</strong><br>Mark things you do not want remembered.</p>
      <p><strong>Adjust usual quantity.</strong><br>The number to use when a future list just says the item name.</p>
      <p><strong>Family words are optional.</strong><br>Edit them only when the suggested words do not match how you would write, say, or dictate the item.</p>
    </aside>

    <section class="bottom-approval">
      <div>
        <h2>Ready to continue?</h2>
        <p id="bottom-summary">Products will be remembered. Not-included rows will be skipped.</p>
      </div>
      <button type="button" class="approve-button" data-approve-bottom>Approve products</button>
    </section>
  </main>

  <textarea id="catalog-review-approved-payload" class="payload" readonly aria-hidden="true"></textarea>

  <script>
    (() => {
      const dataElement = document.getElementById('catalog-review-data');
      const rowsElement = document.getElementById('candidate-rows');
      const payloadElement = document.getElementById('catalog-review-approved-payload');
      const topApprove = document.querySelector('[data-approve-top]');
      const bottomApprove = document.querySelector('[data-approve-bottom]');
      const bottomSummary = document.getElementById('bottom-summary');
      const reviewData = JSON.parse(dataElement.textContent);

      const state = reviewData.candidates.map((candidate) => ({
        ...candidate,
        include: candidate.include !== false,
        usual_quantity: Number.isInteger(candidate.usual_quantity) && candidate.usual_quantity > 0 ? candidate.usual_quantity : 1,
        family_words: Array.isArray(candidate.family_words) ? candidate.family_words : []
      }));

      function includedCount() {
        return state.filter((candidate) => candidate.include).length;
      }

      function updateApprovalCopy() {
        const count = includedCount();
        const label = `Approve ${count} ${count === 1 ? 'product' : 'products'}`;
        topApprove.textContent = label;
        bottomApprove.textContent = label;
        bottomSummary.textContent = `${count} ${count === 1 ? 'product' : 'products'} will be remembered. Not-included rows will be skipped.`;
      }

      function renderRows() {
        rowsElement.innerHTML = '';
        for (const candidate of state) {
          const row = document.createElement('article');
          row.className = `row${candidate.include ? '' : ' not-included'}`;
          row.dataset.candidateId = candidate.candidate_id;

          const status = candidate.include ? (candidate.attention_tag || 'Included') : 'Not included';
          const pillClass = !candidate.include ? 'inactive' : candidate.attention_tag ? 'warning' : '';
          const wordsValue = candidate.family_words.join(', ');
          const quantity = candidate.include ? candidate.usual_quantity : 0;
          const metaParts = [
            candidate.purchase_hint,
            candidate.observed_price_sgd == null ? null : `$${Number(candidate.observed_price_sgd).toFixed(2)}`,
            candidate.pack_size
          ].filter(Boolean).join(' · ');

          row.innerHTML = `
            <div>
              <div class="meta">
                <span class="pill ${pillClass}">${status}</span>
                <span>${escapeHtml(metaParts)}</span>
              </div>
              <h2 class="title">${escapeHtml(candidate.title)}</h2>
              <label for="words-${candidate.candidate_id}">Family words</label>
              <input id="words-${candidate.candidate_id}" class="words-input" type="text" value="${escapeAttribute(wordsValue)}" ${candidate.include ? '' : 'disabled'} placeholder="Optional">
            </div>
            <div class="actions">
              <label>Usual quantity</label>
              <div class="stepper">
                <button type="button" data-step="-1" ${candidate.include ? '' : 'disabled'} aria-label="Decrease usual quantity">-</button>
                <output>${quantity}</output>
                <button type="button" data-step="1" ${candidate.include ? '' : 'disabled'} aria-label="Increase usual quantity">+</button>
              </div>
              <button type="button" class="secondary-action ${candidate.include ? 'danger' : ''}" data-toggle-include>${candidate.include ? 'Do not include' : 'Include'}</button>
            </div>
          `;

          row.querySelector('.words-input').addEventListener('input', (event) => {
            candidate.family_words = event.target.value.split(',').map((word) => word.trim()).filter(Boolean);
          });

          row.querySelectorAll('[data-step]').forEach((button) => {
            button.addEventListener('click', () => {
              candidate.usual_quantity = Math.max(1, candidate.usual_quantity + Number(button.dataset.step));
              renderRows();
            });
          });

          row.querySelector('[data-toggle-include]').addEventListener('click', () => {
            candidate.include = !candidate.include;
            renderRows();
          });

          rowsElement.appendChild(row);
        }
        updateApprovalCopy();
      }

      function approve() {
        const included = state.filter((candidate) => candidate.include);
        const payload = {
          review_schema_version: 1,
          source: reviewData.source || {},
          approved_at: new Date().toISOString(),
          included_count: included.length,
          candidates: state.map((candidate) => ({
            candidate_id: candidate.candidate_id,
            title: candidate.title,
            pack_size: candidate.pack_size || '',
            observed_price_sgd: candidate.observed_price_sgd ?? null,
            observed_quantity: candidate.observed_quantity ?? null,
            include: candidate.include,
            usual_quantity: candidate.include ? candidate.usual_quantity : 0,
            family_words: candidate.include ? candidate.family_words : [],
            attention_tag: candidate.attention_tag || null,
            notes: candidate.notes || ''
          }))
        };
        payloadElement.value = JSON.stringify(payload, null, 2);
        document.body.classList.add('approved');
      }

      function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (character) => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[character]));
      }

      function escapeAttribute(value) {
        return escapeHtml(value).replace(/`/g, '&#96;');
      }

      topApprove.addEventListener('click', approve);
      bottomApprove.addEventListener('click', approve);
      renderRows();
    })();
  </script>
</body>
</html>
```

- [ ] **Step 2: Add template contract tests**

Create `tests/catalog-review-template-contract.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const templatePath = new URL('../templates/redmart-catalog-review-template.html', import.meta.url);

test('catalog review template contains required data and approval hooks', async () => {
  const html = await readFile(templatePath, 'utf8');

  assert.match(html, /__CATALOG_REVIEW_DATA__/);
  assert.match(html, /id="catalog-review-data"/);
  assert.match(html, /id="candidate-rows"/);
  assert.match(html, /id="catalog-review-approved-payload"/);
  assert.match(html, /data-approve-top/);
  assert.match(html, /data-approve-bottom/);
});

test('catalog review template uses approved user-facing language', async () => {
  const html = await readFile(templatePath, 'utf8');

  assert.match(html, /Review products to remember/);
  assert.match(html, /Everything is included unless you mark it as not included\./);
  assert.match(html, /Family words/);
  assert.match(html, /Usual quantity/);
  assert.match(html, /Do not include/);
  assert.match(html, /Approved\. Go back to the agent to continue\./);
  assert.match(html, /DO NOT CLOSE THIS TAB\./);
  assert.match(html, /The agent will close it for you when it is done\./);

  assert.doesNotMatch(html, /Remove from catalog/);
  assert.doesNotMatch(html, /Export/);
  assert.doesNotMatch(html, /Download JSON/);
  assert.doesNotMatch(html, />Copy</);
});

test('catalog review template uses local system fonts and no external assets', async () => {
  const html = await readFile(templatePath, 'utf8');

  assert.match(html, /font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;/);
  assert.doesNotMatch(html, /https?:\/\//);
  assert.doesNotMatch(html, /@import/);
  assert.doesNotMatch(html, /<link[^>]+stylesheet/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
});
```

- [ ] **Step 3: Run template tests**

Run:

```bash
node --test tests/catalog-review-template-contract.test.mjs
```

Expected output includes:

```text
# pass 3
# fail 0
```

- [ ] **Step 4: Commit**

```bash
git add templates/redmart-catalog-review-template.html tests/catalog-review-template-contract.test.mjs
git commit -m "feat: add RedMart catalog review template"
```

## Task 3: Add Renderer For Per-Run Review Pages

**Files:**
- Create: `tools/render-catalog-review.mjs`
- Create: `tests/render-catalog-review.test.mjs`

- [ ] **Step 1: Add renderer CLI**

Create `tools/render-catalog-review.mjs`:

```js
#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const templatePath = path.join(repoRoot, 'templates', 'redmart-catalog-review-template.html');

export function normalizeReviewData(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Review data must be a JSON object.');
  }
  if (!Array.isArray(raw.candidates)) {
    throw new Error('Review data must include a candidates array.');
  }

  return {
    review_schema_version: Number(raw.review_schema_version || 1),
    source: raw.source && typeof raw.source === 'object' ? raw.source : {},
    candidates: raw.candidates.map((candidate, index) => normalizeCandidate(candidate, index))
  };
}

function normalizeCandidate(candidate, index) {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`Candidate at index ${index} must be an object.`);
  }
  const candidateId = stringValue(candidate.candidate_id);
  const title = stringValue(candidate.title);
  if (!candidateId) {
    throw new Error(`Candidate at index ${index} is missing candidate_id.`);
  }
  if (!title) {
    throw new Error(`Candidate ${candidateId} is missing title.`);
  }

  return {
    candidate_id: candidateId,
    title,
    pack_size: stringValue(candidate.pack_size),
    observed_price_sgd: numberOrNull(candidate.observed_price_sgd),
    observed_quantity: integerOrNull(candidate.observed_quantity),
    purchase_hint: stringValue(candidate.purchase_hint) || 'Bought in RedMart order history',
    include: candidate.include !== false,
    usual_quantity: positiveInteger(candidate.usual_quantity, candidate.observed_quantity, 1),
    family_words: Array.isArray(candidate.family_words)
      ? candidate.family_words.map(stringValue).filter(Boolean)
      : [],
    attention_tag: stringValue(candidate.attention_tag) || null,
    notes: stringValue(candidate.notes)
  };
}

function stringValue(value) {
  return value == null ? '' : String(value).trim();
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function positiveInteger(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isInteger(number) && number > 0) return number;
  }
  return 1;
}

export async function renderCatalogReview({ inputPath, outputPath, template = templatePath }) {
  const [templateHtml, inputJson] = await Promise.all([
    readFile(template, 'utf8'),
    readFile(inputPath, 'utf8')
  ]);
  const normalized = normalizeReviewData(JSON.parse(inputJson));
  const escapedJson = JSON.stringify(normalized).replace(/</g, '\\u003c');

  if (!templateHtml.includes('__CATALOG_REVIEW_DATA__')) {
    throw new Error('Template is missing __CATALOG_REVIEW_DATA__ placeholder.');
  }

  const html = templateHtml.replace('__CATALOG_REVIEW_DATA__', escapedJson);
  await writeFile(outputPath, html, 'utf8');
  return { outputPath, candidateCount: normalized.candidates.length };
}

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    args.set(argv[index], argv[index + 1]);
  }
  return {
    inputPath: args.get('--input'),
    outputPath: args.get('--output')
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.inputPath || !options.outputPath) {
    console.error('Usage: node tools/render-catalog-review.mjs --input candidates.json --output redmart-catalog-review-YYYY-MM-DD.html');
    process.exit(1);
  }

  renderCatalogReview(options)
    .then((result) => {
      console.log(`Wrote ${result.outputPath} with ${result.candidateCount} candidates.`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
}
```

- [ ] **Step 2: Add renderer tests**

Create `tests/render-catalog-review.test.mjs`:

```js
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { normalizeReviewData, renderCatalogReview } from '../tools/render-catalog-review.mjs';

test('normalizeReviewData preserves candidate review fields', () => {
  const normalized = normalizeReviewData({
    candidates: [
      {
        candidate_id: 'cand_1',
        title: 'RedMart Cherry Tomato',
        observed_quantity: 2,
        observed_price_sgd: '1.85',
        family_words: ['cherry tomatoes', 'tomatoes']
      }
    ]
  });

  assert.equal(normalized.review_schema_version, 1);
  assert.equal(normalized.candidates[0].include, true);
  assert.equal(normalized.candidates[0].usual_quantity, 2);
  assert.deepEqual(normalized.candidates[0].family_words, ['cherry tomatoes', 'tomatoes']);
  assert.equal(normalized.candidates[0].observed_price_sgd, 1.85);
});

test('normalizeReviewData rejects missing required fields', () => {
  assert.throws(
    () => normalizeReviewData({ candidates: [{ candidate_id: 'cand_missing_title' }] }),
    /missing title/
  );
  assert.throws(
    () => normalizeReviewData({ candidates: [{ title: 'No candidate ID' }] }),
    /missing candidate_id/
  );
});

test('renderCatalogReview writes static html with escaped embedded data', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'catalog-review-test-'));
  try {
    const inputPath = path.join(tempDir, 'candidates.json');
    const outputPath = path.join(tempDir, 'review.html');
    await writeFile(inputPath, JSON.stringify({
      source: { kind: 'test' },
      candidates: [
        {
          candidate_id: 'cand_script',
          title: 'Safe <script> Title',
          usual_quantity: 1,
          family_words: ['safe words']
        }
      ]
    }), 'utf8');

    const result = await renderCatalogReview({ inputPath, outputPath });
    const html = await readFile(outputPath, 'utf8');

    assert.equal(result.candidateCount, 1);
    assert.match(html, /id="catalog-review-data"/);
    assert.doesNotMatch(html, /__CATALOG_REVIEW_DATA__/);
    assert.match(html, /Safe \\u003cscript> Title/);
    assert.match(html, /catalog-review-approved-payload/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run renderer tests**

Run:

```bash
node --test tests/render-catalog-review.test.mjs
```

Expected output includes:

```text
# pass 3
# fail 0
```

- [ ] **Step 4: Render sample review page**

Run:

```bash
node tools/render-catalog-review.mjs --input examples/redmart-catalog-review-candidates.sample.json --output redmart-catalog-review-2026-07-10-sample.html
```

Expected output:

```text
Wrote redmart-catalog-review-2026-07-10-sample.html with 3 candidates.
```

The generated HTML is ignored by `.gitignore`.

- [ ] **Step 5: Commit**

```bash
git add tools/render-catalog-review.mjs tests/render-catalog-review.test.mjs
git commit -m "feat: add catalog review renderer"
```

## Task 4: Verify Browser Interaction And Approved Payload

**Files:**
- Modify only if verification finds a bug:
  - `templates/redmart-catalog-review-template.html`
  - `tools/render-catalog-review.mjs`
  - relevant test file

- [ ] **Step 1: Open the generated sample page in Chrome**

Open `redmart-catalog-review-2026-07-10-sample.html` in the logged-in/browser-capable environment. Use the in-app browser or Chrome browser-control tooling, not a local server.

- [ ] **Step 2: Exercise the review controls**

In the page:

1. Confirm the top button says `Approve 3 products`.
2. Click `Do not include` for `White Castle Butter Cookies`.
3. Confirm that row stays in place, becomes dimmed, shows `Not included`, and quantity shows `0`.
4. Click `+` for `RedMart Cherry Tomato`.
5. Confirm its `Usual quantity` changes from `2` to `3`.
6. Edit `Family words` for `Chobani Kids Pouch Greek Yogurt Strawberry 100G` to `kids yogurt, strawberry yogurt`.
7. Confirm the top and bottom buttons say `Approve 2 products`.
8. Click `Approve 2 products`.
9. Confirm the page shows:

```text
Approved. Go back to the agent to continue.
DO NOT CLOSE THIS TAB.
The agent will close it for you when it is done.
```

- [ ] **Step 3: Read approved payload from the page**

Use browser evaluation to read:

```js
document.getElementById('catalog-review-approved-payload').value
```

Expected parsed JSON properties:

```json
{
  "review_schema_version": 1,
  "included_count": 2
}
```

Also confirm:

- `cand_redmart_cherry_tomato.include` is `true`.
- `cand_redmart_cherry_tomato.usual_quantity` is `3`.
- `cand_chobani_kids_strawberry.family_words` is `["kids yogurt", "strawberry yogurt"]`.
- `cand_white_castle_butter_cookies.include` is `false`.
- `cand_white_castle_butter_cookies.usual_quantity` is `0`.

- [ ] **Step 4: Fix any browser issues and rerun tests**

If a bug appears, make the minimal fix and run:

```bash
node --test tests/catalog-review-template-contract.test.mjs tests/render-catalog-review.test.mjs
```

Expected output includes:

```text
# fail 0
```

- [ ] **Step 5: Commit if changes were needed**

If Step 4 required edits:

```bash
git add templates/redmart-catalog-review-template.html tools/render-catalog-review.mjs tests
git commit -m "fix: polish catalog review browser behavior"
```

If no edits were required, do not create an empty commit.

## Task 5: Update Agent Instructions

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update the approval-boundary instructions**

In `AGENTS.md`, under `Initial Catalog Seeding` > `Before Seeding`, replace the Markdown-only approval boundary with HTML review-page guidance.

Use this wording:

```markdown
5. For initial seeding or substantial catalog updates, use the reusable HTML review template as the approval boundary before editing `grocery-catalog.yaml`.
6. Generate a temporary per-run review page by inserting discovered candidate data into `templates/redmart-catalog-review-template.html`.
7. Ask the user to review the page in Chrome and click `Approve N products`.
8. After approval, read the approved payload from the open page's `#catalog-review-approved-payload` field before editing `grocery-catalog.yaml`.
9. Do not update `grocery-catalog.yaml` until the user has approved the HTML review page.
10. After reading the payload, offer to close the review tab and remove the temporary per-run review page unless the user asks to keep it.
```

Keep the scratch-file requirements and the safety rules about not ordering.

- [ ] **Step 2: Add review-page generation note**

In `AGENTS.md`, under `Discovery Pass`, add this Markdown block:

````markdown
After drafting candidates, prepare candidate JSON with stable `candidate_id` values and render a temporary review page:

```bash
node tools/render-catalog-review.mjs --input <candidate-json> --output redmart-catalog-review-<date>.html
```

Open the generated page for the user. The page keeps all items included by default. The user can mark one-offs as `Do not include`, adjust `Usual quantity`, optionally edit `Family words`, and approve the included product count.
````

- [ ] **Step 3: Add approved-payload handling note**

In `AGENTS.md`, under `Detail And Product Resolution Pass`, add:

```markdown
For HTML-reviewed catalog updates, treat the approved payload as the candidate source of truth. Do not re-add products the user marked as not included. Resolve canonical item IDs and SKU IDs only for approved included products, unless a skipped row is needed to detect a duplicate or title drift.
```

- [ ] **Step 4: Verify docs mention the key safety copy**

Run:

```bash
rg -n "Approve N products|catalog-review-approved-payload|Do not include|temporary per-run review page" AGENTS.md
```

Expected: each phrase appears at least once.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md
git commit -m "docs: document catalog review template workflow"
```

## Task 6: Update User README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update Make It Yours**

In `README.md`, under `Make It Yours`, replace the final sentence:

```markdown
5. Review the generated catalog before using it for a real cart fill.
```

with:

```markdown
5. Review the generated catalog page. It keeps discovered products included by default, lets you mark one-offs as `Do not include`, adjust `Usual quantity`, and optionally edit `Family words`.
6. Click `Approve N products` when the page looks right.
7. When the page says `Approved. Go back to the agent to continue.` and `DO NOT CLOSE THIS TAB.`, return to your agent. The agent will read the approved page, update the catalog, and close or clean up the temporary review page.
```

- [ ] **Step 2: Update What Is In This Repo**

In `README.md`, under `What Is In This Repo`, add:

```markdown
- `templates/redmart-catalog-review-template.html` - reusable local review page template for catalog seeding and substantial catalog updates.
```

- [ ] **Step 3: Verify README stays user-facing**

Run:

```bash
rg -n "JSON|payload|catalog-review-approved-payload|template internals" README.md
```

Expected: no matches for `payload`, `catalog-review-approved-payload`, or `template internals`. `JSON` should not appear in the new user-facing setup instructions.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: explain catalog review page setup"
```

## Task 7: Final Verification And Cleanup

**Files:**
- Generated temporary file to remove: `redmart-catalog-review-2026-07-10-sample.html`
- No source files should change unless verification exposes an issue.

- [ ] **Step 1: Run all automated tests**

Run:

```bash
node --test tests/catalog-review-template-contract.test.mjs tests/render-catalog-review.test.mjs
```

Expected output includes:

```text
# fail 0
```

- [ ] **Step 2: Verify sample render still works**

Run:

```bash
node tools/render-catalog-review.mjs --input examples/redmart-catalog-review-candidates.sample.json --output redmart-catalog-review-2026-07-10-sample.html
```

Expected output:

```text
Wrote redmart-catalog-review-2026-07-10-sample.html with 3 candidates.
```

- [ ] **Step 3: Verify generated sample is ignored**

Run:

```bash
git status --short
```

Expected: `redmart-catalog-review-2026-07-10-sample.html` does not appear.

- [ ] **Step 4: Remove generated sample**

Run:

```bash
rm redmart-catalog-review-2026-07-10-sample.html
```

This is safe because the file is a generated temporary sample review page.

- [ ] **Step 5: Verify working tree**

Run:

```bash
git status --short
```

Expected: no tracked source changes remain. Untracked `.superpowers/` may remain from brainstorming and should not be committed.

## Self-Review Checklist

- [ ] Spec coverage: confirm template, static page, approved message, do-not-close tab, data payload, docs, tests, and generated-artifact cleanup are all covered by tasks above.
- [ ] Placeholder scan: verify the plan contains no placeholder phrases, vague implementation instructions, or deferred work markers.
- [ ] Type consistency: confirm the plan consistently uses `candidate_id`, `usual_quantity`, `family_words`, `attention_tag`, `include`, `included_count`, and `catalog-review-approved-payload`.

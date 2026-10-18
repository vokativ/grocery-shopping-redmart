# Developer and contributor guide

This document contains the technical and open-source details intentionally kept out of the family-facing README.

## Project status

RedMart/Lazada Singapore is the maintained reference workflow. ChatGPT Desktop's visible built-in browser has two historical supervised Terra/Medium cart runs with no observed judgment errors. That limited evidence does not cover catalog seeding, OMP, Claude Desktop, or every failure branch. OMP Browser Relay has a reversible three-product smoke test and the later household failure report below; visible Chrome loopback CDP was used for catalog work in T3 Code on September 14. CDP cart mutations remain unqualified; the 2026-10-18 review below added `tools/cdp-cart.mjs` for that path, but it has not yet completed a supervised live run. Model choice remains user-controlled, and alternative channels do not relax identity, visibility, approval, privacy, or checkout boundaries.

The project is currently being hardened for a small tester cohort and will then move to best-effort maintenance. There is no response-time, retailer, browser, operating-system, or agent compatibility guarantee.

## Development setup

Requirements:

- Node.js 20 or newer (22+ for `tools/cdp-cart.mjs`, which uses the built-in WebSocket).
- npm.
- Git.

```bash
git clone https://github.com/vokativ/grocery-shopping-redmart.git
cd grocery-shopping-redmart
npm install
npm test
npm run validate
npm run dry-run -- --file examples/grocery-list.txt
```

The dry run is a developer and diagnostic tool. Normal household users on the primary path should work through Codex in the ChatGPT desktop app. OMP users should follow the separate browser setup guide before live browser work.

## Repository map

- `grocery-catalog.yaml` — household aliases, quantities, ranked canonical products, and household baskets.
- `AGENTS.md` — browser-operating, seeding, verification, and safety rules.
- `.env.example` — template for optional household login credentials used for automated sign-in.
- `tools/catalog.mjs` — catalog loading, validation, exact aliases, alias-specific eligibility, local discovery hints, and basket expansion.
- `docs/browser-connections.md` — shared connection hierarchy, compatibility matrix, and source references.
- `tools/dry-run.mjs` — credential-free proposed-cart diagnostic.
- `tools/cdp-cart.mjs` — paced, exact-SKU product-page and cart reader/stepper for a visible loopback-CDP Chrome session (Node 22+).
- `docs/cart-procedures.md` — less common cart branches (subagents, cart-row fallback, promotion groups, test cleanup) split out of AGENTS.md.
- `tools/validate-catalog.mjs` — catalog integrity checks.
- `tools/render-catalog-review.mjs` — renderer for the shared catalog seeding and incremental-update approval page.
- `tools/serve-catalog-review.mjs` — loopback-only server that makes the generated approval page available to the selected visible browser.
- `templates/redmart-catalog-review-template.html` — reusable local approval UI.
- `tests/` — behavioral catalog, CLI, renderer and loopback-server tests; source-text assertions are not evidence that an agent follows instructions.
- `.github/workflows/ci.yml` — credential-free CI.

## Validation rules

`npm run validate` checks that:

- The YAML catalog parses.
- Item IDs are unique.
- Default quantities are positive integers.
- Aliases and preferred product lists are present.
- Product ranks are positive and unique within an item.
- Optional `alias_product_ranks` maps existing item aliases to nonempty, distinct existing ranks; normalized alias keys cannot collide.
- Item and SKU IDs contain digits.
- Canonical URLs match the stored item and SKU IDs.
- Item/SKU pairs do not collide across the catalog.
- `household_baskets`, when present, is an array.
- Basket IDs are unique and do not collide with item IDs.
- Basket default quantities are positive integers.
- Every basket has at least two distinct members, each referring to an existing item; baskets cannot contain other baskets.
- Aliases are unique across the whole catalog and cannot begin with a quantity prefix.

Live RedMart behavior cannot be tested in CI because it depends on a household's logged-in browser. Perform a careful smoke test on an allowed real, visible browser surface before meaningful releases or after credible breakage reports. Record the harness, model/reasoning setting when exposed, browser control channel (`iab`, OMP relay, or loopback CDP), and whether the run was direct or Remote.

### Household baskets

`household_baskets` is an optional list of family-level aliases that deliberately resolve to a mix of catalog items. A basket has an ID, category, default total quantity, aliases, and two or more item members. Its total packs are allocated in declared member order: each member receives `floor(total / members)` packs, then the earliest members absorb the remainder, and members allocated zero packs are omitted. Flavour-specific aliases on the member items keep resolving to that single item. Availability and ranked fallback are evaluated per member, and an unavailable member is reported rather than rebalanced onto a sibling.

`matchList` returns one result for every non-empty input line. Each result has a `selections[]` array of its concrete product selections, and basket matches also include a `basket_id`. Ordinary items no longer expose flat `product`/`pack_size`/`canonical_url` fields on the result itself — read `selections[0]` instead. That deliberate shape change is why `catalog_version` moved from `1` to `2`. The dry run prints the matched-input ratio and the resulting cart-row count separately, so expansion is visible before browser work.

Every `selection.candidates` array retains **all** approved products in ascending rank order, with exact catalog item/SKU IDs and canonical URLs. Optional `alias_product_ranks` maps a specific alias to its compatible ranks (for example `red apples: [2]`). For those aliases, `eligible_candidates` contains only compatible products in catalog rank order, and the proposal fields use its first product. Generic aliases and basket members retain their original preferences. This is an additive version-2 extension; consumers must honor `eligible_candidates` when present. Neither matching nor a dry run checks live availability. `node tools/dry-run.mjs --json "feta cheese"` exposes the complete result without human-table output; use it to initialize an agent manifest, not as proof of a filled cart.


## Catalog maintenance

Use this flow when adapting the repository for a new household (initial seeding) or adding products from a later RedMart order (incremental updates). Both paths use the same candidate JSON structure, reusable HTML review page, approval payload, canonical-product resolution, and catalog validation rules.

### Choose the entry point

- **Initial seeding:** review a useful batch of recent RedMart orders to establish the household catalog.
- **Incremental update:** when the user asks to add products from the last/recent order, inspect only the order or small order range needed for that request. Compare candidates with `grocery-catalog.yaml` early so the review page focuses on genuinely new household items, new pack sizes, aliases that need adding, and possible title drift.

Do not invent a separate update UI or bypass review just because the catalog already exists. A substantial incremental update uses the same approval boundary as initial seeding. For a single product that the user has already selected and left open, see [Adding individual items](#adding-individual-items).

### Before catalog work

1. Read `AGENTS.md` before using the browser and briefly restate whether this is initial seeding or an incremental update.
2. For initial catalog seeding or substantial cart/catalog updating, keep a temporary scratch file while working.
3. Use the scratch file to track page-reading progress, challenge prompts, stale state, title drift, and unresolved decisions.
4. At the end of the process, summarize the useful outcome to the user and remove the scratch file. Do not make scratch files part of the user's normal workflow.
5. For initial seeding or substantial catalog updates, use the reusable HTML review template as the approval boundary before editing `grocery-catalog.yaml`.
6. Do not manually edit or reinvent `templates/redmart-catalog-review-template.html` during normal seeding or updating. Prepare candidate JSON in the shape shown by `examples/redmart-catalog-review-candidates.sample.json`, then render the temporary page with `tools/render-catalog-review.mjs`.
7. Ask the user to review the page in the active controlled browser and click `Approve N products`.
8. After approval, read the approved payload from the open page's `#catalog-review-approved-payload` field before editing `grocery-catalog.yaml`.
9. Do not update `grocery-catalog.yaml` until the user has approved the HTML review page.
10. After reading the payload, stop the temporary loopback review server, offer to close the review tab, and remove the temporary per-run review page unless the user asks to keep it.

Approval is a **human-only** action. The agent must never click `Approve`, call its handler, construct a replacement “approved” payload, or reset/re-render a review after the user says they finished. “Done in the browser” means recover the user's choices, not approve the defaults on their behalf.

### Discovery pass

1. Start from the selected signed-in browser profile on the active desktop or connected host.
2. Open the Lazada `My Orders` page: `https://my.lazada.sg/customer/order/index/`.
3. Use only order cards whose visible shop or store name is `RedMart`.
4. Click `Show All` on RedMart cards when present.
5. Ignore Taobao and other Lazada seller orders unless the user explicitly asks to include them.
6. Build draft catalog candidates from visible order-row data: product title, pack size or SKU label, quantity, and observed price.
7. Ask the user to remove one-offs, choose which candidates belong in the household catalog, and clarify aliases or unclear product matches.

For an incremental update from the last/recent order:

1. For “last N days,” state the local calendar range (today and N−1 preceding dates unless a rolling window was specified), use placed dates, and stop after confirming the first older order. Start with the specific order named, or the newest RedMart order for `last order`. Confirm the placed date on its detail page; a delivery date or card position alone does not prove it was ordered today.
2. Draft candidates only from that small scope; do not rescan the household's full history unless the user asks.
3. Compare visible candidates with existing catalog entries before rendering the review page. Suppress exact existing item/SKU pairs unless they reveal title drift or useful alias/quantity changes that need review.
4. Put new pack sizes under the existing household concept when appropriate, and surface genuinely new concepts as new-item candidates.
5. Set `source.kind` to a descriptive value such as `redmart-order-update` and record only the minimum non-sensitive order context needed in temporary notes.
6. Continue through the same HTML approval, detail/product resolution, insertion, validation, and cleanup steps below.

Use the review notes to distinguish **new concept**, **additional ranked SKU**, **alias change**, and **preference change**. Keep existing ranks by default; one out-of-stock or incomplete page does not prove a permanent preference change. A rank promotion must be an explicit review proposal. Brand-to-generic mappings such as “Cif” to a RedMart cleanser also need explicit approval, not fuzzy matching. Suppress free gifts and unchanged rows by default. Group questions into this one review page instead of asking for each product in chat.

The `My Orders` overview is the discovery page, not the final source of canonical product IDs. During testing, overview product links appeared as JavaScript/hash links rather than stable `https://www.lazada.sg/products/i<item_id>-s<sku_id>.html` URLs. Overview SKU titles and photos may not navigate to product pages. Do not treat overview rows as canonical product identity.

Lazada overview pagination can update visible order cards while leaving embedded app state such as `window.__initData__`, detail/header anchors, or previously parsed order IDs stale. If visible page text and parsed state disagree, trust the visible page for candidate drafting only, record the mismatch in the scratch file, and switch to order-detail pages for canonical item IDs.

For RedMart filtering, prefer visible page text over brittle CSS selectors. The most reliable signal is the visible shop or detail-page seller name `RedMart`. Detail-row data can also expose `bizCode: ali.global.lazada.trade.redmart`, which is a stronger RedMart signal than checking whether the overall page body contains the word `RedMart`. In inspected order-detail URLs, `shopGroupKey=ORDERLOGIC_<tradeOrderId>_99197_...` appeared on RedMart orders, while non-RedMart examples used other IDs and visible names such as `Living Crazy`, `Bike Terminal`, and `Taobao`; treat that URL token as a supporting hint, not a permanent rule.

### Review page generation

After drafting candidates, prepare candidate JSON using `examples/redmart-catalog-review-candidates.sample.json` as the structure reference. Include `review_schema_version`, `source`, and a `candidates` array.

For each candidate, include a stable `candidate_id`, `title`, and any available `pack_size`, `observed_price_sgd`, `observed_quantity`, `usual_quantity`, `family_words`, `attention_tag`, and `notes`. Use `include: true` by default unless there is a clear reason to start an item as not included.

Render the temporary review page with the provided tool:

```bash
node tools/render-catalog-review.mjs --input <candidate-json> --output redmart-catalog-review-<date>.html
```

The renderer uses `templates/redmart-catalog-review-template.html`. Do not hand-edit the reusable template or create a one-off review UI unless the user explicitly asks for a template change.

Start the temporary loopback-only review server in a background/helper process:

```bash
node tools/serve-catalog-review.mjs --file redmart-catalog-review-<date>.html
```

Record the process and printed `http://127.0.0.1:<port>/` URL in the scratch file. Open that URL in the already selected visible browser/profile, in a dedicated review tab; do not replace `127.0.0.1` with `0.0.0.0`, a LAN address, or a public host. The user may need to approve first-time website access for `127.0.0.1`. The user can exclude one-offs, adjust quantities and family words, then approve the included count once. Use a dedicated foreground tab occupying the available window area. Remove accidental viewport/device emulation; resize the existing tab without reloading so user edits and approval survive.

When the user returns, reacquire the existing review tab without navigating or reloading it. Read `#catalog-review-approved-payload` through an element-scoped live `.value` read; the current template also mirrors the same JSON in `.textContent` for DOM readers. The payload must parse, correspond to this run's candidate IDs, and preserve every exclusion, quantity and alias edit. If the reads disagree, stop before catalog edits.

If the payload appears empty, inspect the visible approval panel, verify tab ownership, and try the other supported DOM/property read. Check only this run's review tabs for duplicates. A blank tool read does not negate the user's report. Do not click Approve yourself. If the user's payload cannot be recovered, explain that exact retrieval problem and ask them to return to the existing review tab; request a new review only if the previous choices are genuinely lost. Keep the server and scratch state until recovery or explicit cancellation; after a valid payload is captured, stop the server even if later product resolution fails.

### Detail and product resolution pass

1. For retained candidates, open RedMart order detail pages in new tabs, ideally from the order card's order title, order number, logo, or another visible detail-opening control.
2. Verify each tab is an order detail page such as `https://my.lazada.sg/customer/order/view/?tradeOrderId=...`.
3. Process SKU rows from the order detail page, not from the order overview.
4. From each order detail page, click the SKU title or product photo to reach the product page when possible.
5. If a detail-page SKU click fails but the detail page exposes `itemUrl`, `itemId`, and `skuId`, use those fields as a recorded fallback instead of generic product search.
6. Open canonical product URLs to confirm current title and pack size before inserting catalog entries.
   If only an item ID is exposed, the item-only page is a discovery step, not final SKU proof. Read its selected variant data, then open the resulting exact item/SKU canonical URL and verify the settled heading and pack. Do not choose the first entry of a multi-variant array or guess a SKU. Bound detail-click recovery using the browser recovery rules before falling back to page data.
7. Offer to close agent-opened order and product tabs when catalog seeding or catalog updating is done.

For HTML-reviewed catalog updates, treat the approved payload as the candidate source of truth. Do not re-add products the user marked as not included. Resolve canonical item IDs and SKU IDs only for approved included products, unless a skipped row is needed to detect a duplicate or title drift.

### Gentle browser use and verification prompts

This is legitimate user-assisted shopping from a logged-in household account, but still behave like a careful human browser session rather than a scraper.

- Do not rapid-fire clicks, reloads, pagination actions, API calls, or product-page opens.
- Use one overview tab plus one detail/product tab by default. Avoid opening many order or product tabs at once.
- After pagination, navigation, or `Show All`, wait for visible page state to settle before the next action.
- Process orders in small batches, for example 5-10 orders, then pause to summarize scratch notes and reassess.
- Prefer normal visible UI navigation over direct API probing. Do not repeatedly POST to Lazada order APIs.
- If page state is stale, record the issue and change strategy instead of retrying quickly.
- If Lazada shows a slider, CAPTCHA, "unusual traffic", or similar verification modal, stop immediately and ask the user to clear it in the visible active browser. Do not bypass or automate the challenge.

### Catalog insertion rules

1. Compare `item_id` + `sku_id` before relying on title matching.
2. If a retained candidate resolves to an item/SKU already in `grocery-catalog.yaml` under a different title, do not add a duplicate. Record the title drift in the temporary scratch file.
3. If a product is the same household concept but a different pack size, add it as another ranked product under the existing item instead of creating a duplicate household item.
4. If a product page is unavailable or the match is unclear, keep it out of the catalog or rank it as a fallback only after human review.
5. Use a `household_baskets` entry when the household says one word but deliberately wants a mix of catalogued flavours. A basket has an ID, category, total default quantity, aliases, and members; it must have at least two members, each referencing an existing item, and baskets cannot nest.
6. After editing the catalog, validate that `grocery-catalog.yaml` parses and check that newly added item/SKU pairs do not collide with existing entries with `npm run validate` or `node tools/validate-catalog.mjs`.

### Catalog aliases and restrictions

Use aliases that match what the family would naturally write or say, not only the exact SKU title. Prefer general household terms such as `cream cheese`, `mayo`, `cherry tomatoes`, or `fabric softener`; add brand names only when they are likely to be spoken, such as `downy` or `anchor butter`. Include useful singular, plural, and shorthand forms. Aliases must be globally unique across items and baskets. Avoid aliases that are too broad and likely to collide with other catalog items; for example, use `cream cheese` instead of `cheese` when the catalog has several cheeses. A generic word that maps to one product remains an ordinary item; use a basket only for a deliberate mix of catalogued flavours. Ask before finalizing unclear aliases. Specific aliases must not route to an incompatible generic default: propose `alias_product_ranks` restrictions in review notes where colour, flavour, brand, or form narrows choices. Verify the selected SKU and eligible fallback chain for each new alias with a dry run.

Never place an order, choose delivery slots, confirm payment, save payment details, or go past cart/review steps while seeding the catalog.

### Adding individual items

To add a single new item from an open page:

1. Search or add the preferred product manually once in RedMart/Lazada.
2. Leave the product page or cart open in the active controlled browser.
3. Scrape the title, item ID, SKU ID, canonical URL, pack size, current quantity, price reference, and aliases.
4. Add a new item to `grocery-catalog.yaml`, add another ranked product under an existing item, or add a `household_baskets` entry that references existing items for a new mix.
5. Validate the catalog via `npm run validate` (or `node tools/validate-catalog.mjs`).

## Session reliability review 2026-10-18

Session analysis of a T3 Code run using the Antigravity harness with `gemini-3.8-flash-high`, driving the household Chrome over loopback CDP. This was the first cart fill through raw CDP; previous successful runs used ChatGPT Desktop's browser or the OMP relay. 12 of 14 matched products were added; the model then told the user that Lazada anti-automation throttling had blocked the last two.

| Observed issue | Evidence | Change |
|---|---|---|
| Slow start (~2.5 min before browser work, ~12 min total) | The harness `Read` tool failed on README, AGENTS.md, and docs; `preview_open` failed; no CDP library was installed, so the model re-implemented a WebSocket CDP client in about 40 throwaway scripts. | `tools/cdp-cart.mjs` gives a tested CDP path. AGENTS.md tells agents to read files through the shell when a read tool fails. |
| Proposed cart skipped; all 14 products added by one unattended batch script with fixed sleeps | 12 adds in about 80 seconds, single reads, and stock inferred from full-page text. | New **Browser Pace And Silent No-Ops** rule: one product at a time, ~2 s between cart clicks, no batch mutation scripts. The helper enforces the click gap. |
| Tomato sauce skipped as “already at target” | A global `.next-number-picker` selector matched a mini-cart stepper. | The helper reads only `#module_redmart_add_to_cart` and `#module_redmart_delivery`. |
| Beef/Prego Add clicks were silent no-ops, followed by 6–8 further clicks and a forbidden DOM `click()` | The burst triggered Lazada's Baxia challenge on `mtop.lazada.carts.add`: a full-page `.baxia-dialog` overlay with a slider iframe (`…/_____tmd_____/punish`). It covered the Add button, so later clicks hit the overlay. The product tab was in the background (`visibilityState: hidden`), so the user never saw the slider. | Foreground-tab requirement for clicks; the helper calls `Page.bringToFront`, refuses to click unless visible, and returns `status: challenge` when the overlay is present or appears after a click. AGENTS.md names the overlay and requires a human hand-off. The no-op rule (one retry, 60 s pause, one attempt, hand-back) remains for genuine no-ops. |
| “Anti-automation throttling” reported from console noise | The conclusion was right, but the cited `epssw.js` errors were page-load noise; the model never found the visible challenge or asked the user to solve it. The header count of 19 that looked like a mismatch was units (4 baseline + 15 added). | Report a challenge from the page (the Baxia overlay), not from console errors. The helper reports `cart_requests` per click for diagnosis. |

The first version of this review said no challenge had appeared; that was wrong. A follow-up run the same day (below) found the Baxia overlay still sitting in the never-reloaded product tab. The first 12 adds used the same mechanism and succeeded, so this was rate-based challenge behaviour after a burst, not a site-wide change.

**Follow-up run (same day, same model).** The new instructions largely worked. The agent used the helper, read the baseline, found the 12 earlier adds, and stopped at the two missing products. `set-qty` refused because the Add button was covered, and the agent identified the Baxia overlay, foregrounded the tab, and handed it to the user. Gaps that remained: it reused the stale beef tab from the first run, so it met the old challenge rather than a fresh page; it edited `tools/cdp-cart.mjs` mid-run (a correct fix: cart quantities read `null` because the row walk stopped at the row checkbox); and it did not show the proposed cart before browser work. The same two items failed both times because they were the leftovers of the first run and the challenge was still unsolved, not because of anything specific to those products. Changes: explicit `challenge` status in the helper, a rule to re-`goto` stale tabs, and a rule against editing tools during a shopping run. AGENTS.md was also shortened: the core flow, decision table, and quantity workflow stay in AGENTS.md; subagent coordination, cart-row fallback, promotion-editor detail, pack-size nuance, and test cleanup moved to `docs/cart-procedures.md`.

Verification for this change: unit tests for loopback/ID/availability/pacing logic pass; `tabs` and `product` were exercised read-only against the live household tab and returned the correct IDs, availability, and main control. `set-qty` and `cart` have **not** been run live; the stepper's up/down handler selectors (`[class*='handler-up']`/`[class*='handler-down']`) are inferred from the Fusion number-picker markup and fail safe (`not-ready`) if absent.

## Session reliability review 2026-09-14

This review uses the conversation and local repository evidence, not a new shopping benchmark. The user authorized instruction/code fixes and commit/push. The four previously HTML-approved catalog additions are included; generic product ranks remain unchanged.

| Observed issue | Improvement |
|---|---|
| Missing integrated view was treated as a missing browser, despite an existing Chrome session | One discovery hierarchy: integrated view, existing sessions, authorized CDP/relay, supported computer use. Recover prior selection/permission before asking. |
| Cheddar at rank 2 was missed when the list said shredded cheddar | Local suggestions inspect aliases and every product title; disclose sliced/shredded mismatch and obtain acceptance only for that difference. |
| Adding “red apples” as a generic alias still selected green apples | Alias-specific rank restrictions select Royal Gala; corresponding cheese aliases select their named variety. Generic ranks and full chains remain intact. |
| Literal unmatched handling stopped useful recommendations | Lexical hints are returned separately from selections. Agents also search alternate local wording and distinguish equivalence from substitution. |
| Review appeared in a narrow viewport | Foreground full-tab review, remove accidental emulation, and resize without reloading or losing edits. |
| Repeated browser-specific rules contradicted fallback behavior | Consolidated discovery/sign-in rules and a source-linked connection matrix replace obsolete branches rather than leaving commented-out instructions. |

Unmatched JSON results may include `suggestions`, each with `requires_confirmation: true`, matching text, default quantity, and the complete ranked chain. This is bounded lexical overlap, not semantic matching: it can miss synonyms or find irrelevant neighbours. Suggestions never populate `selections`, change quantities, update aliases, or authorize substitutions. The agent still checks the user's original constraints. Invalid/unrepresentable quantities produce no suggestions.

Local regression tests cover pre-update red apples (green suggestion only), current red apples (Royal Gala only), rank-2 cheddar discovery, hand-soap wording, specific cheese restrictions, preserved generic/basket behavior, malformed restrictions, and text/JSON output. No live cart mutation is needed for these instruction and matching fixes; browser compatibility remains subject to the evidence in [the connection guide](browser-connections.md).

## Session reliability review 2026-09-09

This is a session analysis, not a controlled model benchmark. The household reports Terra for the cart run; assistant messages named different models without consistent runtime evidence. Do not use those names or the two historical Desktop successes to certify a model across harnesses.

| Observed failure | Cause or evidence limit | Change |
|---|---|---|
| Feta was left for the human despite an existing Kolios backup | Supervalu was unresolved; the old incomplete-page branch stopped the concept, while only the late-delivery branch clearly advanced ranks. The dry-run proposal dropped all backups. | One cross-model candidate table, complete ranked chains in tool output, and a no-unchecked-safe-backups handoff gate. |
| Unrelated out-of-stock text affected availability reasoning | Page-wide text included a mini-cart wine row. The earlier session did not establish Supervalu was actually out of stock. | Exact product-region evidence; distinguish incomplete from unavailable; no stock claims from global text. |
| Repeated order-navigation attempts | The old tab's unchanged URL was treated as failure even though an order-detail tab had opened. | Inspect destination tabs before retrying; one bounded retry after fresh state. |
| User approval was not recovered safely | The agent observed an empty payload, then clicked Approve itself. The transcript does not prove the user's edits were recovered. | Human-only approval rule, element-property/DOM-text recovery, and identical JSON mirrored on both surfaces. This is not durable storage across reloads. |
| Catalog identity claims were stronger than the browser proof | Item-only product pages and the first parsed SKU were used without opening each exact canonical URL. | Item-only navigation is discovery; confirm the selected variant at its exact item/SKU URL before insertion. |
| Human friction and misleading handoff | Extra generic-cleaner question, oversized logs, and a promise of a cart tab that had been repurposed. | Proceed with known items, separate brand mismatch from ambiguity, compact final status, and verify the final foreground tab. |

Do not “fix” a missed fallback by automatically promoting it in the catalog. Preference changes and brand-to-generic aliases need explicit review. Existing household choices are not reinterpreted during instruction maintenance.

Verification has two layers: local tests prove candidate preservation and input handling; a visible **synthetic** review page proves approval/exclusion/quantity behavior without touching a shopping account. Neither proves an arbitrary model will follow the operating rules. Model qualification must separately exercise unavailable rank 1, incomplete rank 1 with a clean baseline, uncertain Add before substitution, mini-cart stock contamination, new-tab navigation, and approval-read failure.

For review UI changes, render disposable sample data, edit a quantity and aliases, exclude one candidate, and exercise Approve only on that synthetic fixture. Verify the live value and DOM text are identical JSON, included choices survive, excluded entries remain excluded, and both surfaces are empty before approval. Never use a real household approval page as this test.

Verification for this change: catalog/CLI, renderer and loopback-server behavioral checks passed; a JSON dry run matched all ten photographed grocery terms and retained the feta/avocado backup chains. A disposable review page was exercised in visible OMP Chrome relay: quantity 2 → 3, special-character aliases preserved without HTML execution, one excluded candidate, and identical live-value/DOM-text approval JSON. The fixture tab, server and HTML were removed. No new Lazada cart run or cross-model qualification was performed; approval recovery across a reload is still not provided.

## Contribution boundaries

Good contributions include:

- Reproducible fixes for the RedMart workflow.
- Catalog validation and review-flow improvements.
- Clearer family onboarding, privacy, and recovery instructions.
- Retailer collaborations led by someone who actively uses that retailer.

Do not submit addresses, payment details, cookies, order numbers, or unsanitized screenshots. Do not add automatic checkout, delivery-slot confirmation, payment, or purchase behavior.

Before opening a pull request:

```bash
npm test
npm run validate
npm run dry-run -- --file examples/grocery-list.txt
```

Describe the user-visible behavior, verification performed, and relevant retailer/browser assumptions. See the root [CONTRIBUTING.md](../CONTRIBUTING.md) for the concise contribution policy.

## Collaborating on another retailer

FairPrice, Sheng Siong, and other Singapore retailers are possible collaborations, not promised integrations. A new workflow needs an active household user who can:

- Explain why and how their household uses the retailer.
- Provide access through their own logged-in browser session.
- Join several focused working sessions.
- Validate product matching, availability, quantities, cart behavior, and safety boundaries.
- Help re-test future breakage when practical.

Use the retailer collaboration issue template or include:

```text
Retailer and shopping channel:
Why my household uses it:
Operating system and ChatGPT desktop app version:
Browser surface (built-in, Chrome fallback, or other):
Direct desktop or Remote:
Typical repeat-order workflow and list format:
I can join several two-hour working sessions: yes/no
I can validate matching, availability, quantities, cart behavior, and safety: yes/no
```

Begin with a retailer-specific adapter or documented workflow. Extract shared abstractions only after a second real implementation demonstrates what is common.

## Tester and launch materials

- [Tester guide and questionnaire](tester-guide.md)
- [Demo recording script](demo-script.md)
- [LinkedIn build-story draft](linkedin-draft.md)
- [Applied-AI case study](case-study.md)
- [Model and harness benchmark plan](model-benchmark-plan.md) — tested Terra routine-cart recommendation, open validation boundaries, and model-selection guidance
- [Terra Medium cart-fill benchmark notes](model-benchmark-results-2026-08-14.md) — two supervised ChatGPT Desktop sessions, 2/2 verified carts and zero observed judgment errors
- [Claude Desktop setup guide](claude-desktop-setup.md) — untested proposal for running the workflow with Claude's Cowork mode; records what needs validation before it can be recommended
- [OMP browser setup guide](omp-setup.md) — relay/CDP surface selection, security boundaries, Puppeteer-style element handling, and the recorded reversible Browser Relay smoke test
- [OMP model qualification test](omp-model-qualification.md) — staged protocol for deciding which model is cheap enough and safe enough to run the OMP relay workflow

## License and independence

The code is available under the [MIT License](../LICENSE). The project is independent and is not affiliated with, endorsed by, or sponsored by RedMart, Lazada, Amazon, FairPrice, or Sheng Siong. Product names and trademarks belong to their respective owners.

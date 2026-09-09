# Developer and contributor guide

This document contains the technical and open-source details intentionally kept out of the family-facing README.

## Project status

RedMart/Lazada Singapore is the maintained reference workflow. ChatGPT Desktop's visible built-in browser has two historical supervised Terra/Medium cart runs with no observed judgment errors. That limited evidence does not cover catalog seeding, OMP, Claude Desktop, or every failure branch. OMP Browser Relay has a reversible three-product smoke test and the later household failure report below; loopback CDP remains live-test pending. Model choice remains user-controlled, and alternative channels do not relax identity, visibility, approval, privacy, or checkout boundaries.

The project is currently being hardened for a small tester cohort and will then move to best-effort maintenance. There is no response-time, retailer, browser, operating-system, or agent compatibility guarantee.

## Development setup

Requirements:

- Node.js 20 or newer.
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
- `tools/catalog.mjs` — catalog loading, validation, exact alias matching, and basket expansion.
- `tools/dry-run.mjs` — credential-free proposed-cart diagnostic.
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

Every `selection.candidates` array now retains **all** approved products in ascending rank order, with exact catalog item/SKU IDs and canonical URLs. The existing `product`, `pack_size`, and `canonical_url` selection fields describe only the initial preferred proposal. Neither matching nor a dry run checks live availability. `node tools/dry-run.mjs --json "feta cheese"` exposes the complete result without human-table output; use it to initialize an agent manifest, not as proof of a filled cart.

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

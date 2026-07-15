# Developer and contributor guide

This document contains the technical and open-source details intentionally kept out of the family-facing README.

## Project status

RedMart/Lazada Singapore is the maintained reference workflow. The easiest and tested path is Codex in the ChatGPT desktop app using its own signed-in built-in browser on Mac or Windows. Direct use and Remote control of a Windows host have both been exercised. Chrome and its control extension remain optional fallbacks for existing Chrome profiles or other agents, but require more setup and are not the primary onboarding path.

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

The dry run is a developer and diagnostic tool. Normal household users should work through Codex in the ChatGPT desktop app and do not need to run it themselves.

## Repository map

- `grocery-catalog.yaml` — household aliases, quantities, and ranked canonical products.
- `AGENTS.md` — browser-operating, seeding, verification, and safety rules.
- `tools/catalog.mjs` — catalog loading, validation, and exact alias matching.
- `tools/dry-run.mjs` — credential-free proposed-cart diagnostic.
- `tools/validate-catalog.mjs` — catalog integrity checks.
- `tools/render-catalog-review.mjs` — renderer for the shared catalog seeding and incremental-update approval page.
- `tools/serve-catalog-review.mjs` — loopback-only server that makes the generated approval page available to the built-in browser.
- `templates/redmart-catalog-review-template.html` — reusable local approval UI.
- `tests/` — catalog, renderer, and template contract tests.
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

Live RedMart behavior cannot be tested in CI because it depends on a household's logged-in browser. Perform a careful built-in-browser smoke test before meaningful releases or after credible breakage reports. Record whether the task ran directly on the desktop host or through Remote.

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

## License and independence

The code is available under the [MIT License](../LICENSE). The project is independent and is not affiliated with, endorsed by, or sponsored by RedMart, Lazada, Amazon, FairPrice, or Sheng Siong. Product names and trademarks belong to their respective owners.

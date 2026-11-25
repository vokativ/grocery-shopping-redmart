# Using FairPrice with this project (fork guide)

For someone who shops at NTUC FairPrice online and wants to try this workflow on their own computer, then maybe contribute what they learn. Read this first; it tells you what exists, what does not, and where to look. For a one-page "what do I click and how do I know it worked", see the [FairPrice cheat sheet](cheat-sheet.md).

## 1. Status: experimental, not a finished FairPrice helper

| Piece | State |
|---|---|
| RedMart workflow (`AGENTS.md`, `tools/`, `grocery-catalog.yaml`) | Maintained and tested by the maintainer. `grocery-catalog.yaml` is the maintainer's personal catalog and is protected; do not edit it in a fork. |
| [cheat-sheet.md](cheat-sheet.md) | One page: what to click on FairPrice pages, the plus/minus stepper, and how to confirm a change worked. |
| [site-structure.md](site-structure.md) | Observed facts about `www.fairprice.com.sg`: product identity (article id), cart API, stepper behaviour, checkout hazards. One live session, 2026-11-17. |
| [cart-rules.md](cart-rules.md) | A complete **design** for a FairPrice cart procedure, mirroring `AGENTS.md`. Marked **INACTIVE** for the maintainer's household (2026-11-19). In a fork it applies once you select a FairPrice catalog and explicitly confirm, as the [platform and catalog gate](../../AGENTS.md#platform-and-catalog-gate) describes. Parts marked *(untested)* were never exercised. |
| [catalog-mapping.md](catalog-mapping.md), [price-comparison-2026-11-17.md](price-comparison-2026-11-17.md), [private-labels.md](private-labels.md) | Research comparing the maintainer's RedMart catalog with FairPrice equivalents. Prices are a dated snapshot. |
| `experiments/fairprice/` | Scripts that fetch FairPrice prices and generate `backup-catalog.yaml` (ranked FairPrice substitutes for the maintainer's catalog items). It is the maintainer's generated reference and a protected path; no shopping tool reads it. |
| FairPrice browser tooling | **Does not exist.** `tools/cdp-cart.mjs` is Lazada/RedMart-only. A FairPrice run uses your agent's own browser control (clicks, reads) plus the rules in `cart-rules.md`, reached through [`procedures/fairprice.md`](../../procedures/fairprice.md). |
| FairPrice catalog for *your* household | **Schema, validator and example exist** (`store.platform: fairprice`, products by `article_id`; see `examples/fairprice.catalog.yaml`). **No tooling builds it** from your order history: you or your agent fill it in. |

Bottom line: you get verified site knowledge, a careful design, and a catalog format your agent can validate, not a tested one-command FairPrice cart filler. That is the opening for a contribution.

## 2. Fork and get started

1. **Clone or duplicate** the repository into your own space. A GitHub fork of a public repository cannot be made private; if privacy matters (your catalog describes your household's habits), clone it and push to a new **private** repository instead. Never push household data to a public fork.
2. Install Node 22+ if you will use `tools/cdp-cart.mjs` (it needs Node 22+; the rest of the tools need Node 20+, as in `AGENTS.md`), then run `npm install`. `npm test` and `npm run validate` are only needed before contributing.
3. Read, in order: [README.md](../../README.md) (especially [Fork it: platforms and catalogs](../../README.md#fork-it-platforms-and-catalogs)), [AGENTS.md](../../AGENTS.md) (start with its [platform and catalog gate](../../AGENTS.md#platform-and-catalog-gate)), [catalogs/README.md](../../catalogs/README.md), [browser connection modes](../browser-connections.md#connection-modes-at-a-glance), then [site-structure.md](site-structure.md) and [cart-rules.md](cart-rules.md).
4. **Create and select your FairPrice catalog.** Never edit the maintainer's `grocery-catalog.yaml`; your catalog is your own file.

   ```bash
   cp examples/fairprice.catalog.yaml grocery-catalog.local.yaml    # or catalogs/fairprice/<handle>.yaml to share it
   node tools/validate-catalog.mjs --catalog grocery-catalog.local.yaml
   node tools/catalogs.mjs select grocery-catalog.local.yaml --acknowledge-experimental
   ```

   - Set `store.store_id` to **your own** store id; the placeholder `"<YOUR_STORE_ID>"` means not configured. Never commit it, and never use `165` (the maintainer's). The [cheat sheet](cheat-sheet.md) shows the serviceable-area lookup. Keep `grocery-catalog.local.yaml` (git-ignored) if you do not want it shared.
   - Build `items[].preferred_products[]` from your FairPrice order history. Products are identified by **article id** (`article_id`, the `clientItemId`), digits only and unique per catalog; `slug`, `pack_size`, `observed_price_sgd` and `marketplace` are optional or informational. Use the review-page idea in [AGENTS.md's Catalog Changes Contract](../../AGENTS.md#catalog-changes-contract) for approval, and never copy the maintainer's products as yours.
   - `--acknowledge-experimental` records that you know FairPrice support is experimental; the selection is stored in the git-ignored `.grocery-selection.local.json`. Use `node tools/catalogs.mjs list` to see what the tools found and `node tools/catalogs.mjs current` to see what is active.
   - Test matching without a browser: `node tools/dry-run.mjs --catalog grocery-catalog.local.yaml "2 eggs, milk"`.

5. **Activate FairPrice in the conversation.** The gate makes the agent check the selected catalog's platform, tell you FairPrice is experimental and untested, and ask for your explicit confirmation before it follows [`procedures/fairprice.md`](../../procedures/fairprice.md) (which sends it to the cart rules). You do not need to edit `AGENTS.md`. Paste this:

   ```text
   I shop at FairPrice. Follow the platform and catalog gate in AGENTS.md: use my selected FairPrice catalog, tell me what is experimental, and ask me to confirm before starting. Then follow procedures/fairprice.md (cheat-sheet, site-structure and cart-rules). Use my already-signed-in Chrome profile on 127.0.0.1:9222 (or whichever browser mode I choose). One product at a time, at least 2 seconds apart, real clicks only. Stop before choosing a delivery slot, entering payment, or pressing Checkout/Continue.
   ```

   If the agent proposes another platform's catalog, say `switch catalog`. In your fork you may change the `cart-rules.md` status banner to your own status (for example "experimental, owner: <you>"); the safety boundary (below) stays unchanged.

   **First-run checklist** (you do these, not the agent):
   - Sign in yourself in the visible browser.
   - Confirm it is not a guest cart: a postal-code popup means you are a guest.
   - Confirm the delivery address shown is yours.
   - Use your own store id, not `165` (the maintainer's).
   - Stop and clear any OTP or CAPTCHA yourself.

## 3. Pick a browser connection

FairPrice does not need a different browser than RedMart; it needs **a visible, signed-in browser the agent can control**. The modes are explained in [browser-connections.md](../browser-connections.md#connection-modes-at-a-glance). Short version:

| If you have | Use |
|---|---|
| An agent app with a built-in browser (e.g. ChatGPT desktop) | Its built-in browser; sign in to FairPrice inside it |
| An agent with a relay/extension for your normal Chrome (OMP Browser Relay, Claude in Chrome, Playwright MCP extension) | That, on your already-signed-in Chrome profile |
| A terminal agent with no browser (Codex CLI, Claude Code without an extension) | A **dedicated Chrome profile with debugging on `127.0.0.1`**; copy-paste recipe in [browser-connections.md](../browser-connections.md#recipe-dedicated-chrome-profile-with-loopback-debugging-mode-3). This is the maintainer's own setup. For FairPrice check the endpoint with `curl http://127.0.0.1:9222/json/list`; `node tools/cdp-cart.mjs tabs` lists Lazada tabs only |
| Nothing above works | OS accessibility, then screenshot-based computer use (slow; verify every change by reading the cart) |

Use Google Chrome for relay and debugging modes. Firefox and Safari only work through accessibility or computer use unless your connector documents them.

If you are not comfortable with any of this, give your agent the prompt in [If you are not familiar with this](../browser-connections.md#if-you-are-not-familiar-with-this) and let it tell you which option your machine supports and what to click.

## 4. Safety boundary (do not remove in a fork)

These hold regardless of model, browser mode, or retailer. They are the reason the project is safe to share:

- Never choose a delivery slot, enter payment, press Checkout/Continue, use Apple/Google Pay, or place an order. The agent stops with a ready cart; you finish.
- Never type your password or OTP into chat. Sign in yourself in the visible browser, and stop for CAPTCHA or challenges.
- One product at a time, human pace, real clicks on the visible control; no unattended loops over the whole list. FairPrice has a 500 ms client debounce (code; only the ~150 ms merge was observed live) and silent no-op cases; see `cart-rules.md`.
- Do not open `/checkout` for edits; its steppers are live. `robots.txt` disallows crawlers on `/cart`, `/checkout`, `/search`, `/login`; use your own signed-in browser at human pace, not scripted crawling of those paths.
- Keep any debugging port on loopback. Do not publish cookies, order numbers, addresses, or unredacted screenshots.

## 5. What is worth contributing

Good first contributions, in rough order of value:

1. **Run the untested branches** listed in `site-structure.md` §9 and `cart-rules.md` (liquor hours, bulk popup, multi-seller deliveries, Empty cart behaviour with a *test* cart, unavailable-for-delivery banners) and report what you observed, with dates and a restored baseline.
2. **Qualify the cart rules end to end** on a real small list: record the agent, model, browser mode, what was confirmed, and every deviation.
3. **A FairPrice cart helper** analogous to `tools/cdp-cart.mjs` (scoped main-control reads, physical clicks, condition waits, Enter-commit for typed quantities, `GET $API/cart` confirmation, challenge detection). Keep it separate from the RedMart tool.
4. **Tooling around FairPrice catalogs**: building one from your order history and a FairPrice price refresh. Schema and validation already exist; extend `tools/platforms/fairprice.mjs` rather than the RedMart module, and keep the RedMart output unchanged.
5. **Corrections** when FairPrice changes its site: update `site-structure.md` with the date and what changed. The API paths are undocumented and may move.
6. **Your own household's findings**, such as multi-store delivery behaviour, minimum order thresholds, or how marketplace items change slots.

Before opening a pull request, follow [CONTRIBUTING.md](../../CONTRIBUTING.md): `npm test`, `npm run validate`, no personal data, and no automatic checkout, slot confirmation, or payment. Mark observed behaviour, code reading, and guesses differently, as `site-structure.md` does. Larger work starts from the retailer collaboration issue template so you and the maintainer can agree scope first. Maintenance is best effort; a fork is yours to run as you like.

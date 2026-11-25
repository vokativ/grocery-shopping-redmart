# FairPrice Procedure (EXPERIMENTAL)

> **Status: EXPERIMENTAL, untested end to end.** Nothing in this repository has filled a FairPrice cart start to finish. There is no FairPrice browser tooling: do not run `tools/cdp-cart.mjs` (Lazada/RedMart only) or `tools/dry-run.mjs` against a FairPrice catalog unless this file or the user says so. Prices and page behaviour come from a single dated observation session.

You are here because the Platform And Catalog Gate in [AGENTS.md](../AGENTS.md#platform-and-catalog-gate) found a FairPrice catalog. Do not read the RedMart procedure in `AGENTS.md` beyond the gate and the sections linked below; its Lazada-specific steps do not apply.

## What a run needs

- A selected FairPrice catalog (`node tools/catalogs.mjs current` shows `fairprice`). `examples/fairprice.catalog.yaml` is a demo, not a household catalog.
- A signed-in, visible browser the user can interrupt, connected as described in [docs/browser-connections.md](../docs/browser-connections.md).
- The user's own FairPrice store id (`store.store_id` in the catalog). The placeholder `<YOUR_STORE_ID>` means not configured: ask the user; never invent one or record it in a shared file.

## Confirmation requirement

Before any browser action, tell the user that FairPrice support is experimental and untested, and get an explicit "yes, proceed with FairPrice". Selecting the catalog and confirming together are the reactivation of the FairPrice rules; the confirmation is recorded with `node tools/catalogs.mjs select <path> --acknowledge-experimental`. If `node tools/catalogs.mjs current` exits 3, you do not have it yet.

## Reading list, in order

1. [docs/fairprice/cheat-sheet.md](../docs/fairprice/cheat-sheet.md): what to click and how to confirm a change worked.
2. [docs/fairprice/site-structure.md](../docs/fairprice/site-structure.md): product identity (article id), cart behaviour, checkout hazards.
3. [docs/fairprice/cart-rules.md](../docs/fairprice/cart-rules.md): the actual cart procedure. Follow it; parts marked *(untested)* need extra care.

## What still applies from AGENTS.md

- [Browser Surface, Sign-In, And Discovery](../AGENTS.md#browser-surface-sign-in-and-discovery): headed browser, foreground tab, discovery order, challenges (substitute FairPrice for Lazada; use local credentials only as that section allows).
- [Browser Pace And Silent No-Ops](../AGENTS.md#browser-pace-and-silent-no-ops): one product at a time, about 2 seconds between cart-changing clicks, real clicks only, never DOM-scripted clicks, retry once, then hand off.
- Safety boundary and the one-product-at-a-time flow in [Everyday Flow](../AGENTS.md#everyday-flow--all-models) (steps 1-8), with `cart-rules.md` supplying the FairPrice specifics.
- [Human Handoff Order](../AGENTS.md#human-handoff-order): short result first, remaining human actions last.
- State the active catalog (path, platform, source) in every proposed cart header.

## Hard boundary

Never choose a delivery slot, enter payment, press Checkout/Continue, or confirm a purchase. Stop at the cart and hand the remaining steps to the human.

# Agent Instructions

Use these instructions when setting up this repository for a household or filling a RedMart/Lazada cart from this repository. Less common branches live in [docs/cart-procedures.md](docs/cart-procedures.md) and are equally binding when reached.

If your file-reading tool fails, read this file and any linked doc with the shell (`cat AGENTS.md`). Do not start browser work without having read this whole file.

## Everyday Flow — All Models

These rules apply regardless of model, reasoning level, or harness. The harness changes the control channel, not the shopping decisions. Catalog work uses the separate approval flow below.

1. **Transcribe.** Record every grocery line and explicit quantity. Keep the original wording beside any confident spelling normalization.
2. **Match.** Run `node tools/dry-run.mjs --json "<comma-separated list>"`. Read each selection's complete `candidates` chain (and `eligible_candidates` when present), not only rank 1. Do the **Local Recommendation Pass** for misses and material differences.
3. **Propose.** Show a compact proposed cart in chat (item, product, target quantity, basket allocations) before any browser action. An explicit cart-fill request already authorizes confident matches and their approved ranked backups, so proceed without a second approval prompt. Unmatched entries do not block the rest.
4. **Baseline.** Read the current cart once and record exact item/SKU/quantity rows. Keep one manifest entry per requested concept or basket member: candidate chain, candidate observations, selected SKU, target quantity, and mutation state (`not-attempted`, `confirmed`, `uncertain`). A catalog match and an available SKU are different facts.
5. **Select and add, one product at a time.** Apply **Product Choice And Availability**, then the **Product-Page Quantity Workflow**, at the pace in **Browser Pace And Silent No-Ops**. When a candidate is unavailable or too late, check the next eligible rank automatically.
6. **Audit.** Reconcile exact cart rows and relevant promotion groups (**Cart Audit**). Correct only proven mismatches.
7. **Stop at the safety boundary.** Never choose delivery slots, enter payment, check out, or confirm a purchase.
8. **Hand off.** Follow **Human Handoff Order**: short result, remaining human actions last. Do not dump tool logs, internal reasoning, account details, or the manifest into chat. Keep only useful fallback notes, such as “Used Kolios feta ×2; first choice unavailable.”

Never report a concept as unavailable while an eligible approved backup remains unchecked, unless a named safety blocker prevents continuing. Never add an unresolved SKU merely because it is missing from the cart. Never substitute after an uncertain mutation without reconciling it first.

## Model And Harness Reporting

Before browser work, state once the harness and the model/reasoning setting that its UI or runtime metadata actually exposes; write `unavailable` for anything not exposed. Never infer a model name from this file, a previous message, or task length. Model selection is user-controlled: recommend, never claim to switch.

- **ChatGPT Desktop:** read the control beneath the Codex composer. **5.6 Terra / Medium** has two historical supervised everyday-cart runs with no observed judgment errors; that is limited evidence, not a guarantee.
- **Claude Code / Claude App, OMP, T3 Code, Codex CLI/IDE, others:** report the runtime identifier. A missing ChatGPT composer is not a blocker. Evidence from one model or harness does not transfer to another.

## Browser Surface, Sign-In, And Discovery

All browser work (cart inspection, availability checks, mutations, catalog discovery) must run in a real, headed browser window the user can see and interrupt. Never shop in a hidden, background-only, or headless surface. The task tab must be the **foreground tab** whenever you click in it. If the user starts interacting with the browser, pause, let them finish, and take a fresh settled read before resuming. The host must stay awake, online, and unlocked.

### Discovery hierarchy

Use this once, then keep one browser/profile and one operator. A browser explicitly selected by the user wins. Session authorization persists across turns and compaction.

1. **Integrated surface:** try the harness's native browser tools first (in T3 Code: `preview_status`, then `preview_open`). Agent login does not imply Lazada login.
2. **Existing sessions:** if unavailable or signed out, look for running browsers and an existing Lazada task tab on the host. Read only application/session identifiers and relevant debugging flags/listeners; never dump full command lines, unrelated tabs, history, cookies, or profile data.
3. **Existing control channels:** reuse an already working connection to the intended visible session: harness relay/extension first, otherwise a deliberately enabled **loopback** CDP endpoint. Do not guess ports, scan networks, restart browsers, enable debugging, install extensions, or copy profiles as an implicit fallback.
4. **OS structured controls** (macOS Accessibility, Windows UI Automation, Linux AT-SPI), then **screenshot-based computer use**, only when the above cannot reach the required control.

Before navigating, announce the chosen browser/profile, control channel, and task tabs, and confirm the channel actually owns the intended tab. If no Lazada tab is open, open `https://cart.lazada.sg/cart` in the selected profile yourself. Leave unrelated tabs unchanged. When no channel works, offer the smallest setup choices (signed-in relay/extension, OS accessibility, or a dedicated loopback-debugging profile) and never ask the user to enable remote debugging on their default Chrome data directory. See [Browser connections](docs/browser-connections.md).

Within the selected session, prefer scoped semantic/DOM reads, then accessibility, then a focused screenshot. Return only relevant names, values, IDs, and readiness signals.

Extension permission prompts: show them and have the user verify the hostname (Lazada/RedMart and the loopback catalog-review URL are expected). Never disable a firewall or expose a public port; CDP and the review server bind only to loopback.

### Sign-in and challenges

1. Read the task tab twice after settling; classify it as signed out only on an explicit blocking login gate.
2. If signed out, check other existing household sessions before reauthenticating.
3. Otherwise use local `.env` credentials (`USERNAME`/`PASSWORD` or `LAZADA_USERNAME`/`LAZADA_PASSWORD`) to fill only the visible login form, without printing secrets.
4. For OTP, CAPTCHA, slider, passkey, or unusual-traffic challenges, stop and let the user complete it in the browser. Never ask for secrets or challenge answers in chat.
5. Afterwards, reacquire the exact tab and verify signed-in state.

### Subagents

If the harness cannot give a subagent a visible browser, the subagent must not operate the browser; the root agent becomes the sole visible operator. See [subagent coordination](docs/cart-procedures.md#visible-browser-coordination-with-subagents).

## Browser Pace And Silent No-Ops

Lazada runs client-side security scripts. Treat the site like a person would.

- **One product at a time.** Navigate, read, decide, change quantity, confirm, then move on. Never write or run an unattended batch script that loops over the whole list making cart changes.
- **Human pace.** At least ~2 seconds between cart-changing clicks; wait for the page to settle rather than racing it.
- **Real clicks only.** Use the harness's native click or a physical mouse event on the exact visible control. Never mutate the cart with DOM `element.click()`, `dispatchEvent`, or `page.evaluate(() => …click())`. They can change local UI without persisting the server cart.
- **Silent no-op rule.** If a click on a correct, enabled, visible control produces no change: reread, retry **once** with a fresh control. If it is still a no-op, **stop all cart changes**, wait about a minute, reload the page, and try **once** more. If that also fails, stop mutating and hand the remaining items to the human as “could not add, site did not respond”. Do not click the same control repeatedly or switch to another mechanism to force it.
- **Timeouts are unknown outcomes.** Reacquire the settled exact state before deciding anything; a timed-out action may have succeeded.
- **Do not guess at bot detection.** Console errors from Lazada's security scripts appear on every page load and are not evidence. Only report a challenge or block when one is visible (slider, CAPTCHA, “unusual traffic” page) or a cart request visibly fails.

## Loopback CDP: Use The Helper

When the control channel is raw loopback CDP (no harness browser tools), do not hand-write CDP clients for cart work. Use `tools/cdp-cart.mjs` (Node 22+), which scopes to the RedMart main-product module, brings the tab to the foreground, uses physical mouse events, does condition waits with double settled reads, and enforces the pacing and no-op rules above:

```bash
node tools/cdp-cart.mjs tabs                                   # Lazada tabs on 127.0.0.1:9222
node tools/cdp-cart.mjs open https://cart.lazada.sg/cart       # only if no task tab exists
node tools/cdp-cart.mjs cart --tab <cartTabId>                 # baseline / audit: ordinary rows
node tools/cdp-cart.mjs goto --tab <productTabId> <canonical_url>   # identity, availability, main control
node tools/cdp-cart.mjs set-qty --tab <productTabId> --expect i<item>-s<sku> --target <n>
```

Every command prints JSON. `goto`/`product` report `item_id`/`sku_id`, `heading`, `earliest_availability.within_two_days`, `control` (`add`, `stepper` with value, or `missing`), and `readiness`. `set-qty` exits `0` with `status: confirmed`, or nonzero with `status` `identity`, `not-ready`, `unavailable`, `uncertain`, `no-op`, or `blocked`; follow the matching row in the decision table. On `no-op` or `blocked`, obey its message; do not work around the helper. Use one reused product tab for navigation and keep the cart tab for audit and handoff. If the helper cannot read a page that is visibly fine, take a screenshot and report the gap rather than improvising mutations.

## Catalog Changes Contract

Catalog modifications (initial seeding, order-history updates, or single additions) must keep the catalog valid and respect household preferences. Full procedure: [Catalog maintenance](docs/developer-guide.md#catalog-maintenance).

1. **Human-only approval:** substantial changes use `templates/redmart-catalog-review-template.html`, rendered by `tools/render-catalog-review.mjs` and served on loopback by `tools/serve-catalog-review.mjs`. Never click `Approve`, invoke its handler, or synthesize an approved payload. Read `#catalog-review-approved-payload` only after the human approves in the browser.
2. **Exact identity:** resolve every candidate to an `item_id`/`sku_id` pair by opening `https://www.lazada.sg/products/i<item_id>-s<sku_id>.html` and verifying the settled title, pack size, and variant. Never insert from overview cards, JavaScript links, or item-only pages. Check for duplicates and record title drift.
3. **Aliases:** natural household terms, globally unique. Use `alias_product_ranks` to restrict specific aliases (e.g. `red apples: [2]`). `household_baskets` are for intentional multi-item mixes (2+ distinct existing members, no nesting).
4. **Validate:** `npm run validate` must pass; check new aliases with `node tools/dry-run.mjs --json "<alias>"`.
5. **Single item left open in the browser:** scrape title, IDs, canonical URL, pack size, and price; insert it; validate.
6. **Boundaries:** never order, pick delivery slots, or pay during catalog work. Alcohol can be catalogued normally.

## Cart Request Interpretation

- “Put these in my cart” authorizes adding confidently matched items after showing the proposal. Ask only about a genuinely ambiguous product, quantity, or removal choice.
- A related catalog option with a brand/form/colour/flavour/dietary/pack difference needs acceptance before adding. Compatible defaults and ranked backups do not.
- “I'll handle the rest” after unmatched entries were listed means: continue with matched items and list the untouched entries at the bottom of the reply.
- Stop the cart workflow only if the user says they will handle the whole cart, asks you not to proceed, or the browser cannot safely continue.
- Live discovery of new products requires the user's request or acceptance.

### Local Recommendation Pass

An alias match is a lookup, not proof that the SKU satisfies the request. Preserve explicit brand, colour, flavour, form (shredded/sliced), dietary, pack, and quantity requirements.

1. Read the dry-run output, including `suggestions` for unmatched lines (lexical hints, never authorized selections) and related YAML notes/restrictions.
2. If hints are thin, search locally with `rg -ni` across all ranks, e.g. `'cheddar|sliced|shredded'`. No lexical hit does not prove absence.
3. Classify each line: compatible exact match, confident wording equivalent (state it in the proposal), related option with a material difference (offer it), or no catalog option.
4. Offer concrete choices: “The catalog has sliced cheddar (rank 2 under sliced cheese), but no shredded cheddar. Use the slices?” Once accepted in this conversation, do not ask again. One-run acceptance does not change permanent preferences.
5. `alias_product_ranks` produces `eligible_candidates`, which is the availability fallback chain for that alias; excluded ranks are recommendation-only. Generic wording keeps the original ranking.

## Product Choice And Availability

Evaluate each ordinary item and each basket member independently. Only request-compatible ranked backups are pre-approved, with their recorded pack sizes. Keep the requested quantity unless the list specified a weight/count incompatible with a fallback; ask only about that.

Before selecting a SKU, compare the whole candidate chain with the cart baseline. If one compatible candidate is already in the cart, use it. An incompatible baseline row (green apples for “red apples”) does not fulfill the request; preserve it. If several candidates are present, or replacing one would require removal, preserve them and resolve the ambiguity.

Open the first eligible canonical URL. Get two settled reads of exact identity (item/SKU from the final URL plus a matching semantic heading), the page-level `Product Availability` dates, and the exact main add/quantity control. If signals are missing, allow one more gentle wait and read (use a screenshot if extraction is incomplete), then apply the table. Do not poll indefinitely.

| Candidate evidence | Classification and next action |
|---|---|
| Exact identity; main control usable; earliest delivery today, tomorrow, or within two days | Select this SKU; follow the quantity workflow. |
| Exact product explicitly out of stock, discontinued, or disabled with corroborating unavailability | `unavailable`; **open the next ranked SKU**. |
| Earliest delivery more than two days away | `too-late`; **open the next ranked SKU**. |
| Readiness still incomplete after the bounded reads | `incomplete`, not unavailable. Inspect the next candidate read-only. Add a fallback only if no competing candidate for this concept is in the cart and no mutation is outstanding; otherwise leave it `unresolved`. |
| Exact SKU already in cart but product-page control unusable | Use its exact cart-row controls ([fallback](docs/cart-procedures.md#cart-row-quantity-fallback)); do not add a second ranked SKU. |
| An add/change had an uncertain result | Stop mutating this concept; reconcile the exact SKU (including promotions) before retrying or substituting. Other items may continue. |
| Silent no-op after the retry rules in **Browser Pace And Silent No-Ops** | Not stock status. Pause all mutations per that section; if it persists, hand back as “site did not respond”. |
| Changed item/SKU identity, incompatible concept, challenge, or lost visible control | Not stock status. Stop for identity/safety recovery; a challenge or lost surface pauses all browser work. |

Before a fallback mutation, update the manifest's selected SKU and why the earlier one was skipped. If every candidate is unavailable, report `unavailable`; if all are too late, report the delivery constraint; if any remain incomplete or unsafe, report `unresolved` with the reason. Never rebalance an unavailable basket member's packs onto another member.

Availability is read semantically from the right-side product details near `Delivery Options` / `Product Availability` (date chips such as `Today`, `Tomorrow`, or weekday/date). Never infer stock from a full-page text search: recommendations and mini-cart text contain unrelated “Out of stock” and “Add to cart” strings. Pack-size text is corroborating metadata; the final URL's item/SKU pair is the identity ([pack-size details](docs/cart-procedures.md#pack-size-evidence)).

## Product-Page Quantity Workflow

For each available selected SKU:

1. Use only the exact **main product** control. Ignore recommendation, carousel, sponsored, mini-cart, and floating controls, even when they say `Add to Cart` or show a quantity. On RedMart pages the main control lives in `#module_redmart_add_to_cart`.
2. If the main control is `Add to cart`, click it once and wait until it becomes a stepper showing 1.
3. If the page already shows a main stepper, its value is the current cart quantity. Do not click Add again.
4. Move to the target one unit at a time. After each click, wait for the expected value (condition wait, not a fixed sleep), then reread once more to confirm it held.
5. If the value does not appear, the control disappears, or it changes unexpectedly, stop changing that SKU, mark it `uncertain`, and reconcile at the cart audit. Never click blindly again.

On loopback CDP, `tools/cdp-cart.mjs set-qty` performs exactly this procedure.

## Existing Cart Handling

Classify baseline rows as `requested` (matches a list item or a basket member) or `unrequested`. By default add/update requested items and preserve unrequested rows, mentioning them in the reply. Ask a keep/remove question only when removal intent is genuinely ambiguous. If the user asks to start fresh, rebuild, or clean up a bad attempt, remove unrequested rows and report what was removed.

## Cart Audit

1. Expected state = selected target quantities plus unrequested baseline rows, each exact item/SKU counted once. Unselected or exhausted candidates are not expected rows.
2. Load the cart, let it settle, and read twice. The header count is a unit checksum only.
3. Match ordinary rows by exact item/SKU, then title, pack, and quantity. Classify each expected SKU: `normal-row match`, `promotion-group match`, `actual mismatch`, `unresolved`, or `unavailable`.
4. A missing or partial-looking row may be inside a promotion group. Inspect that group's `EDIT` page before calling it missing ([promotion procedure](docs/cart-procedures.md#promotion-groups-during-the-cart-audit)).
5. Correct only proven `actual mismatch` entries with established identity and availability, one change at a time, then reload once and re-audit those entries. Missing-cart evidence alone never authorizes adding a previously incomplete product. If an incomplete candidate is confirmed absent and no mutation is outstanding, return to its next ranked candidate before handoff. Leave matches and unavailable entries alone.
6. Record unexpected extra rows and preserve them.

For reversible quantity tests, follow [test cleanup](docs/cart-procedures.md#test-cleanup-and-baseline-restoration).

## Human Handoff Order

The final message puts what the human must do at the very bottom:

1. **Completed items:** brief summary of what was added or already present.
2. **Cart handoff:** confirm the cart tab is open only after actually foregrounding it. Offer once to close agent-opened tabs that are still open.
3. **Technical details (optional, collapsed):** never let them push the action items out of view.
4. **Action Required (always last):** every requested item that was unmatched, unavailable, uncertain, or left for the human. Distinguish “not catalogued”, “all approved options unavailable”, “delivery too late”, “site did not respond”, and “could not verify”; say which product was tried and whether backups were exhausted or blocked. For an uncertain mutation say “cart quantity not confirmed”, not “not added”. End with the remaining checkout steps (delivery slot, payment, purchase confirmation).

# FairPrice cart rules (INACTIVE)

> **STATUS: INACTIVE — reference only. The household decided on 2026-11-19 not to use FairPrice for cart filling. Agents must not follow these rules or operate a FairPrice cart unless the user explicitly reactivates FairPrice in the conversation.**

Everything below is a design for a possible future FairPrice procedure. It mirrors [AGENTS.md](../../AGENTS.md) (the RedMart rules) and is built only on what [site-structure.md](site-structure.md) observed (live relay session and reversible tests, 2026-11-17). Rules that rest on code reading, or on a branch that was never exercised, are marked **(untested)**. `$API` = `https://website-api.omni.fairprice.com.sg/api`. Section refs "§N" are to site-structure.md.

If reactivated, the RedMart rules still apply wherever this page is silent (transcribe, propose before acting, no unattended batch loops, no secrets in chat, no checkout). On any conflict, the stricter rule wins.

## Everyday flow

1. **Transcribe** every line and explicit quantity, as in AGENTS.md.
2. **Match** with `node tools/dry-run.mjs --json "<list>"`. The RedMart catalog drives intent; FairPrice candidates come from the backup catalog (see Candidate source).
3. **Propose** a compact cart in chat (item, FairPrice product, article id, quantity) before any browser action. Flag marketplace candidates and promo-dependent prices.
4. **Baseline.** Read `GET $API/cart?isCheckerEnabled=true&isOutOfStockEnabled=true&isSellerCheckerEnabled=true&orderType=DELIVERY` (§5): record `clientItemId`, `q` (string; convert), `isChecked`, `isMKP` per row, plus the cart's "Earliest slot". Keep a manifest entry per concept with `not-attempted` / `confirmed` / `uncertain`.
5. **Select and add, one product at a time**, using the sections below.
6. **Audit** (see Cart audit).
7. **Stop at the checkout boundary.**
8. **Hand off** (see Handoff).

## Candidate source

Candidates come only from [experiments/fairprice/backup-catalog.yaml](../../experiments/fairprice/backup-catalog.yaml), a generated reference file (`status: inactive`; regenerate with `experiments/fairprice/fetch-prices.mjs` then `experiments/fairprice/build-backup-catalog.mjs`, see [catalog-mapping.md](catalog-mapping.md) §7). Read it per item:

- `items[]` is keyed by `catalog_item_id` and carries `default_quantity` and `redmart_reference` (`rank`, `title`, `pack_size`) so the FairPrice pick lines up with the RedMart product it replaces.
- `status: substitute` means `fairprice_products[]` is a ranked list (`rank` 1 first); `status: no_substitute` means there is none, and `reasons_excluded[]` says why. Report such an item as "not available on FairPrice", never improvise a candidate.
- Each product is identified by `article_id` (the only identity; see Product choice and availability). `role` / `mapping_role`, `house_brand`, `pack_size`, `packs_per_redmart_pack` and `cost_per_redmart_pack_sgd` say how it substitutes: buy `packs_per_redmart_pack` FairPrice packs per RedMart pack, and round up to whole packs when proposing a cart.
- `observed_price_sgd`, `mrp_sgd`, `promo` and `observed_price_date` are a dated reference, not live prices; the `url` is a hint only (resolve the slug through the API before use). Re-read the price on the product page and in the cart.

[catalog-mapping.md](catalog-mapping.md) is research, not a source: its prices and slugs are a 2026-11-17 snapshot. A candidate whose `notes` or `mapping_role` flag a requirement conflict, or a different-brand/form option, still needs user acceptance, same as AGENTS.md "Cart Request Interpretation". Only request-compatible ranked backups are pre-approved.

## Browser surface, sign-in, and pace

- Same surface rules as AGENTS.md: real, headed browser the user can see; foreground task tab; pause if the user interacts. The household is already signed in on `www.fairprice.com.sg`; a guest cart is not the household's cart (§4a row 20).
- Stop for any login gate, OTP, CAPTCHA, or "unusual traffic" page and let the human clear it. **No bot challenge was seen in ~25 mutations over ~20 min** (§4, §8); that is not proof none exists, so the stop rule stays.
- **One product at a time**, at least ~2 s between cart-changing clicks **and** between products. Never loop a script over the list.
- **Real clicks only** on the exact visible control. Never DOM `click()` / `dispatchEvent`. The click targets are the svg's unlabeled parent `DIV`, so measure coordinates **after scrolling settles** and hit-test with `document.elementFromPoint` that the target is inside the intended `counter-wrapper` (§4, silent no-op cause).
- **Silent no-op rule** as AGENTS.md: reread, retry once with a fresh control; if still no change, stop all cart changes, wait about a minute, reload, retry once; else hand the item back as "site did not respond". A first no-op is a coordinate/hit-test problem until shown otherwise, not a stock or challenge signal.
- **Typing is not committing** (§4a row 1). `fill` alone sends no request and the input looks updated. Press **Enter** after typing, then wait for the stepper and the cart read.
- **500 ms client debounce, shared across products** (§4a rows 2–4, code for 3 and 4). Never click A then B inside 500 ms, and never pair opposite clicks (+1 then −1) inside 500 ms. Rapid clicks ~150 ms apart merged into one request (observed). Click once, condition-wait, reread.
- Timeouts are unknown outcomes: reacquire the settled state. Non-2xx responses revert silently (§4a row 16); reread and treat as a no-op.
- Do not edit repository tools during a shopping run. The browser tooling for FairPrice does not exist (`tools/cdp-cart.mjs` is RedMart-only).

## Product choice and availability

**Identity is the article id** (`clientItemId`, string; §2). Never trust a URL or title alone.

1. **Resolve the slug through the API immediately before use:** `GET $API/product/v2?q=<articleId>&pageType=search&orderType=DELIVERY&storeId=165` (select the row by `clientItemId`; the search sometimes also returns an unrelated marketplace row). Navigate to `https://www.fairprice.com.sg/product/` + `slug`. **Never construct a URL**: a wrong slug returns HTTP 200 soft 404 (title `Error 404 | FairPrice Singapore`, no canonical); a purely numeric slug exists for a few products only.
2. Verify identity after navigation from the page's cart row link slug suffix or `GET $API/cart` `clientItemId`, not the URL alone. Detect a soft 404 by title and missing canonical, never by HTTP status.
3. Evaluate each candidate in rank order:

| Candidate evidence | Classification and action |
|---|---|
| API `stock > 0`, PDP shows an Add button, `storeSpecificData[0].status == "ENABLED"` | Selectable; follow the quantity workflow. |
| `stock == 0`, or PDP shows "Out of stock online" + "Find similar" | `unavailable`; open the next rank. `stockScale: "inStock"` and `has_stock` are **not** in-stock signals (§4a row 9). |
| `status != "ENABLED"` / banner "Unavailable for delivery to …" (code) | Not deliverable; next rank. Do not test by clicking. **(untested)** |
| Marketplace (`clientItemId` prefix `90`, `inventoryType == "MKP"`, "Sold by" panel, or a `metaData["Seller ID"]`) | Eligible only if the catalog marks it so or the user accepted it. Expect a pushed delivery slot (below). |
| Earliest slot after the add is beyond two days | `too-late`; roll back that add (below) and try the next rank. |
| Readiness incomplete after the bounded reads | `incomplete`, not unavailable; inspect the next candidate read-only. |
| Uncertain add result | Stop mutating this concept; reconcile exact quantity first. |
| Stepper loses control, identity changes, challenge | Not stock status; stop and recover. |

4. **No per-product delivery date exists** (§3). Availability and lateness are read at the **cart's "Earliest slot"** (per seller block, e.g. `Tomorrow, 12pm-2pm`):
   - Record the slot **before** each add and re-read it **after** each add.
   - Marketplace items and bulk quantities silently move the **whole delivery** later (observed: dragon fruit pushed Tomorrow → Fri 20 Nov; canola ×31 pushed to Sun 22 Nov, §4a rows 11–12). No warning is shown.
   - A slot beyond **two days** is the equivalent of RedMart "too-late": delete that row (or step back to its previous quantity), confirm the slot returned, then try the next ranked candidate.
   - Keep quantities below `storeBulkOrderThreshold` where known (canola 30). If a "We will need more time to get the following product(s) to you." popup appears, **Cancel** it (code, **untested**).
5. **Liquor hours** (10.30pm–7am) are enforced server-side, not in the client; only an afternoon add was tested. **(untested)** Do not add alcohol outside daytime hours; a refusal there is a block, not a no-op.
6. Never report a concept unavailable while an eligible ranked backup remains unchecked.

## Product-page quantity workflow

1. Use only the **main product** control. Scope: the nearest ancestor of `main [data-testid=brandDetails]` containing a control, excluding anything inside `[data-testid=compact-product]`, `[data-testid=virtual-carousel]`, `[data-testid=productCollection]` (§3). Carousels (Similar Products, Frequently Bought Together, Your Past Purchases, offer carousels) reuse `SvgAddToCart` and can even show a live stepper for the same SKU (§4a row 18). There is no `h1` and no module id; do not port the RedMart selectors.
2. States: `button[data-testid=SvgAddToCart]` "Add to cart" (not in cart); `[data-testid=counter-wrapper]` with `input[aria-label=quantity]` (**value = current cart quantity**), minus `SvgRemoveFromCart`, plus `SvgAddToCart`; or no control + "Out of stock online" (unavailable).
3. If "Add to cart": click once, wait for a stepper showing 1. If a stepper already shows, its value is the current quantity; do not click Add.
4. Reach the target with plus/minus one unit at a time (≥2 s apart), or type the number **and press Enter**. After each change, condition-wait for the expected value, reread once, then compare with `POST $API/cart` → `data.cart.changes[{id, product.clientItemId, oldQ, newQ}]` when the network is visible. `wantQuantity` is **not** the requested quantity; never use it (row 15).
5. **Stock cap:** typing above stock raises the modal "We have revised your order to the maximum quantity allowed. [Okay, got it]", and the plus becomes `StyledDisabledAddCart`. Dismiss the modal, take `newQ` as the granted quantity, record the cap, and do not click a disabled plus (row 5). The client applies no cap to a **first** add (row 6), so always check `newQ`.
6. **Typed `0` + Enter removes** (row 7): the control returns to "Add to cart". Use it only for an intended removal.
7. Dismiss any popup (cap modal, "Changes to your cart" → **Update Cart**, bulk popup) before the next add; carts do not sync while one is open (rows 14, 19).
8. **Never confirm from the toast** ("N product(s) added to cart" is computed from client intent, rows 13, 17) or the stepper alone.
9. If the value does not appear or changes unexpectedly: mark the SKU `uncertain`, stop changing it, reconcile at the audit.

## Confirmation

An add is `confirmed` only when all hold: the stepper shows the target (or a recorded cap), the post-reload `GET $API/cart` has that `clientItemId` with `q` equal to the target, and the "Earliest slot" re-read is within the two-day rule. `changes[].oldQ/newQ` is supporting evidence when visible. Unit checksums (header `<units> Cart`, `Shopping cart N items`) count units, not rows, and prove nothing about contents (§4).

## Existing cart handling

As AGENTS.md: classify baseline rows `requested` / `unrequested`; add or update requested, preserve unrequested and mention them. Remove only when the user asks to start fresh, and then delete **row by row** (below), never with a bulk control.

Row deletion and quantity edits on `/cart` are scoped to `div[data-testid=cartProduct][id=<internal id>]`, matched by the row link slug's article id (`[data-testid=cart-product-detail-link]`). **Delete is immediate, with no confirmation dialog and no undo** (§4): only use it for a proven, intended removal (including slot rollback). Cart-row edits post to `/api/checkout`, not `/api/cart`.

## Cart audit

1. Expected state = target quantities + unrequested baseline rows, each article id once.
2. Reload `/cart`, settle, read twice; prefer `GET $API/cart` (`clientItemId`, `q`, `isChecked`, `isMKP`, `appliedOffers`) over DOM parsing. Note the "Earliest slot" and the "N delivery" banner; marketplace sellers can add deliveries (**untested**: only one in-FairPrice case seen).
3. Match by article id, then title, pack, quantity. Promotions do **not** collapse rows on FairPrice; offers show as `offer-link-<id>` and "Save $x". Bundle/basket offers (`BXATP` N>1, `BANYATP`, `BMIN`) only reprice in the cart (§7); read the row, not the shelf price. Promo reprice behaviour beyond what was observed is **untested** (§9).
4. Correct only proven mismatches, one change at a time, then reload and re-audit them.
5. Record unexpected extra rows; preserve them.
6. **Never toggle checkboxes** (`cart-product-checker-<id>`, `cart-seller-checker`); checked = included in checkout. Read `isChecked` from the API instead.

## Safety boundary

**Never click:**

| Control | Why |
|---|---|
| `[data-testid=empty-cart-button]` "Empty cart" | Clears the whole cart. **(untested)** |
| `cart-seller-bin-icon` | Deletes all of a seller's items. **(untested)** |
| `lpRedemptionToggle_switch` | Redeems Linkpoints against the total. |
| `voucher-section` / `addVoucherCode`, coupon entry | Voucher entry. |
| `linkToCheckout` ("Checkout $…") | Leaves for checkout. |
| `checkout-apple-pay-button`, `checkout-google-pay-button` | Purchase surface, rendered immediately on `/checkout`. |
| `checkout-timeslot-continue-button`, `checkout-payment-continue-button`, any Continue, place order | Checkout flow. **(untested)** |
| `deleteFromCart` outside a recorded, intended removal | Immediate delete. |

**Hard boundary:** never choose a delivery slot, enter or choose payment, press Continue, Apple/Google Pay, or place an order (§6). Quantity steppers are live on `/checkout` too; do not use them there. Do not open `/checkout` for edits. Do not store the delivery postal code or card details in outputs. Respect `robots.txt` (`/cart`, `/checkout`, `/search`, `/login` disallowed for crawlers); use the browser the user is signed in on, at human pace, not scripted crawling of those paths.

## Handoff

Same order as AGENTS.md "Human Handoff Order": short completed summary; foreground the cart tab only after actually doing so; optional collapsed technical notes; **Action Required last**. Distinguish "not catalogued", "all approved options unavailable", "delivery too late (slot pushed beyond two days)", "site did not respond", "cart quantity not confirmed", and "stock-capped (asked N, got M)". Report fallbacks used (e.g. "Used Pasar eggs 30s; first choice out of stock"), marketplace items added, and the final "Earliest slot". End with the human-only steps: delivery slot, payment, purchase confirmation.

## Evidence map

| Rule | Evidence |
|---|---|
| Article-id identity, slug resolution, soft 404 | site-structure §2 |
| Main-control scope, states, no per-product date | §3 |
| Add/change/remove confirmation, silent no-op, unit checksums | §4 |
| Typing, debounce, cap modal, typed 0, OOS, stockScale, marketplace and bulk slot push, toast | §4a rows 1–20 |
| Cart rows, dangerous controls, read API | §5 |
| Checkout hazards and hard boundary | §6 |
| `stock > 0`, offers and promos | §7 |
| Untested: liquor hours, seller bin, Empty cart, checkout flows, bulk popup, multi-seller deliveries | §9 |

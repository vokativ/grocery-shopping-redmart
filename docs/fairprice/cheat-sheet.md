# FairPrice page structure and plus/minus cheat sheet

Status: **research, not a tested tool.** No FairPrice cart helper exists; `tools/cdp-cart.mjs` is Lazada-only (fork-guide §1).
Facts: one household, one store, observed 2026-11-17 (site-structure §1); DOM and API re-checked read-only 2026-11-25 (observed 2026-11-25); JS rules are read from the bundle, not exercised live (code).
Doc build: `946bb0fa…` as of 2026-11-25 (previous `ad741b40…`). FairPrice redeploys; run [Re-check in 5 minutes](#re-check-in-5-minutes) before trusting any row.
Cart rules in [cart-rules.md](cart-rules.md) are **INACTIVE** by default; agents ignore them until you select a FairPrice catalog and confirm in the conversation, as the [platform and catalog gate](../../AGENTS.md#platform-and-catalog-gate) requires (cart-rules banner, fork-guide §2.4–§2.5).
Sources: `site-structure §N` = [site-structure.md](site-structure.md); `cart-rules` = [cart-rules.md](cart-rules.md); `fork-guide §N` = [fork-guide.md](fork-guide.md). `$API` = `https://website-api.omni.fairprice.com.sg/api` (site-structure §1).

## Start here: activate FairPrice (copy-paste prompt)

First create and select your catalog ([fork-guide §2.4](fork-guide.md#2-fork-and-get-started)): copy `examples/fairprice.catalog.yaml` to `grocery-catalog.local.yaml`, set your own store id, validate it with `node tools/validate-catalog.mjs --catalog <path>`, then `node tools/catalogs.mjs select <path> --acknowledge-experimental`. Do not edit `AGENTS.md` or the maintainer's `grocery-catalog.yaml`. Then paste:

```text
I shop at FairPrice. Follow the platform and catalog gate in AGENTS.md: use my selected FairPrice catalog, tell me what is experimental, and ask me to confirm before starting. Then follow procedures/fairprice.md (this cheat-sheet, docs/fairprice/site-structure.md and docs/fairprice/cart-rules.md); do NOT run tools/cdp-cart.mjs, which is Lazada-only.
Use my already signed-in Chrome on www.fairprice.com.sg. Work one product at a time, >=2 s between cart clicks, real mouse clicks only.
Stop with a ready cart. Never choose a delivery slot, enter payment, press Continue/Checkout/Apple Pay/Google Pay, or place an order.
I will sign in myself; never ask me to paste passwords, OTPs, cookies or tokens into chat.
```

Source: fork-guide §2.4 (catalog and selection), §2.5 (activation through the gate), §4 (safety boundary).

## Plus/minus: what do I click, how long do I wait, how do I know it worked

### The three control states (product page main control)

| State | DOM | Source |
|---|---|---|
| Not in cart | one `button[data-testid=SvgAddToCart]`, text "Add to cart"; **0** `counter-wrapper`, **0** `input[aria-label=quantity]` | site-structure §3; observed 2026-11-25 |
| In cart | `[data-testid=counter-wrapper]` = minus `svg[data-testid=SvgRemoveFromCart]` + `input[aria-label=quantity][name=quantity][min=0]` (**value = current cart quantity**) + plus `svg[data-testid=SvgAddToCart]` | site-structure §3; (code) |
| At cap (stock) | plus becomes `svg[data-testid=StyledDisabledAddCart]`; on the PDP code may render `DisabledCartInProductDetail` instead. **Treat both ids as "at cap"; do not click** | site-structure §4a row 5 (observed `StyledDisabledAddCart`); (code) `DisabledCartInProductDetail`, 2026-11-25 |
| Out of stock | no add/stepper; "Out of stock online" + "Find similar" | site-structure §3, §4a row 8 |

- `SvgAddToCart` is used for **both** the not-in-cart button and the in-cart plus icon (code, 2026-11-25). Scope by `counter-wrapper`: a plus is `[data-testid=counter-wrapper] svg[data-testid=SvgAddToCart]`; the Add button is `SvgAddToCart` with no `counter-wrapper` around it.
- **Plus and minus have no role and no label.** The click handler sits on the svg's parent `DIV`, not on the svg (observed 2026-11-25 on `/cart`; (code)). Accessibility-tree or "find button named plus" agents find nothing: locate by `data-testid`, or by position next to `input[aria-label=quantity]`.
- The input is `type=number` except a text variant, and can be `readOnly` (code). Its `max` attribute is **not** a stock signal (code).
- Scope the main control as site-structure §3 says (ancestor of `main [data-testid=brandDetails]`, excluding `compact-product`, `virtual-carousel`, `productCollection`). Carousels reuse the same ids and can show a live stepper for the same SKU (site-structure §4a row 18). Never use carousel controls.
- There is no `<h1>`; the title is a styled span, brand is `[data-testid=brandDetails]` (observed 2026-11-25; site-structure §3).

### Do this, in order

1. Read the stepper value (or confirm the Add button). It is the current cart quantity; if a stepper shows, do not click Add (cart-rules Product-page quantity workflow 3).
2. Click **once** with a real mouse event ([mechanism below](#real-click-mechanism)).
3. Condition-wait for the expected stepper value, not a fixed sleep (site-structure §4). The client waits 500 ms before sending (trailing debounce, (code)); allow for the request after that.
4. Re-read once, then run [Did it work?](#did-it-work).
5. Wait **>=2 s** before the next click or product (cart-rules Browser surface). About 25 mutations over ~20 min at >=2 s met no bot challenge (observed 2026-11-17); if a challenge or OTP appears, stop and hand over.

### Typing a quantity

- Typing only sets local state: `fill` or keystrokes send **nothing** and the input looks updated (observed 2026-11-17, site-structure §4a row 1; (code) `handleChange` has no `onChange` call).
- The value commits on **Enter** or **blur**. Enter calls `blur()` (code, 2026-11-25), so Tab or click-away also commits. Keys `.` `+` `-` `e` are blocked (code).
- Unchanged value on blur: delta 0, nothing is sent (code).
- Typed `0` + Enter removes the item; the control returns to "Add to cart" (observed 2026-11-17, row 7).
- Mousedown on the input clears and refocuses it (code). [INFERENCE] select-all before typing, or the old value may be appended; not tested live.
- Use real keystrokes plus Enter, not a value setter (site-structure §4a row 1).

### Debounce hazards

- 500 ms **trailing** debounce; deltas in the window are summed into one request. Observed: clicks ~150 ms apart gave one `POST` `{oldQ:2,newQ:4}` (observed 2026-11-17, row 2). To undo several clicks, wait >=2 s between them: each then becomes its own request.
- The timer and running delta (`cartUpdateTimer`, `currentCount`) are **one per page, shared across products**, not per product (code, re-read 2026-11-25). Product A then B within 500 ms cancels A's timer and applies the summed delta to B. Not tested live.
- **+1 then -1 within 500 ms**: the sum is 0, but the branch uses the last click's sign, so it runs `remove` with delta 0, which sets the count to **0**: an item that was in the cart is removed (code; not tested live; site-structure §4a row 4). Never pair opposite clicks inside 500 ms.
- Rule: one product at a time, one click, wait, verify.

### Stock cap and first add

- Quantity above stock (observed: stock 3, typed 10 + Enter): modal **"We have revised your order to the maximum quantity allowed." [Okay, got it]**; server answers `changes {oldQ:1,newQ:3}`; the requested 10 is not echoed (site-structure §4a row 5, observed 2026-11-17). The "Okay, got it" label is observed only; not found in the cart provider code (2026-11-25).
- The plus stays enabled while the value is below `min(stock, maxPurchasableStock)`, roughly (code, 2026-11-25).
- **First add is not capped client-side** (`count: delta` for an item not yet in cart; code; site-structure §4a row 6). Check `newQ` anyway.
- [INFERENCE] a product that supplies `suggestedQuantity` would add more than 1 on the first click (code, 2026-11-25); not seen live.
- Dismiss the modal and any other popup before the next add; the cart does not sync while one is open (site-structure §4a rows 14, 19).

### Where else plus/minus exists

| Page | Request the stepper sends | Rule | Source |
|---|---|---|---|
| Product page `/product/<slug>` | `POST $API/cart` | main control only | site-structure §4; (code) |
| Cart row `div[data-testid=cartProduct][id=<internal id>]` | `POST $API/checkout` (not `/api/cart`) | same stepper; scope controls inside the row; delete is instant, no confirm | site-structure §4, §5; (code) |
| `/checkout` rows | live steppers | **do not touch**; do not open `/checkout` for edits | site-structure §6 |

- The page picks the endpoint: `/cart` or `/checkout` use `checkout`, every other page uses `cart` (code, 2026-11-25).
- Every change re-sends the **whole cart**; item `q` is a **string**; **removal is `q:"0"`** in the same POST (no DELETE). Only the response to the last POST is applied; any non-2xx is a silent rollback to the last server cart (code; site-structure §4a).

## Did it work?

Check in this order; all must agree (cart-rules Confirmation):

| Check | How | Source |
|---|---|---|
| 1. Stepper value | equals target (or a recorded cap) | site-structure §4 |
| 2. `changes[].newQ` | `POST $API/cart` response `data.cart.changes[{id, product.clientItemId, oldQ, newQ}]`: `newQ` equals the target. **Not** `wantQuantity` (it held the previous quantity), **not** the toast (client intent, debounced) | site-structure §4a rows 15, 17 |
| 3. Reload, then cart read | `GET $API/cart?isCheckerEnabled=true&isOutOfStockEnabled=true&isSellerCheckerEnabled=true&orderType=DELIVERY`: row with your `clientItemId` has `q` equal to target; read twice, settled | site-structure §5; cart-rules Cart audit |

- `GET $API/cart` is the user's signed-in cart. It is a **read-only request made from the signed-in browser tab** (network panel, or an in-page `fetch` that uses the tab's own session). Never copy cookies or tokens out of the browser, and never call it with curl plus cookies (fork-guide §4; cart-rules Safety boundary).
- Header `[data-testid=cart-button]` ("`<units> Cart`") and "Shopping cart N items" count **units**, not rows, and prove nothing about contents (site-structure §4).
- Re-read "Earliest slot" after every add ([delivery lateness](#delivery-lateness)).

## When an add does not do what you asked

| Symptom | Meaning / action | Source |
|---|---|---|
| Stepper moves, no request | typed value not committed: press Enter | §4a row 1 |
| Cap modal | take `newQ` as granted, dismiss, record the cap | §4a row 5 |
| No control, "Out of stock online" | unavailable; require API `stock > 0` | §3, §4a rows 8-9 |
| Add did nothing, no message | no-op: coordinates measured mid-scroll, hit-test failed, or non-2xx rollback. Reread, retry once with a fresh control; if still nothing, stop, wait ~1 min, reload, retry once, else hand back | §4, §4a row 16; cart-rules |
| "Changes to your cart" popup | click **Update Cart**; reduced item shows as lower `q` | §4a row 14 (code; label not re-verified 2026-11-25) |
| Popup/bulk modal open | cart is not syncing; dismiss first. Bulk popup "We will need more time to get the following product(s) to you." -> Cancel | §4a rows 12, 19 (code) |
| Marketplace item or bulk quantity | adds normally but silently pushes "Earliest slot" later | §4a rows 11-12 |
| Add opens a postal-code popup | guest session, not the household cart; stop | §4a row 20; (code) |

## Real-click mechanism

- Use a **physical mouse event** (for example CDP `Input.dispatchMouseEvent` mousePressed/mouseReleased) at coordinates measured **after scrolling settles**. Measure, hit-test, then click.
- Hit-test with `document.elementFromPoint(x, y)`: the hit element must be inside the intended `counter-wrapper` (of the main control or the intended `cartProduct` row). If not, re-measure.
- **Never DOM `click()` or `dispatchEvent`** (cart-rules Browser surface).
- Observed no-op: a first cart-row plus click did nothing because coordinates were taken during a smooth scroll; re-measured after settling, the next click worked. That is a coordinate cause, not a stock or challenge signal (site-structure §4, observed 2026-11-17).
- Do not hand-write a Lazada tool run for this: `tools/cdp-cart.mjs` does not drive FairPrice (fork-guide §1).

## Your four values

| Value | Where it comes from | Source |
|---|---|---|
| Article id | `clientItemId` (string); your own list | site-structure §2 |
| Store id | from your postal code (below); **not** 165 | site-structure §7 |
| Postal code | yours; use as a placeholder, never save to files or outputs | site-structure §7; cart-rules Safety boundary |
| API base | `$API` above | site-structure §1 |

`storeId=165` is only the maintainer's household store (PFC, observed 2026-11-25). `mrp` and offers matched store 45 vs 165, but **stock and ranking differ** (observed 2026-11-17, site-structure §7).

## Copy-paste commands (read-only, public)

```bash
API=https://website-api.omni.fairprice.com.sg/api

# a) store id for your postal code (do NOT save the code or the response to files)
curl -s "$API/serviceable-area?pincode=<YOUR_POSTAL_CODE>" | jq '.data.store | {id, name}'
sleep 1

# b) article id -> slug, stock, price, offers (one product)
curl -s "$API/product/v2?q=<ARTICLE_ID>&pageType=search&orderType=DELIVERY&storeId=<YOUR_STORE_ID>" \
 | jq '.data.product[] | {clientItemId, slug,
        stock: .storeSpecificData[0].stock, status: .storeSpecificData[0].status,
        mrp: .storeSpecificData[0].mrp, offers}'
sleep 1

# c) soft-404 test: title and canonical of a product page (HTTP status is NOT the signal)
curl -s "https://www.fairprice.com.sg/product/<SLUG>" | grep -oE '<title[^>]*>[^<]*</title>|<link rel="canonical"[^>]*>'
```

- Run unauthenticated, no cookies, at most 1 request per second.
- (a): returns the store that serves that postal code; the store id is `data.store.id` (checked 2026-11-25 with a public postal code: `$API` host and path work unauthenticated and the response also includes address and opening hours, so do not paste it into issues). If the call fails, read the store id from your signed-in browser's network panel.
- (b): `q=<articleId>` returns exactly that product; select the row by `clientItemId`, because search sometimes also returns an unrelated marketplace row (site-structure §2; cart-rules Product choice 1). `mrp` is a string; `offers` is `null` without a promo (observed 2026-11-25). Require **`stock > 0`** and `status == "ENABLED"`; `stockScale` and `has_stock` are unreliable (site-structure §7).
- (c): a good page has `<title>Name | NTUC FairPrice</title>` and a canonical; a soft 404 has `Error 404 | FairPrice Singapore` and no canonical. HTTP status is UNVERIFIABLE for 2026-11-25 (checked by body only).

## Product URL and slug rules

- Page URL is `https://www.fairprice.com.sg/product/` + `slug`. The slug is matched exactly; wrong text gives a soft 404 (observed 2026-11-17; body confirmed 2026-11-25). **Always resolve the slug via (b); never construct a URL.**
- **FairPrice-sold** slug pattern: `<name>-<display-unit>-<articleId>`, e.g. `...-100g-13261058` (observed 2026-11-25).
- **Marketplace** slugs are name-only (no unit, no article-id suffix), with `---` where the name had a `-` (observed 2026-11-25, one item). Marketplace = `clientItemId` prefix `90` or `inventoryType: "MKP"` (observed 2026-11-25; site-structure §2).
- **Numeric slug**: a few products use the article id as the slug (`/product/13065350` renders, canonical `/product/13065350`; observed 2026-11-25). For most products `/product/<articleId>` is a soft 404.
- So the **slug suffix is not an identity** for marketplace rows. Identity comes from `clientItemId`: the API or `GET $API/cart` row, not the cart row link suffix alone (site-structure §5's "link slug ends with article id" holds for FairPrice-sold items only; observed 2026-11-25).
- UNVERIFIABLE (no status codes available 2026-11-25): HTTP 200 on the soft 404, 308 on a trailing slash, `?foo=bar` ignored. Rely on site-structure §2 (observed 2026-11-17).

## Product page anatomy

- Next.js page `/productDetails`; `__NEXT_DATA__.query.slug` = slug; title = API `name` + ` | NTUC FairPrice` (observed 2026-11-25).
- Marketplace items show "Sold by: <seller>"; FairPrice items do not (site-structure §2).
- PDP shows promo price + strike-through mrp only for single-unit `BXATP`; bundle/basket promos apply in the cart (site-structure §3).

## Delivery lateness

- No per-product delivery date. The only signal is the cart's per-seller **"Earliest slot"** text inside `[data-testid=seller-0]` (index per seller; observed 2026-11-25; site-structure §3, §5).
- Record it before each add and re-read it after. Marketplace items and bulk quantities (API `bulkRoutingThreshold`: `bulkThreshold` 30, `deliveryDays` 4 for the maintainer's store; observed 2026-11-25) push the whole delivery later, with no warning (observed 2026-11-17, site-structure §4a rows 11-12).
- Beyond the two-day rule: delete that row (or step back) and try the next candidate (cart-rules Product choice 4). [INFERENCE] `deliveryDays` is a hint at the delay; not tested.

## Never click

| Control | Why | Source |
|---|---|---|
| `empty-cart-button` "Empty cart" | clears the cart | site-structure §5 (untested) |
| `cart-seller-bin-icon` | deletes all of a seller's items | site-structure §5 (untested) |
| `deleteFromCart` outside a recorded intended removal | immediate delete, no undo | site-structure §4, §5 |
| `lpRedemptionToggle_switch`, `voucher-section`, `addVoucherCode` | Linkpoints, voucher | site-structure §5 |
| `linkToCheckout` ("Checkout $...") | leaves for checkout | site-structure §5 |
| `checkout-apple-pay-button`, `checkout-google-pay-button` | purchase surface, rendered immediately | site-structure §6 |
| any Continue (`checkout-timeslot-continue-button`, `checkout-payment-continue-button`), delivery slot, payment, place order | checkout flow | site-structure §6; cart-rules |
| checkboxes `cart-product-checker-<id>`, `cart-seller-checker` | checked = included in checkout; read `isChecked` from the API | site-structure §5 |
| steppers on `/checkout` | live; edits there are out of bounds | site-structure §6 |
| carousel `Add to cart` buttons, "Your Past Purchases" | not the main control | site-structure §3, §5 |

All of these were still present with the same testids on 2026-11-25 (observed 2026-11-25).

## Browser and sign-in (one line each)

| If you have | Use | Source |
|---|---|---|
| built-in browser, or relay/extension for your Chrome | that, on your signed-in profile | fork-guide §3 |
| terminal agent, no browser | dedicated Chrome profile with loopback debugging: [recipe](../browser-connections.md#recipe-dedicated-chrome-profile-with-loopback-debugging-mode-3). FairPrice check: `curl http://127.0.0.1:9222/json/list` (`tools/cdp-cart.mjs tabs` lists Lazada tabs only) | fork-guide §3; observed 2026-11-25 |

- Start URL `https://www.fairprice.com.sg/cart`. Sign in yourself; stop for OTP/CAPTCHA. Confirm a **signed-in** cart (a guest Add opens a postal-code popup, so the cart is not yours) and the delivery address (site-structure §4a row 20; cart-rules Browser surface). Keep the debugging port on loopback (fork-guide §4).

## Glossary

| Term | Meaning |
|---|---|
| PDP | product detail page, `/product/<slug>` |
| Article id | `clientItemId` = `metaData.SAPMaterialNumber`; the only identity (site-structure §2). Not the internal `id`, not a Lazada SKU |
| Internal id | opaque product `id`; names `cartProduct` rows; not searchable |
| Marketplace / MKP | third-party seller item: `90...` id, `inventoryType: "MKP"` |
| Slug | URL part after `/product/`; mutable lookup key |
| Soft 404 | error page served with a normal status; detect by title and missing canonical |
| Debounce | the page waits 500 ms after the last click, then sends one request |
| `changes[].newQ` | the quantity the server actually set |
| `wantQuantity` | response field that is not the requested quantity; do not use |
| `stockScale`, `has_stock` | unreliable stock flags; use `stock > 0` |
| Earliest slot | cart's per-seller delivery window text; the lateness signal |
| CDP | Chrome DevTools Protocol, how an agent sends real mouse events |

## What is untested

See [site-structure §9](site-structure.md#9-open-questions-and-untested). Notably: liquor hours, Empty cart and seller bin, checkout continue flows, bulk popup, multi-seller deliveries, sold-by-weight, promo reprice in the cart, slug-rename frequency. Also not exercised live: A-then-B and +1/-1 within 500 ms (code only), first-add overshoot, `suggestedQuantity`. Not re-tested on 2026-11-25: any mutation, stock cap modal, marketplace/bulk slot push (observed 2026-11-25).

## Re-check in 5 minutes

1. `curl -s "https://www.fairprice.com.sg/product/<SLUG>" | grep -o '"buildId":"[^"]*"'`. Compare with `946bb0fa…` (full id in `__NEXT_DATA__.buildId`; previous `ad741b40…`). A different id means FairPrice redeployed: re-check the rows below.
2. Soft 404 still reads `Error 404 | FairPrice Singapore`, no canonical, and a good page has both title and canonical ([commands](#copy-paste-commands-read-only-public)).
3. In your own browser on one product page: `button[data-testid=SvgAddToCart]` when not in cart; in cart `counter-wrapper` with `SvgRemoveFromCart`, `input[aria-label=quantity]`, `SvgAddToCart`; no `<h1>`; `brandDetails` present.
4. On `/cart` (read only): `cartProduct`, `counter-wrapper`, `deleteFromCart`, `seller-*` and the dangerous testids above still exist.
5. Append the date and what changed to [site-structure.md](site-structure.md) (fork-guide §5 item 5).

## Where next

[site-structure.md](site-structure.md) (facts), [cart-rules.md](cart-rules.md) (inactive design), [fork-guide.md](fork-guide.md) (setup and contributions, §5), [CONTRIBUTING.md](../../CONTRIBUTING.md).

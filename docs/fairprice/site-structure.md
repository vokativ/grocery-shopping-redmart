# FairPrice site structure for agents (experimental)

Status: **experimental research, observed site facts.** This page underpins the inactive FairPrice cart design in [cart-rules.md](cart-rules.md) and the RedMart vs FairPrice price comparison. Nothing here changes the RedMart workflow in [AGENTS.md](../../AGENTS.md). No FairPrice cart procedure is approved; this page records what was observed (dated), what was read from public JS ("(code)"), and what is inference, so a later procedure can be designed on facts.

See also: [cart-rules.md](cart-rules.md) (inactive design for a FairPrice cart procedure, built on this page) and [experiments/fairprice/backup-catalog.yaml](../../experiments/fairprice/backup-catalog.yaml) (generated FairPrice substitutes per catalog item).

## 1. Scope and evidence

| Source | What | Date |
|---|---|---|
| Live relay session | OMP relay driving the user's signed-in Chrome on `www.fairprice.com.sg`: PDP, cart, checkout (read-only), network responses | observed 2026-11-17 |
| Reversible mutation tests | Add / plus / minus / delete on two baseline rows and one test row; baseline restored, verified after reload and two settled reads | observed 2026-11-17 |
| Unauthenticated `curl` | Product pages, `website-api.omni.fairprice.com.sg/api`, ~1 req/s, no cookies | observed 2026-11-17 |
| Live add / no-add tests | Typed quantity, double click, stock cap, typed 0, marketplace add, alcohol add, bulk quantity; all restored to baseline and verified after reload | observed 2026-11-17 (afternoon) |
| Static JS bundle read | Public Next.js bundles (build `ad741b40…`): cart provider, stepper, popups; **code-level only, not observed behaviour**; rules marked "(code)" below | read 2026-11-17 |
| Re-check (read-only) | Live DOM read of one PDP and `/cart` through the dedicated loopback-CDP Chrome profile (one new tab, no clicks); unauthenticated API fetch of 3 products (FairPrice-sold, marketplace, numeric slug); read of the public JS bundles of the new build `946bb0faddb2dd644fb67e885695031e61393abd` (replaces `ad741b40…`: FairPrice redeployed). **No mutations were re-run.** Conclusion: the documented DOM and behaviour held on the new build; the "(code)" rules were re-read against the new bundle and matched except where noted below | observed 2026-11-25 |

Limits: one short session, one household store. Checkout was only read; nothing on it was clicked. Absence of a problem here is not proof of absence (see §8 on bot challenges). API paths are what the site's own JS calls; they are undocumented and may change (`buildId` changes on deploys).

API base: `https://website-api.omni.fairprice.com.sg/api` (below: `$API`).

## 2. Identity

| Identifier | Where | Stable? | Use |
|---|---|---|---|
| **Article id** = `clientItemId` = `metaData.SAPMaterialNumber` (string, e.g. `13294464`) | API, cart `product.clientItemId`, slug suffix **for FairPrice-sold items only** (not marketplace, not numeric slugs; see below) | Yes | **Primary key.** `q=<articleId>` returns exactly that product (re-confirmed 2026-11-25 for all three product types) |
| Barcode (EAN) `barcodes[]` | API | Yes | Optional secondary key; `q=<ean>` is also an exact lookup |
| Internal product `id` (int, e.g. `1637106`) | API `id`, cart row `id` / `data-testid=cartProduct` element id, `offers[].rule.buy` keys, ld+json `sku` | Yes, but opaque | Join key for cart rows and offer rules only. Not searchable (`q=` returns 0), not usable in URLs |
| Slug `<name>-<display-unit>-<articleId>` | URL, API `slug` | **No** | Lookup key for the page; generated from name + DisplayUnit, changes on rename. The pattern holds for **FairPrice-sold** items only (observed 2026-11-25); marketplace and numeric slugs differ (below) |

Product URL behaviour (curl, observed 2026-11-17):

| URL `/product/<X>` | Result |
|---|---|
| Exact current slug | HTTP 200, real page, relative `<link rel=canonical>` |
| Right article-id suffix, wrong text | **HTTP 200 soft 404** (`<title>Error 404 \| FairPrice Singapore`, no canonical) |
| Article id only, or internal id only | Soft 404 for most products (exception: products whose slug is the numeric article id, see below). Re-observed 2026-11-25 for a marketplace id (body: `Error 404` title, no canonical) |
| Exact slug + trailing `/` | 308 to slug without slash |
| Exact slug + `?foo=bar` | Real page; query ignored; canonical has no query |

- The trailing number is **not** used for lookup; the slug is matched exactly. A bad URL still returns 200, so detect 404 by title and missing canonical, never by status.
- **Numeric-slug exception** (verified 2026-11-17): some products have a purely numeric slug equal to the article id, e.g. `/product/13065350` (a fresh-eggs product) renders with canonical `/product/13065350`. The site's own cart "Your Past Purchases" carousel links such products numerically. For most products `/product/<articleId>` is a soft 404. So the URL is valid only with the exact current slug: **always resolve the slug through the API** (`q=<articleId>`), never construct it.
- **Slug shapes** (observed 2026-11-25 via API `slug`, one product each): FairPrice-sold `ceres-organics-brown-rice-bites-orginal-100g-13261058` fits `<name>-<display-unit>-<articleId>`. **Marketplace** (`90…`, `MKP`): name-only slug, **no unit and no article-id suffix** (`…-rice-cakes---lightly-salted`; a `-` inside the name becomes `---`). **Numeric slug**: `13065350` (slug = article id). Therefore **identity for marketplace rows must come from the API / cart `clientItemId`, not from the slug tail**; a slug-suffix check only works for FairPrice-sold items.
- `/product/<articleId>` alone is a soft 404 (title `Error 404 | FairPrice Singapore`, no `<link rel=canonical>`) except in the numeric-slug case. The wrong-slug-with-right-suffix soft 404 was re-seen at body level on 2026-11-25.
- **Not re-verified 2026-11-25:** the HTTP status codes (200 for soft 404) and the 308 redirect for a trailing `/`, and the ignored `?foo=bar` query. The 2026-11-25 fetch mode returned bodies only, no status or headers. The statements in the table above remain "observed 2026-11-17".
- Detail by slug: `GET $API/layout/product?url=<exact slug>&storeId=<id>&orderType=DELIVERY&includeTagDetails=true`. Wrong slug returns HTTP 200 with an empty value.

Recommended catalog fields (mirrors RedMart's pair, but one key):

```yaml
fairprice_article_id: "13294464"   # primary key, string
barcode: "8888030324417"           # optional
canonical_url: https://www.fairprice.com.sg/product/<slug>   # slug captured from API at match time
```

Canonical URL rule: build `https://www.fairprice.com.sg/product/` + `slug` from `GET $API/product/v2?q=<articleId>&pageType=search&orderType=DELIVERY&storeId=<id>` immediately before use. After navigating, verify identity from the article id: `GET $API/cart` `clientItemId` (works for every row), or the cart row link slug suffix (**FairPrice-sold items only**; marketplace slugs have no article id), not the URL alone.

Marketplace (third-party seller) detection, consistent over 260 sampled products (149 marketplace):

- `clientItemId` starts with `90`, **or** `storeSpecificData[0].inventoryType == "MKP"` (FairPrice items: `null` or `DAILY_PRESET`).
- Tags (with `includeTagDetails=true`): `Online Marketplace` / `Marketplace`. `seller.config.sellerType` is always `""` (useless).
- PDP shows a "Sold by: <seller>" panel; FairPrice-sold items do not. Cart rows have `isMKP`.
- Caveat: 4 items with prefix `13` carried a Seller ID (third-party fresh vendors) yet `inventoryType` null. [INFERENCE] treat any item with `metaData["Seller ID"]` as non-FairPrice-fulfilled when comparing.
- Marketplace stock is seller-reported (very large or 0 with `has_stock` true); price and pack size are seller-set. Restrict comparison to non-marketplace or flag.

| | RedMart (Lazada) | FairPrice |
|---|---|---|
| Identity | `item_id` + `sku_id` pair | `clientItemId` (single) |
| Identity in URL | `/products/i<item>-s<sku>.html` (exact pair verified from final URL) | Slug only; article id is a suffix, not a key |
| URL stability | Pair is identity | Slug can change; resolve via API |
| Bad URL | Not covered by this research | HTTP 200 soft 404 |
| Barcode | not used | `barcodes[]`, exact search |
| Marketplace signal | n/a in this repo | `90` prefix, `inventoryType MKP`, Sold by panel |

## 3. Product page (PDP) `/product/<slug>`

Next.js pages-router page `/productDetails`; `__NEXT_DATA__.query.slug` = slug; `document.title` = `<Name> | NTUC FairPrice`.

- **No `<h1>`.** The title is a styled `<span>` in the product-info block, with pack size next to it (`30 per pack`, `300g (2 per pack)`), then `Brand: <link>` with `data-testid=brandDetails` (links `/brand/<brand-slug>`). RedMart pages use the `h1`; do not port that selector.
- **No module id** for the main control (RedMart: `#module_redmart_add_to_cart`). Scope: the nearest ancestor of `main [data-testid=brandDetails]` that contains a control, **excluding** anything inside `[data-testid=compact-product]`, `[data-testid=virtual-carousel]`, `[data-testid=productCollection]`. Carousels (Similar Products, Frequently Bought Together, offer carousels, Your Past Purchases) reuse the same `SvgAddToCart` buttons labelled "add to cart Add to cart".

| Main control state | DOM |
|---|---|
| Not in cart | `button[data-testid=SvgAddToCart]`, text "Add to cart" |
| In cart | `[data-testid=counter-wrapper]`: minus `svg[data-testid=SvgRemoveFromCart]`, `input[aria-label=quantity][name=quantity][type=number][min=0]` (**value = current cart quantity**), plus `svg[data-testid=SvgAddToCart]`. Click targets are the svg's parent `DIV` (no button role, unlabeled) |
| Out of stock | No add/stepper; text "Out of stock online" + "Find similar" button. Carousel cards show "Out of stock" |

Testid and input facts (code, read 2026-11-25 from the new bundle unless marked live):

- `data-testid=SvgAddToCart` is **ambiguous**: the not-in-cart control is a `BUTTON[data-testid=SvgAddToCart]` and the in-cart plus is an `svg[data-testid=SvgAddToCart]` inside `counter-wrapper`. Scope by `counter-wrapper` / tag. Live 2026-11-25: a not-in-cart PDP had exactly one such BUTTON outside carousels and 0 `counter-wrapper`.
- Click handlers sit on the wrapping styled element (the svg's parent DIV, no role, no aria-label; seen live 2026-11-25 on `/cart`), not on the svg.
- Disabled plus (at cap) may be `svg[data-testid=StyledDisabledAddCart]` (observed 2026-11-17, row 5) **or** `DisabledCartInProductDetail` (code; PDP variant, not seen live). Treat both as "at cap, do not click".
- Quantity input `input[aria-label=quantity][name=quantity]`: `type=number` except a **text variant** (`type=text`), `min=0`, can be **`readOnly`** in some states (so `fill` may be blocked), and its `max` attribute is **not a reliable stock signal** (set to stock only when no override flag applies). Use API `stock`, not `max`.
- Typed values do not send anything on input; they commit on **Enter or blur** (Enter calls `blur()`). Keys `.`, `+`, `-`, `e` are blocked (`preventDefault`). A blur with an unchanged value sends nothing (delta 0).
- `mousedown` on the input clears and refocuses it. [INFERENCE: not tested live] select-all before typing, otherwise the old value may be appended.
- Guest: a click on Add opens the postal-code popup when there is no address (code; row 20).

- Promo badges on the PDP: "Offer" badge, offer buttons ("Spend $70, get $7 off — Ends in …", "Buy 3, get 5% off Till …", "Any 2 for $17.95"). For **single-unit `BXATP` promos the PDP shows the promo price with the strike-through mrp** (observed 2026-11-17: Merlot $18.50 vs $30.00, "Save $11.50"; canola $6.25 vs $9.50). Bundle and basket promos (`BXATP` N>1, `BANYATP`, `BMIN`) are **not** reflected in the shelf price and apply in the cart.
- **No per-product delivery date.** RedMart's `Product Availability` date chips (AGENTS.md **Product Choice And Availability**, "too-late" rule) have no PDP equivalent. Availability signals instead: API `storeSpecificData[0].stock` (use `stock > 0`; `stockScale` and `has_stock` are unreliable, see §7), the PDP out-of-stock state, and the cart's per-seller "Earliest slot" (cart-level, not per product). A "within two days" rule cannot be evaluated per product; it can only be read per seller at the cart **after the add**, and some adds push it later (§4a).

**Re-checked 2026-11-25 (live, read-only; no clicks):** build id changed (§1); PDP title `<Name> | NTUC FairPrice`, relative-equal `<link rel=canonical>`, **0 `<h1>`**, `main [data-testid=brandDetails]` text `Brand:<brand>`; for a not-in-cart PDP exactly one main `BUTTON[data-testid=SvgAddToCart]` (text "add to cart…Add to cart"), 0 `counter-wrapper`, 0 `input[aria-label=quantity]`, not out of stock; header `[data-testid=cart-button]` text carries the unit count. **Not re-tested:** the in-cart PDP stepper states, out-of-stock PDP, and any click.

## 4. Confirming add / change / remove

| Action | Where | Network | Confirmation |
|---|---|---|---|
| PDP Add / plus / minus | PDP main control | `POST $API/cart` → 200; `data.cart.changes[{id, product.clientItemId, oldQ, newQ}]` + `data.cart.items[]` (`id` internal, `q` **string**) | Stepper value changed after the 500 ms client debounce (§4a); `changes[0]` oldQ→newQ matches the target |
| Cart-row plus / minus | `/cart` row | `POST $API/checkout` (not `/api/cart`); response `data` = `cart, slot, payment, sellersTimeSlots, couponDiscounts, corpBillings, errors`; `data.cart.items` carries new `q` | Row stepper value; header counts |
| Cart-row delete | `/cart` row | same cart mutation path | Row disappears **immediately, no confirmation dialog** |

Unit checksums (both count **units**, not rows): header `[data-testid=cart-button]` text `<units> Cart`, and cart heading `Shopping cart <N> items`. Observed together: baseline 4, eggs add → 5, cart-row plus → 6, delete → 4. Same role as the RedMart "header count is a unit checksum only" rule; neither proves contents.

Procedure that held up (observed 2026-11-17): click once, condition-wait for the expected stepper value (not a fixed sleep), then reread once more; reload at the end and take two settled row reads. About 25 cart mutations over ~20 min at ≥2 s pacing met no bot challenge.

**Silent no-op observed.** First cart-row plus click did nothing because the click coordinates were measured **during a smooth scroll** (sticky header and scroll shifted the control). Re-measuring after the scroll settled and hit-testing with `document.elementFromPoint(x, y)` (confirm the hit target is inside the intended row's `counter-wrapper`) made the next click succeed. This is a coordinate/hit-test cause, **not** a stock or challenge signal. It maps onto the AGENTS.md **silent no-op rule**: reread, retry once with a fresh control; if still no change, stop all cart changes, wait, reload, retry once, else hand over. Do not click the same control repeatedly. Use real clicks, not DOM `click()`.

## 4a. When an add does and does not happen

"Observed" = live test 2026-11-17 (user's signed-in Chrome, reversible). "(code)" = read from the public JS bundles, not exercised live. Compare the **target quantity** you asked for with `changes[].newQ` / row `q` after every add; the toast and the stepper are not proof (see rows 1, 5, 17).

Wire shape (code, re-read 2026-11-25 on build `946bb0fa…`): every add/update/remove re-sends the **whole cart** as `POST $API/cart` (or `POST $API/checkout` when the page is `/cart` or `/checkout`, same body plus `cardId`, and `couponCodes[]` + `orderAmount` when a coupon is applied). Items are `{id, isChecked, q: "<count as string>", t, adIds, reason: "InStock", …}` (`isUserEditQuantity` is added when the reduced-quantity flag is on; `isFree` or `mrp: 0` rows are skipped); **removal is `q: "0"`** in the same POST (no PUT/DELETE). Other body fields: `customerId`, `storeId` (string), `addressId`, `orderType` (`DELIVERY`, or `B2B`), `isCheckerEnabled`, `isSellerCheckerEnabled`, `isOutOfStockEnabled`, `isSellerTimeSlotEnabled`, `isDirectFulfilmentEnabled`, `poaItemDropOff`, `isReducedQuantityEnabled` (only when the flag is on), and inside `cart`: `dropUnavailableItems[]`, `isOutOfStockEnabled`, `isCartMerge: true` (guest-to-login merge only). The server answers with the full cart; `cart.items[].q` is server truth and overwrites the local count. Only the response to the **last** POST is applied (stale ones are discarded). Guests keep the cart in `localStorage["cart"]`; on login it is merged (`cart.isCartMerge: true`). Any non-2xx or thrown error is a silent rollback to the last good server cart. The first add of an item uses `suggestedQuantity` when the product supplies one, else `+1` (`addToCart = (prev, e) => onValueChange({nextValue: e ? prev+e : prev+1, delta: e || 1})`). [INFERENCE] a product with `suggestedQuantity` would be added with a quantity above 1 on the first click; not seen live, so compare `newQ` to the target even for a first add.

| # | Case | What you see | What the server says | Agent rule |
|---|---|---|---|---|
| 1 | Typed quantity, no commit | Input shows the new value (pizza 2→3 via `fill`) | **No request sent**, cart unchanged (observed). Only Enter (or blur, code) fires `POST` with `changes {oldQ:2,newQ:3}` | `fill` alone is a silent no-op that looks applied. After typing, press Enter, then wait for the stepper/`changes` |
| 2 | Rapid clicks on one product | Stepper moves per click | Clicks ~150 ms apart gave **one** `POST` `{oldQ:2,newQ:4}` (observed). Code: 500 ms trailing debounce sums deltas into one add | Click once per change, then condition-wait. To undo several, wait ≥2 s between clicks (each became its own request) |
| 3 | Add A then B within 500 ms | (not tested live) | Code: `currentCount` and the timer are **shared across products**; A's timer is cancelled and B receives `+2` | **Wait > 500 ms between different products; use ≥2 s pacing** |
| 4 | `+1` then `-1` within 500 ms | (not tested live) | Code: `currentCount` becomes 0 and `remove(…, 0)` sets the count to **0** (item removed if it was in the cart). The add/remove branch uses the **sign of the LAST click's delta** (`t<0` → `remove`), while the **summed** delta is passed as the quantity (e.g. `+1 +1 -1` inside 500 ms: sum `+1`, last delta `-1`, so `remove(…, +1)` runs). Mixed-direction clicks inside 500 ms are therefore **unpredictable** (code, re-read 2026-11-25; outcome not tested live) | Never pair opposite clicks inside 500 ms; confirm quantity afterwards |
| 5 | Quantity above stock (stock 3, typed 10 + Enter) | Modal **"We have revised your order to the maximum quantity allowed." [Okay, got it]** blocks the page; plus becomes `svg[data-testid=StyledDisabledAddCart]` instead of `SvgAddToCart` (observed) | `changes {oldQ:1,newQ:3}`; the requested 10 is not echoed (observed) | Dismiss the modal, take `newQ` as the granted quantity, record the cap. Disabled plus = at cap, do not click |
| 6 | First add of an item not yet in cart | (code) the client applies **no** stock cap to the first add (`count: delta`), only the message | Server caps afterwards | Still check `newQ`; do not assume the client prevented an over-stock first add |
| 7 | Typed `0` + Enter | Main control returns to "Add to cart" (observed) | `changes {oldQ:3,newQ:0}` | Typed zero = removal |
| 8 | Out of stock | PDP: no add/stepper, "Out of stock online" + "Find similar"; cards: "Out of stock" (observed) | `stock` 0 | Treat as unavailable; no control to click |
| 9 | API `stockScale: "inStock"` with `stock: 0` | PDP shows out of stock online (verified 2026-11-17 for `13297030` and `13286189`) | API stock 0 | `stockScale` alone is not an in-stock signal; **require `stock > 0`** |
| 10 | `storeSpecificData[0].status != "ENABLED"` | (code) no Add; banner "Unavailable for delivery to <pincode>" + "Buy this in-store or find similar items for delivery." | (code) | Treat as not deliverable; do not test by clicking |
| 11 | Marketplace item (`90…` id, `MKP`) | Added normally `0→1`, no warning; cart still "1 delivery: FairPrice", no separate seller block (observed, dragon fruit) | **Earliest slot of the whole delivery moved Tomorrow → Fri 20 Nov, 8am-10am**; back to Tomorrow after deleting the row (observed). No client `isMKP` gate (code) | Re-read "Earliest slot" after the add; if later than the slot rule allows, delete the row and mark the item too-late/unavailable |
| 12 | Bulk quantity ≥ `storeBulkOrderThreshold` (canola, threshold 30, typed 31) | Accepted `1→31`, **no warning** on PDP or cart; cart "35 items", free delivery, basket promo "Spend $70, get $7 off" applied (observed) | **Earliest slot silently moved Tomorrow → Sun 22 Nov, 8am-10am**; restored after delete (observed). Code: a bulk popup "We will need more time to get the following product(s) to you." (Cancel / Continue; subtitle "Additional delivery charges may apply", text re-read 2026-11-25) may appear when the store is not the default store; Cancel resets the count. **New API fields (observed 2026-11-25, unauthenticated API, two FairPrice-sold products):** `stockOverride.storeBulkOrderThreshold` = **30** (and `maxPurchasableStock` 99999), and `bulkRoutingThreshold {bulkThreshold: 30, cutOffTime: "20:00:00", deliveryDays: 4, storeId: 165}`. A marketplace item showed `bulkThreshold: 9999`, `deliveryDays: 0`, null `stockOverride` values. [INFERENCE] these fields explain the bulk slot push (quantity ≥ 30 routes the order to a slower bulk path, `deliveryDays: 4`); the slot effect was not re-tested. The stepper-level bulk guard (`checkBulk`, clamp to `threshold-1` on blur) applies **only in the amend-order (POA) flow** (code), which matches the silent bulk add on a normal cart | Keep quantities below the bulk threshold (`storeBulkOrderThreshold` / `bulkRoutingThreshold.bulkThreshold`), or re-read the slot after the add. Cancel the popup if it appears |
| 13 | Alcohol (Merlot, afternoon) | No gate; toast "1 product added to cart — View cart" only (observed) | Added | No add-time alcohol handling. Code: only an age-consent disclaimer on `/cart` and an "age-restricted items" popup on `/checkout` block checkout. Liquor hours (10.30pm-7am) are **not in the client** (server-side, untested) |
| 14 | Server reduces or drops an item | (code) popup "Changes to your cart / Some items are unavailable", rows `oldQ -> newQ` with "Only N left" or "Out of stock", button **"Update Cart"** (Cancel/Back to cart only on `/checkout` or store switch) | `changes[]`, `unavailableItems[]`; popup hidden for reasons `NotApplicable`, `PreOrder`, `MaxPurchasableQuantityReached`, which then only appear as a lower `q` | Dismiss with "Update Cart"; item reasons seen in code: `OutOfStock`, `NotApplicable`, `PreOrder`, `MaxPurchasableQuantityReached`; all rows were `InStock` live |
| 15 | `wantQuantity` in the response | Looks like a "requested" field | **Not the requested quantity**: it held the previous quantity (after 1→3 cap `"1"`; after 2→4 `"3"`) (observed) | Do not use. Detect caps by comparing the target to `changes[].newQ` / row `q` |
| 16 | Non-2xx response | Stepper reverts, no message | (code) silent rollback to the last good server cart | Reread; treat as no-op under the silent no-op rule (§4) |
| 17 | Toast "N product(s) added to cart" | Appears (also on alcohol and capped adds) | (code) computed from **client intent**, debounced 1000 ms, not server result; "Cart updated" appears when the cap message fired | Never confirm an add from the toast |
| 18 | Carousel stepper for the same SKU | "Spend $75, get $8 off" carousel showed its **own live stepper** for the main SKU (Merlot, value 1) (observed) | Same cart row | Never use carousel controls; scope to the main control (§3) |
| 19 | Popup open | (code) cart changes are not synced while a drop-off / bulk / unavailable popup is open | — | Dismiss modals (incl. the cap modal) before the next add |
| 20 | No address (guest) | (code) Add opens the postal-code popup | `syncCart` does nothing without an address | Not applicable to the signed-in household session |

Slot rule consequence: FairPrice has no per-product delivery date, so the cart's per-seller **"Earliest slot"** is the only lateness signal. Re-read it after every add; a slot later than the two-day rule is FairPrice's equivalent of RedMart's "too-late".

## 5. Cart page `/cart`

- Banner "N delivery: <seller>" — **one delivery per seller**; marketplace sellers add deliveries. Seller block `[data-testid=seller-0]` (index per seller) with checkbox `cart-seller-checker`, bin `cart-seller-bin-icon`, "Earliest slot: Tomorrow, 12pm-2pm" style text, `free-delivery-fee-tracker` ("+$27.35 to FREE delivery").
- **Row anchor:** `div[data-testid=cartProduct][id=<internal product id>]`. Scope every control inside it (same discipline as RedMart's row-scoped fallback; never use global index).
  - Link `[data-testid=cart-product-detail-link]` href `/product/<slug>` (slug ends with article id): use for identity.
  - Title, pack size, unit price (`300g (2 per pack)•$6.85`), line total, promo strike-through + "Save $x".
  - Stepper `counter-wrapper` (minus/plus divs + quantity input), `deleteFromCart` (trash, aria "Delete").
  - Checkbox `cart-product-checker-<id>` (aria `select-product-<id>`): **checked = included in checkout**. Never toggle to verify contents (same as the RedMart "never tick checkout checkboxes" rule); reading `isChecked` from the API is enough.
  - Offers: `offer-link-<offerId>` ("Any 2 for $17.95", tick when met), `new-offers-container`.
- Carousels below the cart ("Your Past Purchases", "We think you'll love") have their own Add to cart buttons; they are **not** cart rows.
- Summary: `cart-summary-subtotal`, vouchers `voucher-section` / `addVoucherCode`, `cart-summary-delivery-fee` (per-seller tiers), service fee (Picking & Packing $3.99, waived for Digital Club ≥ $59), `lpRedemptionToggle_switch` (Linkpoints), `cart-summary-total`, `linkToCheckout` ("Checkout $<total>", goes to `/checkout`).

Dangerous controls — **never click**:

| Control | Effect |
|---|---|
| `[data-testid=empty-cart-button]` "Empty cart" | clears the cart (not tested) |
| `cart-seller-bin-icon` | deletes all of that seller's items (not tested) |
| `deleteFromCart` outside a recorded reversible test | immediate delete, no undo seen |
| `lpRedemptionToggle_switch` | redeems Linkpoints against the total |
| `voucher-section` / `addVoucherCode` | voucher entry |
| `linkToCheckout` | leaves for checkout |

Read API: `GET $API/cart?isCheckerEnabled=true&isOutOfStockEnabled=true&isSellerCheckerEnabled=true&isReducedQuantityEnabled=<flag>&orderType=DELIVERY` (`storeId` optional) → `data.cart.items[] {id, q, mrp, discount, isFree, isChecked, isMKP, product{clientItemId, slug, name, brand, metaData.DisplayUnit}}`, `amounts`, `appliedOffers`, `sellersItems`, `storeId`. `isReducedQuantityEnabled` is added by the client when a remote-config flag is on (code, 2026-11-25; the flag value is not in the bundle). Preferred over DOM for baseline/audit (exact article ids and quantities, no row parsing; the only reliable identity for marketplace rows, §2). Loading `/cart` itself fires `POST $API/checkout` (price preview).

**Re-checked 2026-11-25 (live, signed in, read-only; no clicks):** rows `div[data-testid=cartProduct]` with `id` = internal product id; row link `[data-testid=cart-product-detail-link]` slug tail = article id for FairPrice-sold items; per row `counter-wrapper` with minus `svg[SvgRemoveFromCart]` (parent DIV, no role, no aria-label), `input[aria-label=quantity]` `type=number min=0`, plus `svg[SvgAddToCart]`, `deleteFromCart`, checkbox `cart-product-checker-*`; `[data-testid^=seller-]` blocks and "Earliest slot" text present; the dangerous controls `empty-cart-button`, `cart-seller-bin-icon`, `lpRedemptionToggle_switch`, `linkToCheckout`, `voucher-section` still exist under the documented testids. **Not re-tested:** any plus / minus / typed / delete mutation, the stock cap modal, marketplace and bulk slot pushes. Rows 1-20 in §4a stay "observed 2026-11-17" or "(code)".

## 6. Checkout page `/checkout` (read-only; nothing clicked)

Foldable sections: `CheckoutAddress` (saved address, Change, Continue); `TimeSlotSection` (per-seller date headings, slot list with "Not available", `checkout-timeslot-continue-button`); delivery notes (Allow earlier delivery / Place at doorstep, arrival instruction); `PaymentFoldableSection` (saved cards, add-card fields, `checkout-payment-continue-button`); cart section with `cartProduct` rows; voucher; summary; `checkout-apple-pay-button`, `checkout-google-pay-button`.

- **Quantity steppers are live on checkout** (`counter-wrapper` inside each row): quantities are editable there too.
- Apple/Google Pay buttons are rendered **immediately**, before address, slot, or payment are continued. They are a purchase surface.
- The place-order control was not rendered until sections are continued (not exercised).
- `POST $API/checkout` is a cart/pricing preview, not order placement, and it also runs on `/cart`. It is still **out of bounds for clicks**.

**Hard boundary (same as AGENTS.md step 7):** never select a delivery slot, enter or choose payment, press any Continue, Apple Pay, Google Pay, or place order. Opening the page for a read is the only checkout activity observed.

## 7. Price data for comparison

Source of truth: search by article id, `GET $API/product/v2?q=<articleId>&pageType=search&orderType=DELIVERY&storeId=<id>&page=1` (one product; page size fixed at 20).

- Base shelf price: `storeSpecificData[0].mrp` (string, SGD). `discount` = mrp − best single-unit promo price.
- `offers[]` (null if none): `type`, `description`, `price`, `rule`, `validFrom`, `validTill` (SGT, `YYYY-MM-DD HH:MM:SS`), `orderType[]`.

| `type` | Meaning | Unit-price use |
|---|---|---|
| `BXATP` | Buy N of this item at a fixed total. N=1: `price` set (= mrp − discount). N>1: `price` is null, total in `rule.total.v` | N=1 → effective unit price; N>1 → `rule.total.v / N`, flag "buy N" |
| `BANYATP` | "Any N for $X" across a variant group (`rule.entity.variants[]` internal ids; mix-and-match flavours) | Conditional group price; flag |
| `BMIN`, `BMINXGFG` | Basket/category spend thresholds ("Spend $25, get $5 off", free gift); `price` null | **Ignore for unit price** |

- `final_price` (search only) is **unreliable**: usually equals mrp even with a promo, and was 0 for some items depending on the query. `has_stock` is unreliable (true with `stock:0`). `stockScale` is also unreliable: `inStock` with `stock: 0` still renders "Out of stock online" on the PDP (verified for `13297030`, `13286189`, 2026-11-17). Use `mrp` + `offers[]`, and **`stock > 0`**.
- Single-unit `BXATP` promos show on the PDP as promo price with strike-through mrp; bundle/basket promos apply in the cart. Verify offer groups in the cart rows (`offer-link-<id>`, "Save $x") before trusting a bundle price. Check `validFrom <= now <= validTill`.
- `storeId`: from `serviceable-area?pincode=<delivery postal code>` (do not store the postal code in outputs). The household resolves to **165**; omitting `storeId` also yields 165; unknown ids return `count:0`. Tested 165 vs 45 (observed 2026-11-17): **mrp, discount and offers identical; `stock` and ranking differ**. [INFERENCE] store-specific pricing may exist for some items; none seen.
- Pack size is free text `metaData.DisplayUnit` with inconsistent units/case (`300g`, `500 G`, `1 KG`, `1000 G`, `4 S`, `30 per pack`, `24 x 200ml (CTN)`, `5 x 125ml`). Normalise to g/kg/ml/L, `N x size`, count before computing per-100g/ml. `metaData["SAP Product Name"]` sometimes holds true weights (`30S X 1.65KG` where display says `30 per pack`) — fallback only. Produce, meat and fish are fixed-size packs at fixed prices.
- `soldByWeight` was 0 on all 260 sampled products; `hasVariants` 0, `variants[]` empty (flavour groups are separate products tied by shared promo ids). Sold-by-weight **not observed**; [INFERENCE] may exist for counter items, so flag `soldByWeight == 1` as unsupported rather than guess.
- No separate member / card price seen; `metaData."LinkPoint Eligible"` only.
- **New fields seen 2026-11-25** (unauthenticated API, 3 products; not in the 2026-11-17 notes): `stockOverride {maxPurchasableStock, stockBuffer, storeBulkOrderThreshold}`, `bulkRoutingThreshold {bulkThreshold, cutOffTime, deliveryDays, storeId}` (values and meaning in §4a row 12), `storeSpecificData[0].mrp8` (4.84 on one product, null on others; meaning unknown), and an embedded `storeSpecificData[0].store` (`id` 165, `type` "PFC") confirming the store resolution above. Top-level `bulkOrderThreshold` (99999 / 0 / 9999 on the three products) does not match the 30 and is not a reliable signal.
- Consistency re-seen 2026-11-25: for three products `stockScale`, `status` and `has_stock` agreed with `stock` (the marketplace item with `stock: 0` showed `stockScale: "oos"`, `has_stock: false`); none reproduced the documented unreliable cases, which were **not re-tested**. Keep requiring `stock > 0`. No active offers on those three (`offers: null`), so promo types were **not re-verified**.

## 8. RedMart vs FairPrice

| Topic | RedMart (Lazada SG) | FairPrice |
|---|---|---|
| Item identity | `i<item>-s<sku>` pair in URL, verified from final URL | `clientItemId`; slug is a mutable lookup key; resolve via API |
| URL validity | Canonical product URL | Exact slug only; wrong slug = HTTP 200 soft 404; numeric-slug exception |
| Page title | `h1` semantic heading | No `h1`; styled span + `brandDetails` anchor |
| Main control scope | `#module_redmart_add_to_cart` | Ancestor of `main [data-testid=brandDetails]`, excluding carousel/`compact-product`/`productCollection` |
| Out-of-stock | Corroborated unavailability, then next rank | "Out of stock online" + "Find similar"; require API `stock > 0` (`stockScale inStock` with stock 0 is still out of stock) |
| Availability / delivery | Per-product `Product Availability` date chips; two-day rule ("too-late") | None per product. FairPrice's "too-late" equivalent is the cart's per-seller "Earliest slot", re-read after each add (marketplace items and bulk quantities silently push it, §4a); slot grid only at checkout |
| Add confirmation | Stepper value + cart row | Stepper value + `POST /api/cart` `changes` oldQ/newQ; cart-page edits via `POST /api/checkout` |
| Cart row identity | Product link item/SKU pair | `cartProduct[id=<internal id>]`; link slug ends with article id; `GET /api/cart` gives `clientItemId` |
| Unit checksum | Header count | Header `<units> Cart`, `Shopping cart N items` |
| Promotions | Promotion groups collapse rows; inspect via `EDIT` | `offers[]` (`BXATP`, `BANYATP`, …) shown as offer links and "Save $x"; rows stay visible |
| Delete | Row-scoped controls (cart-row fallback) | Immediate, no confirm; seller bin and Empty cart also present |
| Delivery model | Not covered by this research | One delivery per seller; fee tiers per seller; service fee |
| Checkout hazards | Out of bounds | Out of bounds; live steppers and Apple/Google Pay visible immediately |
| Bot challenge | Baxia `.baxia-dialog` overlay / `punish` iframe (documented) | **No bot challenge observed in this short session** — not a claim that none exists; keep the challenge-stop rule |
| API | Not used by the repo tools | JSON API observed; `robots.txt` disallows `/search`, `/cart`, `/checkout`, `/login`; `/product/` and API host not listed |

## 9. Open questions and untested

- Liquor-hours enforcement (10.30pm-7am): not in the client JS; only an afternoon alcohol add was tested.
- Seller-level bin (`cart-seller-bin-icon`) and `empty-cart-button` effects, confirmation behaviour, undo — not tested (and dangerous).
- Checkout continue flows (address, slot, payment, place order) — deliberately not exercised; behaviour of Apple/Google Pay buttons unknown.
- Promo bundles in the cart beyond what was observed (whether partial `Any 2` groups, mixed flavours or `BMIN` thresholds reprice rows as expected); `appliedOffers` semantics unverified.
- Sold-by-weight items and variants; loose-item pricing at checkout.
- Marketplace sellers that do get their own delivery block (the one MKP item tested stayed in the FairPrice delivery); per-seller fees.
- Whether the bulk popup (code) ever appears for the household store; observed bulk add was accepted silently with a later slot. Live values of the remote-config flags (OOS_REDUCED_QUANTITY, DEPRECATE_PRODUCT_BULK_ORDER_THRESHOLD, FE_BCRS, alcohol disclaimer) are not in the bundle.
- Long-session bot detection or rate limits: none seen in ~25 mutations over ~20 min at ≥2 s pacing; keep one product at a time, ≥2 s between cart clicks.
- Slug-rename frequency (slug is generated from name + DisplayUnit; no rename observed).
- First-add `suggestedQuantity`: the code adds `suggestedQuantity` instead of `+1` when a product supplies it; never seen live, which products carry it is unknown.
- Lazy-chunk popup texts not re-verified in the new bundle (build `946bb0fa…`): the row 14 "Changes to your cart / Some items are unavailable / Update Cart" popup, the cap modal button text "Okay, got it" (only seen live 2026-11-17; the string was found in code only for a payment-error module), the row 10 "Unavailable for delivery" banner, and the 1000 ms toast debounce (row 17). The `_app` provider's own strings (bulk popup, "We have revised your order to the maximum quantity allowed.", "Cart updated") were confirmed.
- HTTP status codes and redirects (soft 404 returning 200, 308 on trailing `/`, `?foo=bar` ignored) were not re-verified on 2026-11-25; only bodies were read.
- Which tags mark marketplace items with `includeTagDetails=true` was not re-checked 2026-11-25 (the `90` prefix and `inventoryType: MKP` were).
- Whether `stockOverride.storeBulkOrderThreshold` / `bulkRoutingThreshold` really cause the bulk slot push, and what `mrp8` means, are unverified [INFERENCE].

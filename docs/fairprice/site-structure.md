# FairPrice site structure for agents (experimental)

Status: **experimental research for a future RedMart vs FairPrice price comparison.** Nothing here changes the RedMart workflow in [AGENTS.md](../../AGENTS.md). No FairPrice cart procedure is approved; this page records what was observed so a later procedure can be designed on facts.

## 1. Scope and evidence

| Source | What | Date |
|---|---|---|
| Live relay session | OMP relay driving the user's signed-in Chrome on `www.fairprice.com.sg`: PDP, cart, checkout (read-only), network responses | observed 2026-11-17 |
| Reversible mutation tests | Add / plus / minus / delete on two baseline rows and one test row; baseline restored, verified after reload and two settled reads | observed 2026-11-17 |
| Unauthenticated `curl` | Product pages, `website-api.omni.fairprice.com.sg/api`, ~1 req/s, no cookies | observed 2026-11-17 |

Limits: one short session, one household store. Checkout was only read; nothing on it was clicked. Absence of a problem here is not proof of absence (see §8 on bot challenges). API paths are what the site's own JS calls; they are undocumented and may change (`buildId` changes on deploys).

API base: `https://website-api.omni.fairprice.com.sg/api` (below: `$API`).

## 2. Identity

| Identifier | Where | Stable? | Use |
|---|---|---|---|
| **Article id** = `clientItemId` = `metaData.SAPMaterialNumber` (string, e.g. `13294464`) | API, cart `product.clientItemId`, slug suffix | Yes | **Primary key.** `q=<articleId>` returns exactly that product |
| Barcode (EAN) `barcodes[]` | API | Yes | Optional secondary key; `q=<ean>` is also an exact lookup |
| Internal product `id` (int, e.g. `1637106`) | API `id`, cart row `id` / `data-testid=cartProduct` element id, `offers[].rule.buy` keys, ld+json `sku` | Yes, but opaque | Join key for cart rows and offer rules only. Not searchable (`q=` returns 0), not usable in URLs |
| Slug `<name>-<display-unit>-<articleId>` | URL, API `slug` | **No** | Lookup key for the page; generated from name + DisplayUnit, changes on rename |

Product URL behaviour (curl, observed 2026-11-17):

| URL `/product/<X>` | Result |
|---|---|
| Exact current slug | HTTP 200, real page, relative `<link rel=canonical>` |
| Right article-id suffix, wrong text | **HTTP 200 soft 404** (`<title>Error 404 \| FairPrice Singapore`, no canonical) |
| Article id only, or internal id only | Soft 404 for most products |
| Exact slug + trailing `/` | 308 to slug without slash |
| Exact slug + `?foo=bar` | Real page; query ignored; canonical has no query |

- The trailing number is **not** used for lookup; the slug is matched exactly. A bad URL still returns 200, so detect 404 by title and missing canonical, never by status.
- **Numeric-slug exception** (verified 2026-11-17): some products have a purely numeric slug equal to the article id, e.g. `/product/13065350` (a fresh-eggs product) renders with canonical `/product/13065350`. The site's own cart "Your Past Purchases" carousel links such products numerically. For most products `/product/<articleId>` is a soft 404. So the URL is valid only with the exact current slug: **always resolve the slug through the API** (`q=<articleId>`), never construct it.
- Detail by slug: `GET $API/layout/product?url=<exact slug>&storeId=<id>&orderType=DELIVERY&includeTagDetails=true`. Wrong slug returns HTTP 200 with an empty value.

Recommended catalog fields (mirrors RedMart's pair, but one key):

```yaml
fairprice_article_id: "13294464"   # primary key, string
barcode: "8888030324417"           # optional
canonical_url: https://www.fairprice.com.sg/product/<slug>   # slug captured from API at match time
```

Canonical URL rule: build `https://www.fairprice.com.sg/product/` + `slug` from `GET $API/product/v2?q=<articleId>&pageType=search&orderType=DELIVERY&storeId=<id>` immediately before use. After navigating, verify identity from the article id (cart row link slug suffix or `GET $API/cart` `clientItemId`), not the URL alone.

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

- Promo badges on the PDP: "Offer" badge, offer buttons ("Spend $70, get $7 off — Ends in …", "Buy 3, get 5% off Till …", "Any 2 for $17.95"). The **shelf price shown is the mrp**; the bundle/promo price is applied in the cart.
- **No per-product delivery date.** RedMart's `Product Availability` date chips (AGENTS.md **Product Choice And Availability**, "too-late" rule) have no PDP equivalent. Availability signals instead: API `storeSpecificData[0].stock` / `stockScale` (`inStock`, `low`, `oos`), the PDP out-of-stock state, and the cart's per-seller "Earliest slot" (cart-level, not per product). A "within two days" rule cannot be evaluated per product; it can only be read per seller at the cart.

## 4. Confirming add / change / remove

| Action | Where | Network | Confirmation |
|---|---|---|---|
| PDP Add / plus / minus | PDP main control | `POST $API/cart` → 200; `data.cart.changes[{id, product.clientItemId, oldQ, newQ}]` + `data.cart.items[]` (`id` internal, `q` **string**) | Stepper value changed within ~0.5 s; `changes[0]` oldQ→newQ matches |
| Cart-row plus / minus | `/cart` row | `POST $API/checkout` (not `/api/cart`); response `data` = `cart, slot, payment, sellersTimeSlots, couponDiscounts, corpBillings, errors`; `data.cart.items` carries new `q` | Row stepper value; header counts |
| Cart-row delete | `/cart` row | same cart mutation path | Row disappears **immediately, no confirmation dialog** |

Unit checksums (both count **units**, not rows): header `[data-testid=cart-button]` text `<units> Cart`, and cart heading `Shopping cart <N> items`. Observed together: baseline 4, eggs add → 5, cart-row plus → 6, delete → 4. Same role as the RedMart "header count is a unit checksum only" rule; neither proves contents.

Procedure that held up (observed 2026-11-17): click once, condition-wait for the expected stepper value (not a fixed sleep), then reread once more; reload at the end and take two settled row reads.

**Silent no-op observed.** First cart-row plus click did nothing because the click coordinates were measured **during a smooth scroll** (sticky header and scroll shifted the control). Re-measuring after the scroll settled and hit-testing with `document.elementFromPoint(x, y)` (confirm the hit target is inside the intended row's `counter-wrapper`) made the next click succeed. This is a coordinate/hit-test cause, **not** a stock or challenge signal. It maps onto the AGENTS.md **silent no-op rule**: reread, retry once with a fresh control; if still no change, stop all cart changes, wait, reload, retry once, else hand over. Do not click the same control repeatedly. Use real clicks, not DOM `click()`.

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

Read API: `GET $API/cart?isCheckerEnabled=true&isOutOfStockEnabled=true&isSellerCheckerEnabled=true&orderType=DELIVERY` → `data.cart.items[] {id, q, mrp, discount, isFree, isChecked, isMKP, product{clientItemId, slug, name, brand, metaData.DisplayUnit}}`, `amounts`, `appliedOffers`, `sellersItems`, `storeId`. Preferred over DOM for baseline/audit (exact article ids and quantities, no row parsing). Loading `/cart` itself fires `POST $API/checkout` (price preview).

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

- `final_price` (search only) is **unreliable**: usually equals mrp even with a promo, and was 0 for some items depending on the query. `has_stock` is unreliable (true with `stock:0`). Use `mrp` + `offers[]`, and `stock > 0` / `stockScale != "oos"`.
- Promo prices apply in the cart; the PDP shows mrp. Verify offer groups in the cart rows (`offer-link-<id>`, "Save $x") before trusting a bundle price. Check `validFrom <= now <= validTill`.
- `storeId`: from `serviceable-area?pincode=<delivery postal code>` (do not store the postal code in outputs). The household resolves to **165**; omitting `storeId` also yields 165; unknown ids return `count:0`. Tested 165 vs 45 (observed 2026-11-17): **mrp, discount and offers identical; `stock` and ranking differ**. [INFERENCE] store-specific pricing may exist for some items; none seen.
- Pack size is free text `metaData.DisplayUnit` with inconsistent units/case (`300g`, `500 G`, `1 KG`, `1000 G`, `4 S`, `30 per pack`, `24 x 200ml (CTN)`, `5 x 125ml`). Normalise to g/kg/ml/L, `N x size`, count before computing per-100g/ml. `metaData["SAP Product Name"]` sometimes holds true weights (`30S X 1.65KG` where display says `30 per pack`) — fallback only. Produce, meat and fish are fixed-size packs at fixed prices.
- `soldByWeight` was 0 on all 260 sampled products; `hasVariants` 0, `variants[]` empty (flavour groups are separate products tied by shared promo ids). Sold-by-weight **not observed**; [INFERENCE] may exist for counter items, so flag `soldByWeight == 1` as unsupported rather than guess.
- No separate member / card price seen; `metaData."LinkPoint Eligible"` only.

## 8. RedMart vs FairPrice

| Topic | RedMart (Lazada SG) | FairPrice |
|---|---|---|
| Item identity | `i<item>-s<sku>` pair in URL, verified from final URL | `clientItemId`; slug is a mutable lookup key; resolve via API |
| URL validity | Canonical product URL | Exact slug only; wrong slug = HTTP 200 soft 404; numeric-slug exception |
| Page title | `h1` semantic heading | No `h1`; styled span + `brandDetails` anchor |
| Main control scope | `#module_redmart_add_to_cart` | Ancestor of `main [data-testid=brandDetails]`, excluding carousel/`compact-product`/`productCollection` |
| Out-of-stock | Corroborated unavailability, then next rank | "Out of stock online" + "Find similar"; API `stockScale oos` |
| Availability / delivery | Per-product `Product Availability` date chips; two-day rule | None per product; per-seller "Earliest slot" in cart, slot grid only at checkout |
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

- Seller-level bin (`cart-seller-bin-icon`) and `empty-cart-button` effects, confirmation behaviour, undo — not tested (and dangerous).
- Checkout continue flows (address, slot, payment, place order) — deliberately not exercised; behaviour of Apple/Google Pay buttons unknown.
- Promo bundles in the cart beyond what was observed (whether partial `Any 2` groups, mixed flavours or `BMIN` thresholds reprice rows as expected); `appliedOffers` semantics unverified.
- Sold-by-weight items and variants; loose-item pricing at checkout.
- Marketplace cart behaviour (extra delivery, per-seller fee) not exercised.
- Long-session bot detection or rate limits: unknown; pace like RedMart (one product at a time, ~2 s between cart clicks) until evidence says otherwise.
- Slug-rename frequency (slug is generated from name + DisplayUnit; no rename observed).

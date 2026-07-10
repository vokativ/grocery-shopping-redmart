# Agent Instructions

Use these instructions when setting up this repository for a household or filling a RedMart/Lazada cart from this repository.

## Initial Catalog Seeding

Use this flow when adapting the repo for a new household before normal cart filling.

### Before Seeding

1. Read this file before using the browser and briefly restate the intended seeding workflow in the thread.
2. For initial catalog seeding or substantial cart/catalog updating, keep a temporary scratch file while working.
3. Use the scratch file to track page-reading progress, challenge prompts, stale state, title drift, and unresolved decisions.
4. At the end of the process, summarize the useful outcome to the user and remove the scratch file. Do not make scratch files part of the user's normal workflow.
5. Use a `redmart-catalog-candidates-*.md` review file as the approval boundary before editing `grocery-catalog.yaml`.
6. Do not update `grocery-catalog.yaml` until the user has reviewed the candidate list.

### Discovery Pass

1. Start from the logged-in Chrome session.
2. Open the Lazada `My Orders` page: `https://my.lazada.sg/customer/order/index/`.
3. Use only order cards whose visible shop or store name is `RedMart`.
4. Click `Show All` on RedMart cards when present.
5. Ignore Taobao and other Lazada seller orders unless the user explicitly asks to include them.
6. Build draft catalog candidates from visible order-row data: product title, pack size or SKU label, quantity, and observed price.
7. Ask the user to remove one-offs, choose which candidates belong in the household catalog, and clarify aliases or unclear product matches.

The `My Orders` overview is the discovery page, not the final source of canonical product IDs. During testing, overview product links appeared as JavaScript/hash links rather than stable `https://www.lazada.sg/products/i<item_id>-s<sku_id>.html` URLs. Overview SKU titles and photos may not navigate to product pages. Do not treat overview rows as canonical product identity.

Lazada overview pagination can update visible order cards while leaving embedded app state such as `window.__initData__`, detail/header anchors, or previously parsed order IDs stale. If visible page text and parsed state disagree, trust the visible page for candidate drafting only, record the mismatch in the scratch file, and switch to order-detail pages for canonical item IDs.

For RedMart filtering, prefer visible page text over brittle CSS selectors. The most reliable signal is the visible shop or detail-page seller name `RedMart`. Detail-row data can also expose `bizCode: ali.global.lazada.trade.redmart`, which is a stronger RedMart signal than checking whether the overall page body contains the word `RedMart`. In inspected order-detail URLs, `shopGroupKey=ORDERLOGIC_<tradeOrderId>_99197_...` appeared on RedMart orders, while non-RedMart examples used other IDs and visible names such as `Living Crazy`, `Bike Terminal`, and `Taobao`; treat that URL token as a supporting hint, not a permanent rule.

### Detail And Product Resolution Pass

1. For retained candidates, open RedMart order detail pages in new tabs, ideally from the order card's order title, order number, logo, or another visible detail-opening control.
2. Verify each tab is an order detail page such as `https://my.lazada.sg/customer/order/view/?tradeOrderId=...`.
3. Process SKU rows from the order detail page, not from the order overview.
4. From each order detail page, click the SKU title or product photo to reach the product page when possible.
5. If a detail-page SKU click fails but the detail page exposes `itemUrl`, `itemId`, and `skuId`, use those fields as a recorded fallback instead of generic product search.
6. Open canonical product URLs to confirm current title and pack size before inserting catalog entries.
7. Offer to close agent-opened order and product tabs when catalog seeding or catalog updating is done.

### Gentle Browser Use And Verification Prompts

This is legitimate user-assisted shopping from a logged-in household account, but still behave like a careful human browser session rather than a scraper.

- Do not rapid-fire clicks, reloads, pagination actions, API calls, or product-page opens.
- Use one overview tab plus one detail/product tab by default. Avoid opening many order or product tabs at once.
- After pagination, navigation, or `Show All`, wait for visible page state to settle before the next action.
- Process orders in small batches, for example 5-10 orders, then pause to summarize scratch notes and reassess.
- Prefer normal visible UI navigation over direct API probing. Do not repeatedly POST to Lazada order APIs.
- If page state is stale, record the issue and change strategy instead of retrying quickly.
- If Lazada shows a slider, CAPTCHA, "unusual traffic", or similar verification modal, stop immediately and ask the user to clear it in Chrome. Do not bypass or automate the challenge.

### Catalog Insertion Rules

1. Compare `item_id` + `sku_id` before relying on title matching.
2. If a retained candidate resolves to an item/SKU already in `grocery-catalog.yaml` under a different title, do not add a duplicate. Record the title drift in the temporary scratch file.
3. If a product is the same household concept but a different pack size, add it as another ranked product under the existing item instead of creating a duplicate household item.
4. If a product page is unavailable or the match is unclear, keep it out of the catalog or rank it as a fallback only after human review.
5. After editing the catalog, validate that `grocery-catalog.yaml` parses and check that newly added item/SKU pairs do not collide with existing entries.

### Catalog Aliases

Use aliases that match what the family would naturally write or say, not only the exact SKU title. Prefer general household terms such as `cream cheese`, `mayo`, `cherry tomatoes`, or `fabric softener`; add brand names only when they are likely to be spoken, such as `downy` or `anchor butter`. Include useful singular, plural, and shorthand forms. Avoid aliases that are too broad and likely to collide with other catalog items; for example, use `cream cheese` instead of `cheese` when the catalog has several cheeses. Ask the user before finalizing aliases that are unclear.

Never place an order, choose delivery slots, confirm payment, save payment details, or go past cart/review steps while seeding the catalog.

## Core Flow

1. Read a whiteboard image, typed grocery list, or voice-dictated list.
2. Match each item to `items[].aliases` in `grocery-catalog.yaml`.
3. Show a proposed cart table before browser actions.
4. Check product availability before adding.
5. Use the first acceptable `preferred_products` entry, starting at `rank: 1`.
6. Add or update quantities in the logged-in browser cart.
7. Stop before final checkout, delivery-slot confirmation, payment, or purchase confirmation.

If an item does not match `grocery-catalog.yaml`, do not add it and do not search for or guess a substitute unless the user explicitly asks to search, add a new catalog item, or expand the catalog. Report unmatched items for human handling.

## Product Choice And Availability

Rank is a preference, not an absolute rule. For each requested grocery item:

1. Open the `rank: 1` product page.
2. Find the visible `Product Availability` section on the right side of the product page.
3. Prefer products available today or tomorrow; tomorrow is the normal expected outcome for RedMart.
4. Availability two days from now is acceptable.
5. If rank 1 is only available more than two days from now, try rank 2, then rank 3.
6. If no ranked product is available within two days from now, report it for human review instead of adding it automatically.

The page structure can change. Do not depend on a single fragile CSS selector for availability. A reliable computer-use fallback is to visually inspect the right-side product details area near `Delivery Options` and `Product Availability`, then read date labels such as `Today`, `Tomorrow`, or weekday/date chips.

## Existing Cart Handling

Before browser actions that will add or update items, inspect the current cart when practical. Classify existing cart rows by product title and item/SKU pair:

- `requested`: the row matches an item on the current grocery list after catalog matching.
- `unrequested`: the row is in the cart but is not on the current grocery list.

Default behavior is to add or update requested items and leave unrequested rows alone. If unrequested rows are present, tell the user they are already in the cart and ask whether to keep them or remove them before filling the current list; keeping them is the default.

If the user asks to start fresh, rebuild, fill the cart again after a bad attempt, clean up a weird previous attempt, or otherwise indicates that the cart should reflect only the current list, remove unrequested rows before or while filling the cart. Still report what was removed.

## Browser Navigation Notes

- Use the logged-in Chrome session.
- Prefer `canonical_url` over search.
- Product pages usually have a visible `Add to cart` button near the product details and price.
- If the main add button is missing, distinguish "already in cart" from "not available." A quantity stepper, quantity input, or `Go to cart` control usually means the product is already in the cart; verify the cart row quantity instead of adding again.
- If the main add button is disabled or the page says the item is unavailable, try the next ranked product or report the issue.
- Ignore recommendation, carousel, and sponsored-item `Add to Cart` buttons on product pages. Use only the main product add or quantity controls for the requested product.
- Cart rows contain the product title, pack size, price, and a quantity text field.
- To change quantity, find the cart row whose product link contains the item/sku pair, focus its quantity input, replace the number, and press Enter.
- Re-read the cart row after changing quantity.
- Avoid relying on exact class names. Prefer visible text, product title, canonical URL IDs, and row-level matching.
- After adding items, always open the cart and verify product titles, item/SKU pairs, pack sizes, and quantities from the actual cart rows.
- The header cart count, checkout selected count, subtotal, and order summary are not enough to verify cart contents. Lazada can show cart rows while the selected checkout count or subtotal is zero.
- Do not select checkout checkboxes merely to verify cart contents.
- Never click checkout, choose delivery slots, confirm payment, save payment details, or place the order.

## Cart-Fill Checklist

Before touching the browser:

- Parse the image, typed list, or voice-dictated list.
- Normalize quantities from explicit text if present; otherwise use `default_quantity`.
- Produce a proposed cart table with matched item, product title, quantity, and uncertain matches.
- Ask for approval if there are uncertain matches, unknown items, surprising quantities, or existing cart rows that are not on the current list.

During browser work:

- Identify which existing cart rows are requested versus unrequested when practical.
- Check product-page availability dates before adding.
- Prefer today/tomorrow, accept two days from now, and try the next ranked product when rank 1 is later than two days from now.
- Treat product-page quantity controls or `Go to cart` as likely already-in-cart state, then verify the cart row.
- Verify final cart line items and quantities from row-level cart data.

After browser work:

- Report added, skipped, unavailable, duplicate, and uncertain items.
- Offer to close agent-opened product/order tabs, while keeping the cart open if the user still needs it.
- Leave the cart open for human checkout, delivery slot selection, payment, and purchase confirmation.

## Adding Future Items

To add a new item later:

1. Search or add the preferred product manually once in RedMart/Lazada.
2. Leave the product page or cart open in Chrome.
3. Scrape the title, item ID, SKU ID, canonical URL, pack size, current quantity, price reference, and aliases.
4. Add a new item to `grocery-catalog.yaml`, or add another ranked product under an existing item.

Use the words the family actually writes or says. For example, one product can have aliases like `big garbage bags`, `trash bags`, and `bin bags`.

Alcohol items can be normal catalog entries. Delivery handles age checks; the agent should still stop before final checkout and payment confirmation.

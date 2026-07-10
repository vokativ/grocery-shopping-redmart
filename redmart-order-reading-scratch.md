# RedMart Order Reading Scratch

Started: 2026-07-10

Goal: Review Lazada/RedMart grocery orders from the past three months, draft catalog additions, and record page-reading notes and challenges before updating `grocery-catalog.yaml`.

Date window: 2026-04-10 through 2026-07-10, inclusive.

## Process Notes

- Use the logged-in Chrome session and Lazada My Orders page.
- Include only order cards or detail pages whose visible shop/store name is `RedMart`.
- Draft additions from visible order-row data first: title, pack size/SKU label, quantity, and observed price.
- Open detail/product pages only when needed for canonical product IDs, SKU IDs, or unclear matches.
- Do not place orders, interact with checkout, delivery slots, payment, or purchase confirmation.

## Reading Log

- 2026-07-10: Created scratch file before browser inspection.
- 2026-07-10: Opened `https://my.lazada.sg/customer/order/index/` in the logged-in Chrome session.
- 2026-07-10: Expanded visible `Show All` controls and harvested RedMart rows from recent order-list pages 1-5.
- 2026-07-10: Compared visible titles against existing `grocery-catalog.yaml` preferred product titles.
- 2026-07-10: Wrote the review list to `redmart-catalog-candidates-2026-07-10.md`.

## Challenges / Decisions

- Chrome's structured DOM snapshot failed on the Lazada orders page with an extension-side snapshot error. Switched to bounded read-only page evaluation and visual checks instead of relying on `domSnapshot()`.
- Lazada overview pagination changes the visible order cards, but the embedded `window.__initData__` script can remain stale after page changes. Page 2 showed current visible products while detail/header anchors still pointed at page-1 orders.
- The order-management app uses `/customer/api/sync/order-list` and `/customer/api/async/order-list` with `ultronVersion: "2.0"`. Direct GET to the sync endpoint returns an error page; POST is required.
- Detail pages expose complete `orderItem_*` state with RedMart `bizCode`, `itemId`, `skuId`, `itemUrl`, title, price, and quantity, including rows hidden behind `Show All`.
- For some overview pages, visible rows can be read but canonical order IDs/details are not exposed in the live DOM, and JavaScript URL execution is blocked by browser policy, so do not bypass with bookmarklet-style actions.

## Draft Catalog Candidates

- Visible RedMart rows harvested: 217.
- Unique visible product titles after excluding free samples: 135.
- Exact product-title matches already present in `grocery-catalog.yaml`: 27.
- Exact-title-new candidates for user review: 108.
- Full review list: `redmart-catalog-candidates-2026-07-10.md`.
- Do not update `grocery-catalog.yaml` until the user confirms which of the 108 candidates to include/exclude.

## Canonical URL Resolution Pass

- 2026-07-10: User edited `redmart-catalog-candidates-2026-07-10.md` to remove one-off products. The retained candidate table now has 58 rows.
- Exact title matching is not enough for catalog insertion because RedMart/Lazada titles can drift between the order overview, order detail page, product URL, and our catalog wording.
- Duplicate detection for this pass should prefer canonical `item_id` + `sku_id` when available. If a retained candidate resolves to a product already in `grocery-catalog.yaml` under another title, skip adding it as a new catalog item and record the title drift.
- Plan for this pass: resolve retained rows through RedMart order detail data or order-list search, open product URLs where useful to confirm current titles, then add only genuinely new catalog entries.
- 2026-07-10: User clarified that the SKU/product title in the order row can be clicked to open the product page. This is preferable to generic Lazada product search because it follows the actual product from the order, even when the DOM only shows a hash link or text-like title.
- Re-read `AGENTS.md` reminder: prefer visible RedMart rows, click `Show All` when present, open product pages only as needed for canonical URLs/item IDs/SKU IDs, and never touch checkout/payment.
- 2026-07-10: Important correction from user: the clickable SKU/product title is on the order detail page, not reliably on the order overview. The right workflow is to open each RedMart order detail in a new tab, then click the product/SKU title from the detail page to reach the product page.
- 2026-07-10: Screenshot revealed a Lazada "unusual traffic" slider verification modal overlaying the My Orders page. This likely explains why overview clicks and row clicks appeared inert in automation. Do not bypass it; ask the user to clear the verification in Chrome before continuing with order-detail tab processing.
- 2026-07-10: User cleared the slider verification and confirmed to continue.
- 2026-07-10: Re-tested the overview after the slider was cleared. Pagination can be changed with keyboard activation, and the visible order rows update, but the embedded `window.__initData__` order IDs remained from page 1 after moving to page 2. The header `My Last Order` links also stayed limited to the newest three orders.
- 2026-07-10: Overview order-card clicks are still not a reliable way to reach detail pages. Clicking the visible RedMart store/logo area opened the RedMart storefront; clicking the status area did nothing; clicking overview SKU text did not navigate. This confirms the user correction: product/SKU clicks should be attempted from order detail pages, not from the overview.
- 2026-07-10: Parsed known order-detail pages directly by `tradeOrderId` and filtered rows to `bizCode: ali.global.lazada.trade.redmart`. Detail pages expose canonical `itemUrl`, `itemId`, `skuId`, title, price, and quantity without needing generic product search.
- 2026-07-10: Detail-resolved retained candidates added to `grocery-catalog.yaml`: `RedMart Cherry Tomato`, `Supervalu Real Mayonnaise Free Range Eggs`, `Remedy Sodaly Yuzu Lemon - 4 x 250ml`, `Dragonfruits 2s`, `Downy Sunrise Fresh Concentrate Fabric Softener 3.5L`, and `Anchor Unsalted Pure Butter 227G`.
- 2026-07-10: `Pepsi Zero Sugar Cola Soda (4 x 320ML)` was added as `rank: 2` under existing `pepsi_black` instead of creating a duplicate household item.
- 2026-07-10: Skipped `RedMart Easy Peel Mandarin` because the order detail title is `RedMart Easy Peel Mandarin Orange`, and the same item/SKU pair already exists in the catalog under `oranges`.
- 2026-07-10: Opened the canonical product URLs for the seven added product records. Current product-page titles matched the order-detail titles for cherry tomatoes, Supervalu mayonnaise, Pepsi Zero 4-pack, Remedy Yuzu, dragonfruit, Downy fabric softener, and Anchor butter.
- 2026-07-10: Remaining retained candidates still need order-detail IDs or a better Lazada order-list API capture. Generic product search can resolve many of them, but that is less trustworthy than following the purchased SKU from the order detail page, especially for title drift and pack-size variants.

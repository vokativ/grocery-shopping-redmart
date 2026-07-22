# Agent Instructions

Use these instructions when setting up this repository for a household or filling a RedMart/Lazada cart from this repository.

## Browser Surface, Sign-In, And Remote

Use the ChatGPT desktop app's built-in browser by default on Mac and Windows. It has a browser profile and login state separate from Chrome. All browser work for this repository, including cart inspection, availability checks, adding or removing items, catalog discovery, and fallback-browser preflights, must be visibly shown to the user through the ChatGPT desktop app. Do not perform shopping browser work in a hidden, background-only, or headless surface. Before the first navigation, expose the active browser or Computer Use view in the desktop app and keep it visible for the browser portion of the task so a person at the computer can follow progress or help with sign-in, permissions, stale state, or challenges. If the user begins interacting with the visible browser, pause browser automation, let them finish, and obtain a fresh settled page read before resuming. If a browser surface cannot be presented visibly in the ChatGPT desktop app, stop and ask the user instead of continuing invisibly. The same rules apply when the user starts or continues the task through Remote: browser actions run on the connected host, which must stay awake and online. Keep a Windows host unlocked while it performs browser work.

1. Use the built-in browser's visibility control to show the browser in the ChatGPT desktop app. Treat inability to expose the visible browser as a blocker. Then open Lazada/RedMart and let visible page state settle.
2. When ChatGPT asks to access a new website, show the request to the user and have them verify the hostname before approving it. Lazada/RedMart and the loopback catalog review URL are expected for this workflow. For a verified Lazada/RedMart hostname, recommend the persistent or `Always allow` option when offered so later runs do not prompt again. Do not recommend permanent access for an unexpected hostname.
3. On the first household run, or whenever the built-in browser has no retained Lazada session, perform the `First-Time Sign-In And Signed-Out Recovery` flow below. Never ask the user to paste a password, OTP, or other credential into chat.
4. Reuse the built-in browser's signed-in state. A fresh agent-controlled tab in the same built-in browser should retain that state unless the user logged out, the site expired it, or browser data was cleared.
5. If a controlled tab becomes stale or disappears, obtain a fresh tab from the same built-in browser instead of reselecting a browser or claiming the user is signed out.
6. Use Chrome and its control extension only when the user explicitly chooses Chrome, needs an existing Chrome profile, the built-in browser is unavailable, the signed-out recovery flow below reaches the Chrome fallback, or another agent lacks an equivalent internal browser. Do not silently switch surfaces; announce every fallback, because Chrome and the built-in browser have separate sessions.
7. Distinguish ChatGPT's per-website access request from an operating-system firewall alert. Never disable the firewall or open a public port. The catalog review helper binds only to `127.0.0.1`; if an unexpected OS firewall alert appears, stop and ask the user to verify the named process and requested network scope.

### Deterministic Browser Selection

Treat these as three separate facts: which browser applications are installed, which browser-control surfaces ChatGPT can currently use, and which browser profile is visibly signed in to Lazada. Do not infer one from another.

1. For Lazada/RedMart, explicitly select ChatGPT's in-app browser surface (`iab`) when the Browser plugin is available. Do not use automatic or URL-based browser selection such as a default-browser or `getForUrl` choice; it can select an external extension surface instead.
2. Before navigating, verify that the selected surface identifies itself as the in-app browser with type `iab`. If it does not, stop instead of continuing in the unexpected browser.
3. If the in-app browser is unavailable, report that exact condition and follow the deterministic fallback preflight in `First-Time Sign-In And Signed-Out Recovery` unless the user explicitly required the in-app browser only. Never launch the operating-system default browser as an implicit fallback.
4. A browser-control surface labeled `Chrome` or `extension` is not by itself proof that the visible application is Google Chrome or that the intended profile is active. For a Chrome-extension fallback, verify that the visible application is Google Chrome and that the intended Chrome profile has the official ChatGPT extension enabled. If Edge, Vivaldi, Firefox, Safari, or an uncertain application appears, stop and ask the user rather than proceeding.
5. The official Chrome-extension path is for Google Chrome. Use Edge, Firefox, Vivaldi, or Safari only when the user explicitly selects that browser, or for the read-only signed-in fallback preflight below, and Computer Use is available. Target the exact application rather than opening a URL through the system default-browser handler.
6. It is acceptable to perform read-only installation discovery. Do not inspect cookies, local storage, password stores, browser profile databases, or saved credentials to determine whether a browser is signed in. After choosing one explicit browser/profile, open Lazada there, let the page settle, and determine authentication only from visible page state.
7. Before using any selected browser surface, make its live browser or Computer Use view visible in the ChatGPT desktop app. Keep cart filling visible from the first cart read through final row-level verification. Do not continue on a surface that can be controlled but cannot be shown to the user.

On Windows, check these explicit executable locations with a read-only existence check before launching an external browser. Use the resolved executable path, not a bare URL or the default-browser handler:

- Google Chrome: `%ProgramFiles%\Google\Chrome\Application\chrome.exe`, `%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe`, then `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`.
- Microsoft Edge: `%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe`, then `%ProgramFiles%\Microsoft\Edge\Application\msedge.exe`.
- Mozilla Firefox: `%ProgramFiles%\Mozilla Firefox\firefox.exe`, then `%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe`.
- Vivaldi: `%ProgramFiles%\Vivaldi\Application\vivaldi.exe`, then `%LOCALAPPDATA%\Vivaldi\Application\vivaldi.exe`.

On macOS, resolve the requested application by its exact app name or bundle before launching it; for example, use a read-only check such as `open -Ra "<app name>"`. Standard application names and locations are:

- Safari: `Safari`, normally `/Applications/Safari.app`.
- Google Chrome: `Google Chrome`, normally `/Applications/Google Chrome.app`.
- Mozilla Firefox: `Firefox`, normally `/Applications/Firefox.app`.
- Vivaldi: `Vivaldi`, normally `/Applications/Vivaldi.app`.
- Microsoft Edge: `Microsoft Edge`, normally `/Applications/Microsoft Edge.app`.

Also check the user's `~/Applications` directory on macOS when the system-wide location is absent. Once resolved, use the exact application name or path. Do not substitute Safari merely because it is the macOS default, and do not substitute Edge merely because it is the Windows default.

### First-Time Sign-In And Signed-Out Recovery

The built-in browser is the primary household browser. Its separate profile is intended to retain the Lazada session between runs; no repository marker, username file, cookie export, or password file is needed.

For the first household run:

1. Explicitly select the built-in `iab` surface, make it visible, and open `https://cart.lazada.sg/cart`.
2. Let the page settle, then read it a second time before deciding whether it is signed out. Treat an explicit blocking login gate as authoritative; do not rely on an early header `login` link alone.
3. If sign-in is required, keep the built-in browser visible and ask the user to sign in directly there. Tell them not to send a password, OTP, passkey, or other credential through chat and ask them to say when the browser is ready.
4. After the user returns, verify visible signed-in evidence such as the account name or real cart rows, then continue. Reuse this built-in browser profile on later runs and do not clear its browser data as part of normal cleanup.

For a later run where the built-in browser is unavailable or remains at an explicit login gate after two settled reads:

1. If the user explicitly requested the built-in browser only, keep it visible and ask them to sign in there; do not switch surfaces.
2. Otherwise, announce that a read-only fallback preflight is starting. Trying another browser for visible Lazada authentication is allowed, but do not add, remove, or change cart rows during the preflight.
3. Try one exact browser at a time in this order:
   - Windows: verified Google Chrome with the official ChatGPT extension, then Microsoft Edge, Firefox, and Vivaldi through Computer Use.
   - macOS: verified Google Chrome with the official ChatGPT extension, then Safari, Firefox, Vivaldi, and Microsoft Edge through Computer Use.
4. Skip browsers that are not installed, not controllable, or not already open/launchable under current permissions. Do not use the default-browser handler, guess a profile, or inspect cookies, local storage, credential stores, or browser profile files.
5. In each candidate browser, open the Lazada cart, let it settle, and determine sign-in only from visible page state. If it is signed out, leave it unchanged and continue to the next candidate.
6. When the first visibly signed-in browser is found, tell the user exactly which application/profile surface will be used. If the original cart request already authorized cart changes and the user did not forbid fallback, continue there; otherwise wait for approval before mutating the cart.
7. If no browser is visibly signed in, return to the visible built-in browser when available and ask the user to complete sign-in there. A password, OTP, CAPTCHA, passkey, or unusual-traffic challenge always requires the user.

## Catalog Seeding And Updating

Use this flow both when adapting the repo for a new household and when adding products from a later RedMart order. Both paths use the same candidate JSON, reusable HTML review page, approval payload, canonical-product resolution, and catalog validation.

### Choose The Entry Point

- **Initial seeding:** review a useful batch of recent RedMart orders to establish the household catalog.
- **Incremental update:** when the user asks to add products from the last/recent order, inspect only the order or small order range needed for that request. Compare candidates with `grocery-catalog.yaml` early so the review page focuses on genuinely new household items, new pack sizes, aliases that need adding, and possible title drift.

Do not invent a separate update UI or bypass review just because the catalog already exists. A substantial incremental update uses the same approval boundary as initial seeding. For a single product that the user has already selected and left open, the smaller `Adding Future Items` flow remains appropriate.

### Before Catalog Work

1. Read this file before using the browser and briefly restate whether this is initial seeding or an incremental update.
2. For initial catalog seeding or substantial cart/catalog updating, keep a temporary scratch file while working.
3. Use the scratch file to track page-reading progress, challenge prompts, stale state, title drift, and unresolved decisions.
4. At the end of the process, summarize the useful outcome to the user and remove the scratch file. Do not make scratch files part of the user's normal workflow.
5. For initial seeding or substantial catalog updates, use the reusable HTML review template as the approval boundary before editing `grocery-catalog.yaml`.
6. Do not manually edit or reinvent `templates/redmart-catalog-review-template.html` during normal seeding or updating. Prepare candidate JSON in the shape shown by `examples/redmart-catalog-review-candidates.sample.json`, then render the temporary page with `tools/render-catalog-review.mjs`.
7. Ask the user to review the page in the active controlled browser and click `Approve N products`.
8. After approval, read the approved payload from the open page's `#catalog-review-approved-payload` field before editing `grocery-catalog.yaml`.
9. Do not update `grocery-catalog.yaml` until the user has approved the HTML review page.
10. After reading the payload, stop the temporary loopback review server, offer to close the review tab, and remove the temporary per-run review page unless the user asks to keep it.

### Discovery Pass

1. Start from the signed-in built-in browser session on the active desktop or Remote host.
2. Open the Lazada `My Orders` page: `https://my.lazada.sg/customer/order/index/`.
3. Use only order cards whose visible shop or store name is `RedMart`.
4. Click `Show All` on RedMart cards when present.
5. Ignore Taobao and other Lazada seller orders unless the user explicitly asks to include them.
6. Build draft catalog candidates from visible order-row data: product title, pack size or SKU label, quantity, and observed price.
7. Ask the user to remove one-offs, choose which candidates belong in the household catalog, and clarify aliases or unclear product matches.

For an incremental update from the last/recent order:

1. Start with the specific order the user named, or the newest visible RedMart order when they said `last order`.
2. Draft candidates only from that small scope; do not rescan the household's full history unless the user asks.
3. Compare visible candidates with existing catalog entries before rendering the review page. Suppress exact existing item/SKU pairs unless they reveal title drift or useful alias/quantity changes that need review.
4. Put new pack sizes under the existing household concept when appropriate, and surface genuinely new concepts as new-item candidates.
5. Set `source.kind` to a descriptive value such as `redmart-order-update` and record only the minimum non-sensitive order context needed in temporary notes.
6. Continue through the same HTML approval, detail/product resolution, insertion, validation, and cleanup steps below.

The `My Orders` overview is the discovery page, not the final source of canonical product IDs. During testing, overview product links appeared as JavaScript/hash links rather than stable `https://www.lazada.sg/products/i<item_id>-s<sku_id>.html` URLs. Overview SKU titles and photos may not navigate to product pages. Do not treat overview rows as canonical product identity.

Lazada overview pagination can update visible order cards while leaving embedded app state such as `window.__initData__`, detail/header anchors, or previously parsed order IDs stale. If visible page text and parsed state disagree, trust the visible page for candidate drafting only, record the mismatch in the scratch file, and switch to order-detail pages for canonical item IDs.

For RedMart filtering, prefer visible page text over brittle CSS selectors. The most reliable signal is the visible shop or detail-page seller name `RedMart`. Detail-row data can also expose `bizCode: ali.global.lazada.trade.redmart`, which is a stronger RedMart signal than checking whether the overall page body contains the word `RedMart`. In inspected order-detail URLs, `shopGroupKey=ORDERLOGIC_<tradeOrderId>_99197_...` appeared on RedMart orders, while non-RedMart examples used other IDs and visible names such as `Living Crazy`, `Bike Terminal`, and `Taobao`; treat that URL token as a supporting hint, not a permanent rule.

### Review Page Generation

After drafting candidates, prepare candidate JSON using `examples/redmart-catalog-review-candidates.sample.json` as the structure reference. Include `review_schema_version`, `source`, and a `candidates` array.

For each candidate, include a stable `candidate_id`, `title`, and any available `pack_size`, `observed_price_sgd`, `observed_quantity`, `usual_quantity`, `family_words`, `attention_tag`, and `notes`. Use `include: true` by default unless there is a clear reason to start an item as not included.

Render the temporary review page with the provided tool:

```bash
node tools/render-catalog-review.mjs --input <candidate-json> --output redmart-catalog-review-<date>.html
```

The renderer uses `templates/redmart-catalog-review-template.html`. Do not hand-edit the reusable template or create a one-off review UI unless the user explicitly asks for a template change.

Start the temporary loopback-only review server in a background/helper process:

```bash
node tools/serve-catalog-review.mjs --file redmart-catalog-review-<date>.html
```

Record the process and printed `http://127.0.0.1:<port>/` URL in the scratch file. Open that URL in the built-in browser; do not replace `127.0.0.1` with `0.0.0.0`, a LAN address, or a public host. The user may need to approve first-time website access for `127.0.0.1`. The page keeps all items included by default. The user can mark one-offs as `Do not include`, adjust `Usual quantity`, optionally edit `Family words`, and approve the included product count.

When the user returns after seeing `Approved. Go back to the agent to continue.`, read the approved JSON from the open page's `#catalog-review-approved-payload` field. Treat that approved payload as the approval boundary for catalog insertion. Keep the server running until the payload has been read, then stop it during cleanup even if later catalog resolution fails.

### Detail And Product Resolution Pass

1. For retained candidates, open RedMart order detail pages in new tabs, ideally from the order card's order title, order number, logo, or another visible detail-opening control.
2. Verify each tab is an order detail page such as `https://my.lazada.sg/customer/order/view/?tradeOrderId=...`.
3. Process SKU rows from the order detail page, not from the order overview.
4. From each order detail page, click the SKU title or product photo to reach the product page when possible.
5. If a detail-page SKU click fails but the detail page exposes `itemUrl`, `itemId`, and `skuId`, use those fields as a recorded fallback instead of generic product search.
6. Open canonical product URLs to confirm current title and pack size before inserting catalog entries.
7. Offer to close agent-opened order and product tabs when catalog seeding or catalog updating is done.

For HTML-reviewed catalog updates, treat the approved payload as the candidate source of truth. Do not re-add products the user marked as not included. Resolve canonical item IDs and SKU IDs only for approved included products, unless a skipped row is needed to detect a duplicate or title drift.

### Gentle Browser Use And Verification Prompts

This is legitimate user-assisted shopping from a logged-in household account, but still behave like a careful human browser session rather than a scraper.

- Do not rapid-fire clicks, reloads, pagination actions, API calls, or product-page opens.
- Use one overview tab plus one detail/product tab by default. Avoid opening many order or product tabs at once.
- After pagination, navigation, or `Show All`, wait for visible page state to settle before the next action.
- Process orders in small batches, for example 5-10 orders, then pause to summarize scratch notes and reassess.
- Prefer normal visible UI navigation over direct API probing. Do not repeatedly POST to Lazada order APIs.
- If page state is stale, record the issue and change strategy instead of retrying quickly.
- If Lazada shows a slider, CAPTCHA, "unusual traffic", or similar verification modal, stop immediately and ask the user to clear it in the visible active browser. Do not bypass or automate the challenge.

### Catalog Insertion Rules

1. Compare `item_id` + `sku_id` before relying on title matching.
2. If a retained candidate resolves to an item/SKU already in `grocery-catalog.yaml` under a different title, do not add a duplicate. Record the title drift in the temporary scratch file.
3. If a product is the same household concept but a different pack size, add it as another ranked product under the existing item instead of creating a duplicate household item.
4. If a product page is unavailable or the match is unclear, keep it out of the catalog or rank it as a fallback only after human review.
5. After editing the catalog, validate that `grocery-catalog.yaml` parses and check that newly added item/SKU pairs do not collide with existing entries.

### Catalog Aliases

Use aliases that match what the family would naturally write or say, not only the exact SKU title. Prefer general household terms such as `cream cheese`, `mayo`, `cherry tomatoes`, or `fabric softener`; add brand names only when they are likely to be spoken, such as `downy` or `anchor butter`. Include useful singular, plural, and shorthand forms. Avoid aliases that are too broad and likely to collide with other catalog items; for example, use `cream cheese` instead of `cheese` when the catalog has several cheeses. Ask the user before finalizing aliases that are unclear.

Never place an order, choose delivery slots, confirm payment, save payment details, or go past cart/review steps while seeding the catalog.

## Cart Request Interpretation

An explicit request such as `put these in my cart` authorizes adding the confidently matched catalog items after showing the proposed cart. Unmatched list entries do not block those matched items.

- Report unmatched entries clearly and leave them untouched unless the user explicitly asks to search or expand the catalog.
- Ask a blocking question only when uncertainty changes a matched product, quantity, or whether an existing cart row should be removed.
- If the user says `I'll handle the rest`, `I'll do the others`, or similar after unmatched entries were identified, default to: the user will handle the unmatched remainder and the agent should continue with the matched items.
- Stop the cart workflow only when the user explicitly says they will handle the whole cart, asks the agent not to proceed, or the browser cannot safely continue.

## Core Flow

1. Read a whiteboard image, typed grocery list, or voice-dictated list.
2. Match each item to `items[].aliases` in `grocery-catalog.yaml`.
3. Show a proposed cart table before browser actions.
4. Check product availability before adding.
5. Use the first acceptable `preferred_products` entry, starting at `rank: 1`.
6. Add or update quantities in the logged-in browser cart.
7. Stop before final checkout, delivery-slot confirmation, payment, or purchase confirmation.

If an item does not match `grocery-catalog.yaml`, do not add it and do not search for or guess a substitute unless the user explicitly asks to search, add a new catalog item, or expand the catalog. Report unmatched items for human handling, then continue with the confidently matched portion of an authorized cart request.

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

- Use the signed-in built-in browser by default, including for tasks initiated through Remote.
- Keep every browser surface visible through the ChatGPT desktop app throughout browser work, including external-browser fallbacks controlled through Computer Use. If a person at the computer takes control, pause automation and re-read the settled page before resuming.
- Treat desktop-app availability, Browser plugin availability, tab connection, website permission, and Lazada authentication as separate states. A missing or stale tab does not prove the built-in browser is unavailable or the account is signed out.
- Recover a missing tab by opening a fresh tab in the same built-in browser. If the whole browser surface is unavailable, check whether Browser is enabled for the user's app, plan, and workspace before offering Chrome as an explicit fallback.
- For an explicitly chosen Chrome fallback, treat Chrome installation, extension availability, profile selection, and Lazada authentication as separate states. Retry a lightweight extension connection once; if it still fails, ask the user to focus the correct Chrome profile rather than claiming they are signed out.
- After navigating to Lazada or RedMart, allow the visible page state to settle before deciding whether the account or cart is available. A header `login` link by itself is not authoritative because the outer Lazada shell may render before account and cart content.
- Before reporting sign-out, make a second settled read and look for an explicit blocking login gate. Account-name text, real cart rows, and row-level item/SKU links are stronger signed-in signals than an early shell link. If signals conflict, record stale state in scratch notes and re-read the same claimed tab rather than rapidly reloading or switching profiles.
- Prefer `canonical_url` over search.
- Product pages usually have a visible `Add to cart` button near the product details and price.
- If the main add button is missing, distinguish "already in cart" from "not available." A quantity stepper, quantity input, or `Go to cart` control usually means the product is already in the cart; verify the cart row quantity instead of adding again.
- If the main add button is disabled or the page says the item is unavailable, try the next ranked product or report the issue.
- Ignore recommendation, carousel, and sponsored-item `Add to Cart` buttons on product pages. Use only the main product add or quantity controls for the requested product.
- Cart rows contain the product title, pack size, price, and a quantity text field.
- To change quantity, find the cart row whose product link contains the item/sku pair, scope the quantity input to that exact row, replace the number, and press Enter. Never identify a cart quantity field by a global input index or `nth` position.
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
- Ask for approval if there are uncertain matches, surprising quantities, or existing cart rows that may need removal. Unknown items alone do not block confidently matched items; report the unknowns and continue when the original request already authorized cart filling.

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
2. Leave the product page or cart open in the active controlled browser.
3. Scrape the title, item ID, SKU ID, canonical URL, pack size, current quantity, price reference, and aliases.
4. Add a new item to `grocery-catalog.yaml`, or add another ranked product under an existing item.

Use the words the family actually writes or says. For example, one product can have aliases like `big garbage bags`, `trash bags`, and `bin bags`.

Alcohol items can be normal catalog entries. Delivery handles age checks; the agent should still stop before final checkout and payment confirmation.

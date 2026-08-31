# Agent Instructions

Use these instructions when setting up this repository for a household or filling a RedMart/Lazada cart from this repository.

## Model Selection And Harness Reporting

Before routine browser work, identify the execution harness and state the model and reasoning setting that its user-visible control or runtime metadata actually exposes.

- **ChatGPT Desktop:** read the model and reasoning control beneath the Codex composer. When the user has not chosen otherwise and the control offers it, use **5.6 Terra** with **Medium** reasoning for normal cart filling. This repository has two supervised everyday-cart runs with that setting and zero observed judgment errors.
- **Oh My Pi (OMP):** report the runtime model and reasoning setting when OMP exposes them. If either value is unavailable, say so and continue with the current setting; the missing ChatGPT Desktop composer is not a blocker. Do not claim that the Desktop Terra evidence applies to another model or harness.

Do not silently switch models or reasoning levels merely because a cart task has several browser steps. For catalog seeding, unresolved product identity, or another genuinely open-ended decision, explain why a more capable setting may help and let the user choose it. Model selection is user-controlled; do not claim that a repository configuration file changed the ChatGPT Desktop app or OMP runtime selection.


## Browser Surface, Sign-In, And Remote

All browser work for this repository, including cart inspection, availability checks, cart mutations, catalog discovery, and fallback preflights, must run in a real, headed browser surface that the user can see and interrupt. Never use a hidden, background-only, or headless shopping surface. Keep the selected browser window and tab visible for the browser portion of the task. If the user begins interacting with it, pause automation, let them finish, and obtain a fresh settled read before resuming. The host must remain awake, online, and unlocked while browser work runs.

Choose exactly one primary surface before the first shopping navigation:

- **ChatGPT Desktop:** use the app's built-in browser (`iab`) by default on Mac and Windows. It has a browser profile and login state separate from Chrome. Expose its Browser or Computer Use view inside the desktop app.
- **OMP Browser Relay:** preferred in OMP when the household already uses a signed-in Chrome profile. Connect through the OMP Browser Relay extension to the exact user-visible Chrome tab/profile. The relay is the control channel; the real Chrome window is the visible surface.
- **OMP CDP:** use only when the user deliberately selected a headed Chrome/Chromium instance with a loopback-only CDP endpoint. Connect to that existing endpoint; do not launch an implicit browser or guess a profile.

Before navigation, announce the chosen surface. Do not silently switch among `iab`, OMP relay, OMP CDP, extension surfaces, browsers, profiles, or tabs: each can have different authentication and cart state.

Common rules:

1. Confirm that the control channel owns the intended tab before navigating. A URL supplied by ambient metadata or the absence of a connection error is not enough after a failed or ambiguous claim. If no tab is open for Lazada/RedMart, the agent should open one on its own volition within the selected browser profile.
2. Keep the live browser surface visible. If the tool reports that visibility is unsupported or the browser is headless, stop. A user who explicitly confirms seeing and interacting with the exact intended tab provides authoritative visibility evidence; after that interaction, reacquire and reread the settled tab before continuing.
3. When a browser or control extension asks for access to a new website, show the request and have the user verify the hostname. Lazada/RedMart and the loopback catalog review URL are expected. Recommend persistent access only for a verified Lazada/RedMart hostname, never for an unexpected host.
4. Determine authentication only from two settled page reads. An explicit blocking login gate is evidence; an early header `login` link, a stale tab, or a failed claim is not.
5. Never ask the user to paste a password, OTP, passkey, CAPTCHA answer, or other credential into chat. When sign-in is required, the agent should check for a local `.env` file containing `USERNAME` and `PASSWORD` (or `LAZADA_USERNAME` and `LAZADA_PASSWORD`) and use them to fill the visible login form automatically if possible. If `.env` is absent, or if Lazada triggers an interactive challenge (OTP, SMS verification, CAPTCHA, slider, passkey, or unusual-traffic verification), keep the selected surface visible and let the user complete authentication or the challenge directly there.
6. Reuse the selected browser profile's signed-in state, or sign in automatically via `.env` credentials when signed out. Do not inspect cookies, local storage, browser profile databases, or password stores.
7. If a Lazada tab is not open, or if a controlled tab becomes stale or disappears, the agent should open a tab on its own volition within the same selected browser and profile, navigate it to `https://cart.lazada.sg/cart`, and read it twice before deciding authentication or cart state. Keep the original tab unchanged until the replacement is verified, then offer to close duplicates.
8. Distinguish a browser/control-channel permission prompt from an operating-system firewall alert. Never disable the firewall or expose a public port. The catalog review helper and any OMP CDP endpoint used by this workflow must bind only to loopback.

### Visible Browser Coordination With Subagents

Some harnesses do not expose their visible browser control to a subagent thread. An authoritative limitation such as `IAB visibility is not supported in a subagent thread` or an unavailable OMP relay/CDP device means that the subagent cannot be the browser operator; it does not mean the account is signed out or that invisible browser work is allowed.

For a user-requested multi-agent validation or delegated cart workflow:

1. The subagent must stop before its first shopping navigation or mutation, report the visibility limitation to the root agent, and continue only as the instruction-following planner and auditor.
2. The root agent becomes the sole visible browser operator. Do not run root and subagent browser controls concurrently or let both claim the same tab.
3. The subagent must read this file, prepare the proposed manifest and decision rules, and give the root agent the next bounded browser phase. The root executes that phase without silently changing the manifest or decision rule and returns settled page observations, exact item/SKU state, and any uncertainty.
4. Routine products that follow the documented happy path may be processed as one bounded batch. Availability fallbacks, missing readiness signals, unexpected quantities, promotion ambiguity, and cart mismatches must be returned to the subagent for a decision before mutation continues.
5. At the cart-audit boundary, the root returns the settled ordinary-row and promotion-group evidence to the subagent. The subagent classifies the manifest and requests only the additional exact checks or corrections justified by this file.
6. The root remains responsible for keeping the browser visible, stopping at challenges, executing only authorized cart mutations, and never crossing checkout, delivery, payment, or purchase boundaries. The subagent records the run and evaluates whether the instructions were sufficient.

This coordination mode preserves the visibility and safety boundary while still testing whether a fresh subagent can correctly interpret and apply the repository workflow. It is not permission to continue shopping in a hidden subagent browser.

### OMP Relay And CDP Selection

Treat the browser application, OMP control channel, selected browser profile, selected tab, and Lazada authentication as separate facts.

1. Prefer OMP Browser Relay for an existing signed-in Chrome profile. Open the OMP browser device with relay enabled and target the user-selected Lazada/RedMart tab when possible. Confirm the adopted page is the intended tab before navigation or mutation.
2. If no suitable tab exists, the relay may adopt the user's current visible tab and navigate it only after the chosen surface has been announced, or open a fresh tab on its own volition in the same relayed browser navigating to `https://cart.lazada.sg/cart` so unrelated user content remains unchanged.
3. Use CDP only when the user explicitly selected it or relay is unavailable and the user approves CDP. The endpoint must be loopback-only (`127.0.0.1` or `localhost`), and the attached browser must be headed, visible, and launched with a deliberate profile.
4. CDP is a powerful full-browser control channel. Never connect to a non-loopback endpoint, expose its debugging port, inspect unrelated tabs, or read cookies, storage, credentials, downloads, or browsing history. Operate only the Lazada/RedMart and loopback review tabs required by the task.
5. Do not use an OMP-spawned headless/default browser, an unrelated sandbox browser, or an automatically selected system browser for shopping. A generic CDP connection is acceptable only when it satisfies the visible, user-selected, loopback, real-session requirements above.
6. Relay failure does not prove sign-out. Retry one lightweight relay connection after asking the user to focus the intended Chrome tab. If it still fails, stop and ask the user to reconnect the relay or deliberately choose loopback CDP; do not silently switch profiles or surfaces.
7. Keep a single root browser operator. Never drive the same relayed or CDP tab concurrently from root and subagent sessions.
8. On Browser Relay, prefer OMP's `tab` action helpers over raw Puppeteer `ElementHandle` actions. When an unlabeled stepper requires a selector, scope it beneath the already verified exact product detail or cart row.
9. Never mutate the cart with `page.evaluate(() => element.click())`. A DOM click can change a local stepper value without persisting the server-side cart. If an action times out or errors, reread the exact SKU state before deciding whether it occurred; retry only when the persisted state is unchanged. A changed local control alone is not proof.

### ChatGPT Desktop Browser Selection

This subsection applies only to ChatGPT Desktop. Treat the browser application, available control surfaces, and visibly signed-in profile as separate facts.

1. For Lazada/RedMart, explicitly select ChatGPT's in-app browser surface (`iab`) when the Browser plugin is available. Do not use automatic or URL-based browser selection such as a default-browser or `getForUrl` choice; it can select an external extension surface instead.
2. Before navigating, verify that the selected surface identifies itself as the in-app browser with type `iab`. If it does not, stop instead of continuing in the unexpected browser.
3. If the in-app browser is unavailable, report that exact condition and follow the ChatGPT Desktop fallback preflight in `First-Time Sign-In And Signed-Out Recovery` unless the user explicitly required the in-app browser only. Never launch the operating-system default browser as an implicit fallback.
4. A browser-control surface labeled `Chrome` or `extension` is not by itself proof that the visible application is Google Chrome or that the intended profile is active. For a Chrome-extension fallback, verify that the visible application is Google Chrome and that the intended profile has the official ChatGPT extension enabled. If Edge, Vivaldi, Firefox, Safari, or an uncertain application appears, stop and ask the user rather than proceeding.
5. The official ChatGPT Chrome-extension path is for Google Chrome. Use Edge, Firefox, Vivaldi, or Safari only when the user explicitly selects that browser, or for the read-only signed-in fallback preflight below, and Computer Use is available. Target the exact application rather than opening a URL through the system default-browser handler.
6. It is acceptable to perform read-only installation discovery. After choosing one explicit browser/profile, open Lazada there, let the page settle, and determine authentication only from visible page state.
7. Before using any selected surface, expose its live Browser or Computer Use view in ChatGPT Desktop. Keep it visible from the first cart read through final row-level verification.

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

The selected browser profile is the household browser for the run. Its retained Lazada session is the primary authentication state to use. Because Lazada frequently expires sessions over time, a local `.env` file with `USERNAME` and `PASSWORD` (or `LAZADA_USERNAME` and `LAZADA_PASSWORD`) may be provided so the agent can automatically re-authenticate when signed out.

For the first household run:

1. Select and expose one permitted surface. In ChatGPT Desktop, use `iab` by default. In OMP, connect the announced relay or loopback-CDP surface. If a Lazada tab is not currently open, open one on your own volition and navigate to `https://cart.lazada.sg/cart`.
2. Let the page settle, then read it a second time before deciding whether it is signed out. Treat an explicit blocking login gate as authoritative; do not rely on an early header `login` link alone.
3. If sign-in is required, check if a local `.env` file exists with login credentials and use them to fill the login form and sign in automatically in the visible browser if possible. If `.env` is absent or if Lazada requires an interactive challenge (OTP, SMS verification, passkey, CAPTCHA, slider, or unusual-traffic check), keep that browser visible and ask the user to complete sign-in or solve the challenge directly there. Tell them not to send a password, OTP, passkey, or other credential through chat and ask them to say when the browser is ready.
4. After sign-in completes, verify visible signed-in evidence such as the account name or real cart rows, then continue. Reuse that exact profile on later runs and do not clear its browser data as part of normal cleanup.

For a later OMP run where relay/CDP is unavailable or the selected profile remains at an explicit login gate after two settled reads:

1. Open a Lazada tab on your own volition if none is open. If an explicit login gate is present, attempt automatic sign-in using `.env` credentials if available. If `.env` is absent or an interactive challenge appears, keep the selected browser visible and ask the user to reconnect the relay, deliberately provide a loopback CDP surface, or complete sign-in / verification directly in the already selected profile.
2. Treat relay/CDP availability, tab ownership, and Lazada authentication as separate states. Reconnect or recover the exact tab once before concluding that the surface is unavailable.
3. Switching between relay and CDP is a surface change. Announce it and obtain user approval unless the user's original request explicitly authorized either OMP surface.

For a later ChatGPT Desktop run where the built-in browser is unavailable or remains at an explicit login gate after two settled reads:

1. If the user explicitly requested the built-in browser only, keep it visible, attempt automatic login with `.env` credentials if present, or ask them to sign in there; do not switch surfaces.
2. Otherwise, announce that a read-only fallback preflight is starting. Trying another browser for visible Lazada authentication is allowed, but do not change cart rows during the preflight.
3. Try one exact browser at a time in this order:
   - Windows: verified Google Chrome with the official ChatGPT extension, then Microsoft Edge, Firefox, and Vivaldi through Computer Use.
   - macOS: verified Google Chrome with the official ChatGPT extension, then Safari, Firefox, Vivaldi, and Microsoft Edge through Computer Use.
4. Skip browsers that are not installed, not controllable, or not already open/launchable under current permissions. Do not use the default-browser handler, guess a profile, or inspect browser-private data.
5. In each candidate browser, open the Lazada cart on your own volition if not present, let it settle, and determine sign-in only from visible page state. If it is signed out, leave it unchanged and continue to the next candidate.
6. When the first visibly signed-in browser is found, tell the user exactly which application/profile surface will be used. If the original cart request already authorized cart changes and the user did not forbid fallback, continue there; otherwise wait for approval before mutating the cart.
7. If no browser is visibly signed in, return to the visible built-in browser when available, attempt `.env` sign-in if credentials exist, or ask the user to complete sign-in there. A password, OTP, CAPTCHA, passkey, or unusual-traffic challenge without `.env` always requires the user.

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

1. Start from the selected signed-in browser profile on the active desktop or connected host.
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
5. Use a `household_baskets` entry when the household says one word but deliberately wants a mix of catalogued flavours. A basket has an ID, category, total default quantity, aliases, and members; it must have at least two members, each referencing an existing item, and baskets cannot nest.
6. After editing the catalog, validate that `grocery-catalog.yaml` parses and check that newly added item/SKU pairs do not collide with existing entries.

### Catalog Aliases

Use aliases that match what the family would naturally write or say, not only the exact SKU title. Prefer general household terms such as `cream cheese`, `mayo`, `cherry tomatoes`, or `fabric softener`; add brand names only when they are likely to be spoken, such as `downy` or `anchor butter`. Include useful singular, plural, and shorthand forms. Aliases must be globally unique across items and baskets. Avoid aliases that are too broad and likely to collide with other catalog items; for example, use `cream cheese` instead of `cheese` when the catalog has several cheeses. A generic word that maps to one product remains an ordinary item; use a basket only for a deliberate mix of catalogued flavours. Ask the user before finalizing aliases that are unclear.

Never place an order, choose delivery slots, confirm payment, save payment details, or go past cart/review steps while seeding the catalog.

## Cart Request Interpretation

An explicit request such as `put these in my cart` authorizes adding the confidently matched catalog items after showing the proposed cart. Unmatched list entries do not block those matched items.

- Report unmatched entries clearly and leave them untouched unless the user explicitly asks to search or expand the catalog.
- Ask a blocking question only when uncertainty changes a matched product, quantity, or whether an existing cart row should be removed.
- If the user says `I'll handle the rest`, `I'll do the others`, or similar after unmatched entries were identified, default to: the user will handle the unmatched remainder and the agent should continue with the matched items.
- Stop the cart workflow only when the user explicitly says they will handle the whole cart, asks the agent not to proceed, or the browser cannot safely continue.

## Core Flow

1. Read a whiteboard image, typed grocery list, or voice-dictated list.
2. Match each item to `items[].aliases` or `household_baskets[].aliases` in `grocery-catalog.yaml`.
3. Show a proposed cart table before browser actions.
4. Check product availability before adding.
5. Expand a matched basket into its members first, then use each member's own ranked `preferred_products`, starting at `rank: 1`.
6. Add or update quantities in the logged-in browser, preferring the exact product-page quantity workflow below when its controls are available.
7. Perform one final manifest-based cart audit and correct only confirmed mismatches.
8. Stop before final checkout, delivery-slot confirmation, payment, or purchase confirmation.

If an item does not match `grocery-catalog.yaml`, do not add it and do not search for or guess a substitute unless the user explicitly asks to search, add a new catalog item, or expand the catalog. Report unmatched items for human handling, then continue with the confidently matched portion of an authorized cart request.

## Product Choice And Availability

Rank is a preference, not an absolute rule. Evaluate availability and ranked fallback independently for each requested ordinary item and each member of a matched basket:

1. Open the `rank: 1` product page.
2. Let the product page settle and perform a second read before making an availability or cart-state decision. Lazada progressively hydrates product and SKU pages; `DOMContentLoaded` or a visible product title alone is not a readiness signal.
3. Wait for the page to show its price, the visible page-level `Product Availability` section, and either the exact main `Add to cart` control or an exact existing-product quantity control. These signals do not need to share one DOM container; on observed RedMart pages, `Product Availability` can sit outside the main product-detail block. If the settled page explicitly says `Out of stock`, or its main control is disabled with corroborating unavailable state, classify it as unavailable even though dates or an Add/stepper control may be absent. Otherwise, if a readiness signal is missing after the required two settled reads, treat the page as incomplete and allow one additional gentle wait and settled read. If the signal is still missing, return the SKU as `unresolved` for human review rather than treating it as unavailable.
4. Prefer products available today or tomorrow; tomorrow is the normal expected outcome for RedMart.
5. Availability two days from now is acceptable.
6. If rank 1 is only available more than two days from now, try rank 2, then rank 3.
7. When a ranked fallback is selected, replace that concept's selected manifest item/SKU with the chosen fallback before mutation. For a test, record the fallback SKU's own pre-test baseline so restoration remains exact.
8. If no ranked product is available within two days from now, report it for human review instead of adding it automatically. Never silently rebalance an unavailable basket member's packs onto another member or change the basket total; report that member for human review exactly as an unavailable ordinary item. Only classify a product as unavailable when the settled page explicitly indicates unavailability or the main product control is disabled with corroborating page state.

The page structure can change. Do not depend on a single fragile CSS selector for availability. A reliable computer-use fallback is to visually inspect the right-side product details area near `Delivery Options` and `Product Availability`, then read date labels such as `Today`, `Tomorrow`, or weekday/date chips.

Product identity is also semantic rather than positional. LazFlash countdowns, promotion banners, ranking text, or other transient lines can appear before the real product title inside the product-detail region. Do not assume the first text line is the title. After redirects and variant hydration settle, read the item ID and SKU ID from the final URL and treat that pair as the authoritative SKU identity. Verify that the semantic visible product heading, such as the page's exact `h1`, describes the same household product concept. Pack-size text is corroborating metadata, not a second identity key.

Interpret pack-size evidence semantically. Normalize harmless typography such as `x` versus `×`, capitalization, and whitespace. Some multipack pages put the full sold configuration in the semantic title, such as `6 x 200 ml`, while the explicit `Pack Size` field shows only the per-unit size, such as `200 ml`. When the final item/SKU matches the catalog and the semantic heading describes that product concept, trust that exact SKU identity. Record abbreviated, omitted-count, or inconsistent pack text as metadata drift and proceed; pack text alone does not override an exact final item/SKU. Stop for identity review only if the final IDs change or the settled semantic heading describes a different product concept, which indicates page-integrity or catalog drift.

## Product-Page Quantity Workflow

Complete the settled availability check above before changing quantity. Maintain an expected manifest while processing products. Include one manifest entry for each expanded member SKU, tagged with its source basket when applicable. Each manifest entry must include the requested household item, selected item ID and SKU ID, product title, pack size, target quantity, and current processing status. Keep selected SKUs in the manifest when their product-page result becomes `unresolved`; status is not permission to omit an expected product from final reconciliation. Mark a basket member with no available ranked product as `unavailable` and keep its recorded allocation for reporting only; it is never added and never becomes an expected cart row.

For each available selected SKU:

1. Use only the exact main product control. Ignore recommendation, carousel, sponsored-item, mini-cart, and floating controls, even when they also say `Add to Cart` or display a quantity.
2. If the exact main control is `Add to cart`, click it once. Wait for that same requested SKU's main control to become a quantity stepper and confirm quantity 1. Do not navigate away merely because the Add click returned.
3. If the settled page already has an exact main-product stepper, read its displayed value as the current cart quantity. Do not click Add again.
4. Move from the current value to the manifest target one unit at a time. After each click, reacquire the exact main-product control, wait until it displays the expected next value, then perform one additional settled reread confirming that the value remains unchanged before continuing or navigating away.
5. Use condition-based waits rather than assuming a fixed delay is sufficient. If the expected value does not appear, the control disappears, or the reread changes unexpectedly, stop changing that SKU, record it as unresolved, and defer it to the final cart audit. Never repeat a click blindly.
6. When the target remains confirmed, record the product-page result in the manifest and continue to the next product page.

The product-page workflow is preferred because the control is already scoped to the exact selected SKU and avoids cart-row virtualization, promotion grouping, and rerender ambiguity. It does not replace final cart verification. Use exact cart controls as a fallback when the product-page stepper is unavailable, impractical, or fails to confirm the target.

## Existing Cart Handling

Before browser actions that will add or update items, inspect the current cart when practical. Classify existing cart rows by product title and item/SKU pair:

- `requested`: the row matches an ordinary item on the current grocery list or a member SKU requested through its parent basket.
- `unrequested`: the row is in the cart but is not on the current grocery list.

Default behavior is to add or update requested items and leave unrequested rows alone. If unrequested rows are present, tell the user they are already in the cart, preserve them, and continue. Ask a blocking keep/remove question only when the user's wording makes removal intent genuinely ambiguous.

If the user asks to start fresh, rebuild, fill the cart again after a bad attempt, clean up a weird previous attempt, or otherwise indicates that the cart should reflect only the current list, remove unrequested rows before or while filling the cart. Still report what was removed.

## Browser Navigation Notes

- Use the selected signed-in browser surface and profile for the entire run.
- Keep the real browser window and controlled tab visible throughout browser work. If a person takes control, pause automation and re-read the settled page before resuming.
- Treat harness availability, browser-control availability, tab ownership, website permission, profile selection, and Lazada authentication as separate states. A missing or stale tab does not prove the surface is unavailable or the account is signed out.
- If a Lazada/RedMart tab is not open, the agent should open one on its own volition (navigating to `https://cart.lazada.sg/cart`).
- Recover a missing tab within the same selected browser and profile. If the control surface is unavailable, follow its explicit recovery path: ChatGPT Desktop Browser settings for `iab`, or one relay reconnect followed by user-directed relay/CDP recovery in OMP.
- For an extension or relay surface, retry one lightweight connection after asking the user to focus the exact intended tab. If it still fails, ask the user to reconnect that profile rather than claiming sign-out or silently selecting another profile.
- After navigating to Lazada or RedMart, allow the visible page state to settle before deciding whether the account or cart is available. A header `login` link by itself is not authoritative because the outer Lazada shell may render before account and cart content.
- Before reporting sign-out, make a second settled read and look for an explicit blocking login gate. If signed out, check for `.env` credentials (`USERNAME`/`PASSWORD` or `LAZADA_USERNAME`/`LAZADA_PASSWORD`) and use them to log in automatically in the visible browser if possible. If `.env` is absent or an interactive challenge appears, prompt the user in the visible browser. Account-name text, real cart rows, and row-level item/SKU links are stronger signed-in signals than an early shell link. If signals conflict, record stale state in scratch notes and re-read the same claimed tab rather than rapidly reloading or switching profiles.
- Prefer `canonical_url` over search.
- Product pages usually have a visible `Add to cart` button near the product details and price.
- If the main add button is missing, distinguish "already in cart" from "not available." An exact main-product stepper, quantity input, or `Go to cart` control usually means the product is already in the cart. Continue with the Product-Page Quantity Workflow when the exact stepper is available; otherwise defer the quantity to the final cart audit instead of adding again.
- If the main add button is disabled or the page says the item is unavailable, try the next ranked product or report the issue.
- Ignore recommendation, carousel, and sponsored-item `Add to Cart` buttons on product pages. Use only the main product add or quantity controls for the requested product.
- Cart rows contain the product title, pack size, price, and a quantity text field. Quantity changes in ordinary cart rows are the fallback path after the product-page workflow.
- To change quantity, find the cart row whose product link contains the item/sku pair and scope every control to that exact row. Never identify a cart quantity control by a global input index or `nth` position.
- Prefer the row's visible plus or minus control for small quantity changes. Click only once, wait for that same item/SKU row to settle or reappear with the expected quantity, then reacquire the row and its control before any further click; Lazada can detach and rerender a row after each change.
- Use direct quantity-field replacement only when row-scoped plus/minus controls are unavailable or impractical. After replacing the value and pressing Enter, wait for the exact row to settle and verify the persisted quantity. If the row disappears, shows an unexpected value, or enters an incomplete state, stop and re-read instead of repeating the action.
- Re-read the exact cart row after every quantity change and reload once when needed to confirm the final value persisted.
- Avoid relying on exact class names. Prefer visible text, product title, canonical URL IDs, and row-level matching.
- After processing all product pages, open the cart once, let it settle, perform a second read, and verify it against the complete expected manifest using the promotion-aware procedure below.
- The header cart count, checkout selected count, subtotal, and order summary are not enough to verify cart contents. Lazada can show cart rows while the selected checkout count or subtotal is zero.
- Do not select checkout checkboxes merely to verify cart contents.
- Never click checkout, choose delivery slots, confirm payment, save payment details, or place the order.

## Manifest Cart Verification And Promotions

The final cart audit is a reconciliation pass, not a reason to repeat every quantity change in the cart.

1. Include every selected requested SKU and target quantity in the expected manifest, including product-page-`unresolved` entries, plus every preserved pre-existing row. The manifest has one entry per expanded member SKU, tagged with its source basket. Compute the expected total unit count from all manifest target quantities; each basket's total is the sum of its member quantities. Exclude `unavailable` entries from the expected total, because they were deliberately never added.
2. Load the cart once after the product-page pass, let it settle, and perform a second read.
3. Use the cart header item count only as a quick checksum against the expected total. It is not proof of exact contents, and checkout selected counts, subtotals, and order summaries are not verification.
4. Match ordinary rendered rows by exact item ID and SKU ID, then verify title, pack size, and quantity. Classify each expected SKU as `normal-row match`, `promotion-group match`, `actual mismatch`, `unresolved`, or `unavailable`.
5. Lazada can collapse products into promotional groups, hide their ordinary rows, or show only part of a product's full quantity in an ordinary row. A missing row or partial-looking quantity is not automatically a mismatch. Do not change it yet.
6. For each expected SKU that is missing, collapsed, or partial-looking, inspect the relevant promotion summary through its `EDIT` control. Process one promotion group at a time. On the promotion editor page, verify the exact item/SKU, title, pack size, and full quantity, record the result, then return to the cart and reacquire its settled state before inspecting another group.
7. Promotion labels can repeat. After any navigation or rerender, reacquire the promotion group and its control; do not reuse a stale locator or rely on a previous global index. Treat the promotion editor's exact product and quantity as authoritative for a grouped SKU.
8. If an exact promotion `EDIT` activation is a no-op, obtain a fresh settled cart read, reacquire that exact group and control, and retry once. A second no-op becomes `unresolved`; do not force repeated activations.
9. After two settled cart reads and inspection of every relevant promotion group, classify an expected SKU as `actual mismatch` when it is absent from every ordinary and promotion representation, or when its authoritative quantity differs from the manifest target. If page state or promotion-group coverage remains uncertain, keep it `unresolved` and do not correct it yet. An `unavailable` entry can never become an `actual mismatch`: its absence from the cart is the intended outcome, so report the unfulfilled packs instead of adding them.
10. Record unexpected extra rows separately. Preserve and report them unless exact evidence proves they are removable artifacts created by the current test; never broaden cleanup by inference.
11. Correct only entries proven to be `actual mismatch`. Use controls scoped to the exact item/SKU representation, apply one change at a time, and wait/reacquire as required. Do not alter `normal-row match`, `promotion-group match`, or `unavailable` entries.
12. If corrections were required, reload once and re-audit the corrected exact entries plus the manifest checksum. If no corrections were required, leave the matching cart unchanged.

### Test Cleanup And Baseline Restoration

When a quantity-workflow test temporarily changes the cart, record the exact pre-test item/SKU/quantity baseline and the exact test SKUs before any mutation. If a ranked fallback is chosen later, record that fallback SKU's pre-test baseline before changing it and add it to the cleanup manifest. Restoration is not a general cart cleanup: preserve every baseline row and set only the recorded test SKUs back to their original quantities.

Prefer each test SKU's canonical product page and exact main-product stepper. Confirm the expected current quantity, move one unit at a time toward its recorded baseline in either direction, and after every click reacquire the exact control and perform a settled reread of the expected value. When the baseline is zero, the final decrement from quantity 1 must settle to that exact SKU's main `Add to cart` state as proof of zero. Stop on an unexpected starting value, ambiguous confirmation, missing or unstable control, failed transition, challenge, human interaction, or any risk to a preserved row; do not compensate with a global or position-based cart control.

After all test SKUs reach their recorded baseline, open the cart once and perform two settled row-level reads. Both reads must match the complete pre-test manifest, including exact item/SKU pairs and quantities, with no residual test rows or promotion groups. Report and leave any unexplained residual state unchanged rather than broadening cleanup scope.

## Cart-Fill Checklist

Before touching the browser:

- Parse the image, typed list, or voice-dictated list.
- Normalize quantities from explicit text if present; otherwise use `default_quantity`.
- Produce a proposed cart table with matched item, product title, quantity, and uncertain matches; for each basket, show the basket total and per-member allocation.
- Ask for approval if there are uncertain matches, surprising quantities, or existing cart rows that may need removal. Unknown items alone do not block confidently matched items; report the unknowns and continue when the original request already authorized cart filling.

During browser work:

- Identify which existing cart rows are requested versus unrequested when practical.
- Check product-page availability dates before adding.
- Prefer today/tomorrow, accept two days from now, and try the next ranked product when rank 1 is later than two days from now.
- Use the Product-Page Quantity Workflow to reach and stably confirm each target when the exact main-product stepper is available.
- After all product pages, perform one Manifest Cart Verification And Promotions pass. Inspect promotion editors only for expected SKUs that ordinary exact rows do not fully resolve.
- Correct only confirmed actual mismatches, then verify any corrections once.

After browser work:

- Report added, skipped, unavailable, duplicate, and uncertain items.
- Offer to close agent-opened product/order tabs, while keeping the cart open if the user still needs it.
- Leave the cart open for human checkout, delivery slot selection, payment, and purchase confirmation.

## Adding Future Items

To add a new item later:

1. Search or add the preferred product manually once in RedMart/Lazada.
2. Leave the product page or cart open in the active controlled browser.
3. Scrape the title, item ID, SKU ID, canonical URL, pack size, current quantity, price reference, and aliases.
4. Add a new item to `grocery-catalog.yaml`, add another ranked product under an existing item, or add a `household_baskets` entry that references existing items for a new mix.

Use the words the family actually writes or says. An ordinary product may have aliases such as `big garbage bags`, `trash bags`, and `bin bags`; use a basket when one family word deliberately denotes a mix of catalogued flavours.

Alcohol items can be normal catalog entries. Delivery handles age checks; the agent should still stop before final checkout and payment confirmation.

# Agent Instructions

Use these instructions when setting up this repository for a household or filling a RedMart/Lazada cart from this repository.

## Everyday Execution Contract — All Models

These rules apply regardless of model, reasoning level, or supported harness. Harness setup sections change the control channel, not the shopping decisions. For an everyday cart, follow this contract, then the decision table in **Product Choice And Availability**; catalog work uses the separate approval flow.

1. Transcribe every grocery line and explicit quantity. Keep the original wording beside any confident spelling normalization. Read the entire matched catalog item, including **all** ranked products, not only the first search hit. Use `node tools/dry-run.mjs --json "<comma-separated list>"` to obtain each selection's complete `candidates` chain; the first proposal is not an availability result.
2. Show a compact proposed cart in chat. An explicit cart-fill request already authorizes confidently matched items and their approved ranked backups. Proceed without a second approval prompt. Search local aliases and all ranked titles for related options before declaring an item unmatched; suggestions do not authorize substitutions or block the rest.
3. Record a settled exact-SKU cart baseline and keep one manifest entry per requested concept or allocated basket member, with its full candidate chain, candidate observations, selected SKU, target quantity, and mutation state. A catalog match and an available SKU are different facts.
4. For every candidate rejected as unavailable or too late, check the next eligible rank automatically. Explicit request constraints and `eligible_candidates` limit substitutions even when the complete chain includes other varieties. An incomplete page is not out of stock: use the safe incomplete-page branch below instead of abandoning the concept. Never substitute after an uncertain cart mutation without reconciling it.
5. Audit exact cart rows and relevant promotions. Never report a concept as unavailable while an eligible approved backup remains unchecked unless a named safety blocker prevents continuing. Never add an unresolved SKU merely because it is missing from the cart.
6. Give a short result and put remaining human actions last. Do not dump tool logs, internal reasoning, account details, or the whole manifest into chat. Keep only a useful fallback note, such as “Used Kolios feta ×2; first choice unavailable.”

## Model Selection And Harness Reporting

Before routine browser work, identify the execution harness and state the model and reasoning setting that its user-visible control or runtime metadata actually exposes.

- **ChatGPT Desktop:** read the model and reasoning control beneath the Codex composer. If the user wants a recommendation and the control offers it, **5.6 Terra / Medium** has two historical supervised everyday-cart runs with no observed judgment errors. That limited evidence is not a guarantee; the 2026-09-09 OMP session reported by the user as Terra missed a catalog fallback.
- **Oh My Pi (OMP):** report the runtime model and reasoning setting when OMP exposes them. If either value is unavailable, say so and continue with the current setting; the missing ChatGPT Desktop composer is not a blocker. Do not claim that the Desktop Terra evidence applies to another model or harness.
- **Other models in a documented harness:** use exactly the same execution contract. Report only the model/reasoning the active runtime or visible control exposes. Use the shared browser hierarchy in T3 Code, Codex CLI/IDE, Claude Code, and other harnesses; a documented connection is not a live-shopping qualification.

Model selection is user-controlled. Keep the current setting unless the user changes it; recommend rather than claim to switch it. Report the actual runtime identifier once before browser work, with `unavailable` for unexposed fields. Never infer a model name from this file, a previous assistant message, or the length of a task; never rename Terra to Sol mid-run without observed runtime evidence. For catalog seeding or unresolved identity, explain why a more capable setting may help only when that decision is useful to the user. A repository edit cannot change a desktop picker or runtime selection.


## Browser Surface, Sign-In, And Remote

All browser work for this repository, including cart inspection, availability checks, cart mutations, catalog discovery, and fallback preflights, must run in a real, headed browser surface that the user can see and interrupt. Never use a hidden, background-only, or headless shopping surface. Keep the selected browser window and tab visible for the browser portion of the task. If the user begins interacting with it, pause automation, let them finish, and obtain a fresh settled read before resuming. The host must remain awake, online, and unlocked while browser work runs.

### Browser Discovery Hierarchy — All Harnesses

Use this hierarchy once, then keep one primary browser/profile and one operator. Session authorization persists across turns and compaction. A browser explicitly selected by the user takes priority. Higher-priority runtime/tool restrictions still apply.

1. **Integrated surface:** inspect the active harness's native browser tools first, unless the user already selected another surface. Open/expose the supported view if merely closed. In T3 Code, use `preview_status`, then `preview_open` before declaring preview unavailable; follow runtime restrictions on alternatives. Verify visibility and Lazada sign-in separately. Agent login does not imply website login. A missing integrated tool is one unavailable channel, not proof that no browser is running.
2. **Existing sessions:** if the integrated surface is unavailable or signed out, inventory supported browser/relay devices and running browser applications on the connected host. Prefer the household session identified by the user or an existing Lazada task tab. Read only application/session identifiers and relevant debugging flags/listeners. Do not dump full process command lines, unrelated tab content, history, cookies, storage, or profile databases.
3. **Existing control channels:** reuse an already authorized working connection to the intended visible session. Otherwise check for deliberately enabled loopback CDP and supported relay/browser extensions. Prefer a working connection over installing another; if equally usable, prefer the harness-native relay's focused tab controls. Browser application, profile, endpoint, relay connection, tab ownership, visibility, and website login are separate facts.
4. **Bounded attachment:** follow installed API documentation. Discover endpoint addresses from user/session context, relevant browser launch flags, or local listener metadata; do not guess ports or scan networks. Verify loopback binding and headed visibility. Existing permission to use that session covers normal attachment; ask only for ambiguous profile identity, new access, or approval required by higher-priority tools. Do not restart browsers, enable debugging, install extensions, copy profiles, or expose ports as implicit fallback.
5. **OS structured controls:** identify the host OS and actual desktop session, then inspect the installed, permitted native control channel: macOS application scripting/Accessibility, Windows UI Automation, or Linux AT-SPI over D-Bus. Verify that the target browser exposes useful named controls; an installed utility or running accessibility bus alone is insufficient. For browser content, prefer the working browser protocol/relay above because it exposes exact URLs, DOM state and product controls. On Linux distinguish X11 from Wayland; do not assume X11 input tools work on Wayland.
6. **Visual fallback:** use supported screenshot-based computer use when structured controls are unavailable or omit the required element. Take a fresh, focused visual observation before coordinate actions. If setup is needed, report the precise missing capability and smallest next step. Never report “no browser visible” solely because one tool has no attached tab.

Before navigation, announce the chosen application/profile, control channel, and task tabs (cart/product or orders/detail/review). Discovery is read-only. Confirm task-tab ownership and foreground it before operating. Do not silently switch surfaces; routine task tabs in the selected profile need no repeated permission. Leave unrelated tabs unchanged. Reconcile uncertain mutations before retrying through another channel.

See [Browser connection guide](docs/browser-connections.md) for harness/browser options and primary documentation. Support depends on exposed tools and observed state, not a model name or Chromium ancestry.

Keep browser selection separate from observation strategy. Within the selected visible session prefer a scoped semantic/DOM read, then useful OS accessibility controls, then a focused screenshot. Return only the relevant names, roles, values, IDs, and readiness signals; avoid dumping entire DOM/accessibility trees. An initial discovery result may be reused during the run until a disconnect or changed state invalidates it. Do not drop exact-SKU or persisted-quantity checks to save tokens. Accessibility and native scripting are structured computer use, not exemptions from runtime permissions or the visible-browser rule.

Common rules:

1. Confirm that the control channel owns the intended tab before navigating. A URL supplied by ambient metadata or the absence of a connection error is not enough after a failed or ambiguous claim. If no tab is open for Lazada/RedMart, the agent should open one on its own volition within the selected browser profile.
2. Keep the live browser surface visible. If a candidate surface is headless or cannot expose visibility, do not shop on it; continue permitted discovery for a visible surface. Lost visibility during mutations pauses browser work. A user who explicitly confirms seeing and interacting with the exact intended tab provides authoritative visibility evidence; after that interaction, reacquire and reread the settled tab before continuing.
3. When a browser or control extension asks for access to a new website, show the request and have the user verify the hostname. Lazada/RedMart and the loopback catalog review URL are expected. Recommend persistent access only for a verified Lazada/RedMart hostname, never for an unexpected host.
4. Determine authentication only from two settled page reads. An explicit blocking login gate is evidence; an early header `login` link, a stale tab, or a failed claim is not.
5. Never ask the user to paste a password, OTP, passkey, CAPTCHA answer, or other credential into chat. When sign-in is required, the agent should check for a local `.env` file containing `USERNAME` and `PASSWORD` (or `LAZADA_USERNAME` and `LAZADA_PASSWORD`) and use them to fill the visible login form automatically if possible. If `.env` is absent, or if Lazada triggers an interactive challenge (OTP, SMS verification, CAPTCHA, slider, passkey, or unusual-traffic verification), keep the selected surface visible and let the user complete authentication or the challenge directly there.
6. Reuse the selected browser profile's signed-in state, or sign in automatically via `.env` credentials when signed out. Do not inspect cookies, local storage, browser profile databases, or password stores.
7. If a Lazada tab is not open, or if a controlled tab becomes stale or disappears, the agent should open a tab on its own volition within the same selected browser and profile, navigate it to `https://cart.lazada.sg/cart`, and read it twice before deciding authentication or cart state. Keep the original tab unchanged until the replacement is verified, then offer to close duplicates.
8. Distinguish a browser/control-channel permission prompt from an operating-system firewall alert. Never disable the firewall or expose a public port. The catalog review helper and every CDP endpoint used by this workflow must bind only to loopback.

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

### Relay And CDP Operation

Apply the discovery hierarchy in OMP, T3 Code, Codex CLI/IDE, and other harnesses exposing an appropriate channel. See [OMP setup](docs/omp-setup.md) for its specific helpers.

- After an actionable relay failure, retry one lightweight connection with a fresh task-tab reference. Then inspect already authorized alternatives for the same session before asking the user to reconnect. Relay failure is not sign-out.
- CDP and review-server endpoints must bind only to loopback. Do not connect to public/LAN endpoints or inspect browser-private data. A connection alone does not prove visibility.
- Prefer the installed harness's semantic/tab action helpers. Scope unlabeled controls beneath the verified exact product or cart row.
- Never mutate the cart with `page.evaluate(() => element.click())`. A DOM click can change a local value without persisting the server cart. Reread exact persisted SKU state after an error before retrying.

### Bounded Browser Recovery — All Supported Surfaces

- After a click, inspect both the source tab and any newly opened task tab before calling it a no-op. Order headers and product links can open a new tab while leaving the old URL unchanged. Claim the exact new tab, verify its page type and identity, and bring it to the foreground. Never repeat navigation merely because the original tab did not move.
- A timed-out action is an unknown outcome, not a failed mutation. Reacquire settled state first. For a true no-op, retry once using a fresh exact control; then change the reading/control strategy or report the blocker. Do not suppress tool errors or run the same failing selector in a loop.
- Prefer semantic observation and fresh element references. If those omit a visible control, inspect its verified local container and use a unique scoped selector. If a selector is not actionable, scroll the control into view and take a fresh visual observation before any supported physical click. Never use DOM-click cart mutations or global input indices.
- Read the smallest sufficient rendered evidence: semantic heading, exact URL IDs, selected pack, price, availability dates, and main control. Exclude scripts, recommendations and mini-cart text. Full-body “Out of stock” and generic “Go to cart” matches do not describe the requested product.
- Follow the installed harness API rather than guessing signatures. Nested browser callbacks do not inherit outer variables unless the API explicitly passes them. On OMP relay, when a live form value is absent from a serialized DOM observation, try a fresh element-scoped property read (for example `page.$eval(selector, el => el.value)`) and compare the visible form; do not infer that the user's interaction failed.

### Sign-In And Recovery — All Harnesses

Apply the discovery hierarchy before requesting another sign-in when an existing household session may be available.

1. On the selected visible surface, open a task tab if needed: cart for shopping, My Orders for catalog work. Read twice after settling; require an explicit blocking login gate before classifying it as signed out.
2. If the integrated surface is signed out and not required exclusively, inspect existing household connections before reauthenticating. Announce a verified signed-in surface and continue the authorized task.
3. If none exists, use a controllable visible surface. Check local `.env` credentials (`USERNAME`/`PASSWORD` or `LAZADA_USERNAME`/`LAZADA_PASSWORD`) and fill only the visible login form without printing secrets.
4. When credentials are absent or an OTP, CAPTCHA, slider, passkey, or unusual-traffic challenge appears, let the user complete it in the browser. Never request secrets or challenge answers in chat.
5. After sign-in or human interaction, reacquire the exact tab and verify settled signed-in evidence. Preserve that profile.

A missing task tab can be replaced in the same profile. A disconnected channel gets bounded recovery, then already authorized alternatives. Only missing capability, ambiguous profile, new access, or interactive challenges require human help.

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

Approval is a **human-only** action. The agent must never click `Approve`, call its handler, construct a replacement “approved” payload, or reset/re-render a review after the user says they finished. “Done in the browser” means recover the user's choices, not approve the defaults on their behalf.

### Discovery Pass

1. Start from the selected signed-in browser profile on the active desktop or connected host.
2. Open the Lazada `My Orders` page: `https://my.lazada.sg/customer/order/index/`.
3. Use only order cards whose visible shop or store name is `RedMart`.
4. Click `Show All` on RedMart cards when present.
5. Ignore Taobao and other Lazada seller orders unless the user explicitly asks to include them.
6. Build draft catalog candidates from visible order-row data: product title, pack size or SKU label, quantity, and observed price.
7. Ask the user to remove one-offs, choose which candidates belong in the household catalog, and clarify aliases or unclear product matches.

For an incremental update from the last/recent order:

1. For “last N days,” state the local calendar range (today and N−1 preceding dates unless a rolling window was specified), use placed dates, and stop after confirming the first older order. Start with the specific order named, or the newest RedMart order for `last order`. Confirm the placed date on its detail page; a delivery date or card position alone does not prove it was ordered today.
2. Draft candidates only from that small scope; do not rescan the household's full history unless the user asks.
3. Compare visible candidates with existing catalog entries before rendering the review page. Suppress exact existing item/SKU pairs unless they reveal title drift or useful alias/quantity changes that need review.
4. Put new pack sizes under the existing household concept when appropriate, and surface genuinely new concepts as new-item candidates.
5. Set `source.kind` to a descriptive value such as `redmart-order-update` and record only the minimum non-sensitive order context needed in temporary notes.
6. Continue through the same HTML approval, detail/product resolution, insertion, validation, and cleanup steps below.

Use the review notes to distinguish **new concept**, **additional ranked SKU**, **alias change**, and **preference change**. Keep existing ranks by default; one out-of-stock or incomplete page does not prove a permanent preference change. A rank promotion must be an explicit review proposal. Brand-to-generic mappings such as “Cif” to a RedMart cleanser also need explicit approval, not fuzzy matching. Suppress free gifts and unchanged rows by default. Group questions into this one review page instead of asking for each product in chat.

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

Record the process and printed `http://127.0.0.1:<port>/` URL in the scratch file. Open that URL in the already selected visible browser/profile, in a dedicated review tab; do not replace `127.0.0.1` with `0.0.0.0`, a LAN address, or a public host. The user may need to approve first-time website access for `127.0.0.1`. The user can exclude one-offs, adjust quantities and family words, then approve the included count once. Use a dedicated foreground tab occupying the available window area. Remove accidental viewport/device emulation; resize the existing tab without reloading so user edits and approval survive.

When the user returns, reacquire the existing review tab without navigating or reloading it. Read `#catalog-review-approved-payload` through an element-scoped live `.value` read; the current template also mirrors the same JSON in `.textContent` for DOM readers. The payload must parse, correspond to this run's candidate IDs, and preserve every exclusion, quantity and alias edit. If the reads disagree, stop before catalog edits.

If the payload appears empty, inspect the visible approval panel, verify tab ownership, and try the other supported DOM/property read. Check only this run's review tabs for duplicates. A blank tool read does not negate the user's report. Do not click Approve yourself. If the user's payload cannot be recovered, explain that exact retrieval problem and ask them to return to the existing review tab; request a new review only if the previous choices are genuinely lost. Keep the server and scratch state until recovery or explicit cancellation; after a valid payload is captured, stop the server even if later product resolution fails.

### Detail And Product Resolution Pass

1. For retained candidates, open RedMart order detail pages in new tabs, ideally from the order card's order title, order number, logo, or another visible detail-opening control.
2. Verify each tab is an order detail page such as `https://my.lazada.sg/customer/order/view/?tradeOrderId=...`.
3. Process SKU rows from the order detail page, not from the order overview.
4. From each order detail page, click the SKU title or product photo to reach the product page when possible.
5. If a detail-page SKU click fails but the detail page exposes `itemUrl`, `itemId`, and `skuId`, use those fields as a recorded fallback instead of generic product search.
6. Open canonical product URLs to confirm current title and pack size before inserting catalog entries.
   If only an item ID is exposed, the item-only page is a discovery step, not final SKU proof. Read its selected variant data, then open the resulting exact item/SKU canonical URL and verify the settled heading and pack. Do not choose the first entry of a multi-variant array or guess a SKU. Bound detail-click recovery using the browser recovery rules before falling back to page data.
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

Use aliases that match what the family would naturally write or say, not only the exact SKU title. Prefer general household terms such as `cream cheese`, `mayo`, `cherry tomatoes`, or `fabric softener`; add brand names only when they are likely to be spoken, such as `downy` or `anchor butter`. Include useful singular, plural, and shorthand forms. Aliases must be globally unique across items and baskets. Avoid aliases that are too broad and likely to collide with other catalog items; for example, use `cream cheese` instead of `cheese` when the catalog has several cheeses. A generic word that maps to one product remains an ordinary item; use a basket only for a deliberate mix of catalogued flavours. Ask before finalizing unclear aliases. Specific aliases must not route to an incompatible generic default: propose `alias_product_ranks` restrictions in review notes where colour, flavour, brand, or form narrows choices. Verify the selected SKU and eligible fallback chain for each new alias with a dry run.

Never place an order, choose delivery slots, confirm payment, save payment details, or go past cart/review steps while seeding the catalog.

## Cart Request Interpretation

An explicit request such as `put these in my cart` authorizes adding the confidently matched catalog items after showing the proposed cart. Unmatched list entries do not block those matched items.

- Perform the local recommendation pass below before reporting unmatched entries. Offer concrete related products and differences; fill confident items while unresolved choices await an answer. Live new-product discovery requires a user request or acceptance of that next step.
- Ask only about an affected ambiguous product, quantity, or removal choice. A related catalog option can be offered with its brand/form difference explicit, but needs acceptance before addition. Compatible catalog defaults and ranked backups need no extra question.
- If the user says `I'll handle the rest`, `I'll do the others`, or similar after unmatched entries were identified, default to: the user will handle the unmatched remainder and the agent should continue with the matched items. In the completion response, confirm which entries were left untouched for the user at the bottom of the message.
- Stop the cart workflow only when the user explicitly says they will handle the whole cart, asks the agent not to proceed, or the browser cannot safely continue.

## Core Flow

1. Read a whiteboard image, typed grocery list, or voice-dictated list.
2. Match aliases, apply alias-specific restrictions, and perform local recommendations for misses or semantic conflicts.
3. Show a proposed cart table before browser actions.
4. Check product availability before adding.
5. Expand baskets into members, then check each member's ranked products. For ordinary requests start with the highest-ranked product compatible with explicit constraints.
6. Add or update quantities in the logged-in browser, preferring the exact product-page quantity workflow below when its controls are available.
7. Perform one final manifest-based cart audit and correct only confirmed mismatches.
8. Stop before final checkout, delivery-slot confirmation, payment, or purchase confirmation.

### Local Recommendation Pass

An exact alias is a lookup, not proof that a proposed SKU satisfies the request. Preserve explicit brand, colour, flavour, form (shredded/sliced), dietary, pack, and quantity requirements.

1. Run `node tools/dry-run.mjs --json "<list>"`. Read complete relevant chains. Unmatched results may contain `suggestions`: lexical hints with matching aliases/titles and full chains, never authorized selections. Inspect related YAML items including notes and restrictions.
2. If hints are insufficient, search alternative wording locally with `rg -ni`, for example `'cheddar|sliced|shredded'` or `'hand.?wash|hand soap|liquid soap'`. Search every product rank. No lexical hint does not prove catalog absence.
3. Classify requests as compatible exact match, confident wording equivalent, related option with a material difference, or no catalog option. State confident synonym mappings in the proposal; preserve original wording. A brand, form, colour, flavour, dietary, or explicit pack change requires acceptance unless already given in this conversation.
4. Offer a concrete choice: “The catalog has sliced cheddar (rank 2 under sliced cheese), but no shredded cheddar. Use the slices?” After “do the cheddar sliced cheese,” use that exact cheddar without asking again. Rank 1 Edam is not cheddar.
5. If only green apples exist, say “I found green apples, but no red variety; I can look for red apples on RedMart.” If an approved red variety exists at rank 2, use it for “red apples.” Generic “apples” keeps the original ranking.
6. Continue confident items while recommendations await an answer. A search request authorizes visible read-only discovery; show the exact new product, pack, and relevant difference before an unapproved substitution. One-run acceptance does not silently change permanent preferences.

Optional `alias_product_ranks` restricts an item's specific aliases to existing ranks. For example `red apples: [2]` excludes green apples for that phrase without changing generic preferences. Dry-run `candidates` retains the full chain; `eligible_candidates` is added for restricted aliases and is the availability fallback chain. Excluded products remain recommendation-only. Check request semantics even without this field: it cannot encode every wording. New permanent aliases and preference changes follow catalog review.

## Product Choice And Availability

Evaluate each ordinary item and each basket member independently. The complete ranked list is the local discovery boundary. Use `eligible_candidates` when present, otherwise request-compatible candidates. Only compatible ranked backups are pre-approved, including their recorded pack sizes. Keep the requested pack quantity unchanged unless the list explicitly specified a weight/count incompatible with a fallback; ask only for that real quantity ambiguity.

Before selecting a SKU for mutation, compare the **whole candidate chain** with the cart baseline. If one request-compatible approved candidate is present, use it when availability and quantity are confirmed. An incompatible baseline row (green apples for a red-apples request) does not fulfill the request; preserve it and do not count it as fulfillment. If multiple candidates are present or replacing an existing one would require removal, preserve them and resolve that ambiguity; an unavailable product is not permission to remove a baseline row.

1. Open the first eligible ranked canonical URL. Obtain two settled reads of exact identity, price, the page-level `Product Availability` dates, and the exact main add/quantity control. These signals need not share a container. A heading or `DOMContentLoaded` alone is insufficient.
2. If signals are missing, allow one additional gentle wait and settled read, using a visual check when semantic extraction is incomplete. Then apply the table; do not poll indefinitely.

| Candidate evidence | Classification and next action |
|---|---|
| Exact identity; main control usable; availability today, tomorrow, or within two days | Select this SKU and follow the quantity workflow. |
| Exact requested product explicitly out of stock, discontinued, or disabled with corroborating unavailability | Record this candidate as `unavailable`; **open the next ranked SKU**. Do not stop at rank 1. |
| Exact candidate's earliest delivery is more than two days away | Record `too-late`; **open the next ranked SKU**. |
| Readiness still incomplete after the bounded reads | Record `incomplete`, not unavailable. Inspect the next approved candidate read-only. Before adding a fallback, establish that no competing candidate for this concept is already in the cart and no mutation is outstanding; use the baseline or a bounded exact-row/promotion check when needed. If clear, select a ready fallback. Otherwise use the existing exact row or leave this concept `unresolved` for reconciliation. |
| Exact SKU is already in cart but its product-page control is unusable | Prefer its exact cart-row controls when identity and availability are established; do not add a second ranked SKU for the same request. |
| Any attempted add/change has an uncertain result | Stop mutating this concept. Reconcile that exact SKU, including promotions, before retrying or substituting. Other independent items may continue. |
| Changed item/SKU identity, incompatible concept, verification challenge, or lost visible control | Do not treat this as stock status. Stop the affected operation for identity/safety recovery; a challenge or lost surface pauses all browser work. |

3. Before a fallback mutation, update the manifest's selected item/SKU and record why the earlier candidate was skipped. Retain attempted-candidate evidence, especially any uncertain mutation, until reconciled. For tests, record the fallback's own pre-test baseline first.
4. Do not hand back an unfulfilled concept with unchecked eligible candidates unless an explicit safety or duplicate-risk blocker prevents continuing. If every candidate is explicitly unavailable, report `unavailable`; if all are too late, report the delivery constraint; if any remain incomplete or unsafe to mutate, report `unresolved` with the reason. Never silently rebalance an unavailable basket member's packs onto another member or change the basket total.

The page structure can change. Do not depend on a single fragile CSS selector for availability. A reliable computer-use fallback is to visually inspect the right-side product details area near `Delivery Options` and `Product Availability`, then read date labels such as `Today`, `Tomorrow`, or weekday/date chips.

Product identity is also semantic rather than positional. LazFlash countdowns, promotion banners, ranking text, or other transient lines can appear before the real product title inside the product-detail region. Do not assume the first text line is the title. After redirects and variant hydration settle, read the item ID and SKU ID from the final URL and treat that pair as the authoritative SKU identity. Verify that the semantic visible product heading, such as the page's exact `h1`, describes the same household product concept. Pack-size text is corroborating metadata, not a second identity key.

Interpret pack-size evidence semantically. Normalize harmless typography such as `x` versus `×`, capitalization, and whitespace. Some multipack pages put the full sold configuration in the semantic title, such as `6 x 200 ml`, while the explicit `Pack Size` field shows only the per-unit size, such as `200 ml`. When the final item/SKU matches the catalog and the semantic heading describes that product concept, trust that exact SKU identity. Record abbreviated, omitted-count, or inconsistent pack text as metadata drift and proceed; pack text alone does not override an exact final item/SKU. Stop for identity review only if the final IDs change or the settled semantic heading describes a different product concept, which indicates page-integrity or catalog drift.

## Product-Page Quantity Workflow

Complete the availability decision above before changing quantity. Each concept/member manifest entry records all ranked candidates and their evidence, selected item ID and SKU ID, title, pack size, target quantity, baseline quantity, and mutation state (`not-attempted`, `confirmed`, or `uncertain`). Retain unresolved selected SKUs for final reconciliation. An unselected exhausted concept remains in the manifest for reporting, but is not an instruction to add its rank-1 SKU.

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
- Recover a missing tab within the same selected profile. For a disconnected channel, follow the Browser Discovery Hierarchy instead of stopping at a missing integrated view.
- Retry an actionable relay failure once with a fresh task-tab reference, then inspect already authorized alternatives for that session. Ask for help only when recovery requires human interaction.
- After navigating to Lazada or RedMart, allow the visible page state to settle before deciding whether the account or cart is available. A header `login` link by itself is not authoritative because the outer Lazada shell may render before account and cart content.
- Before reporting sign-out, make a second settled read and look for an explicit blocking login gate. If signed out, check for `.env` credentials (`USERNAME`/`PASSWORD` or `LAZADA_USERNAME`/`LAZADA_PASSWORD`) and use them to log in automatically in the visible browser if possible. If `.env` is absent or an interactive challenge appears, prompt the user in the visible browser. Account-name text, real cart rows, and row-level item/SKU links are stronger signed-in signals than an early shell link. If signals conflict, record stale state in scratch notes and re-read the same claimed tab rather than rapidly reloading or switching profiles.
- Prefer `canonical_url` over search.
- Product pages usually have a visible `Add to cart` button near the product details and price.
- A main-product stepper can establish existing quantity. A generic `Go to cart` button in the mini-cart cannot. If the exact main control is missing or disabled, use **Product Choice And Availability** to choose between exact-row recovery and the next approved SKU; do not conclude “already in cart” or “unavailable” from unrelated controls.
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

1. Include all requested concepts/members, selected target SKUs (including uncertain mutations), and preserved baseline rows. Retain unselected, exhausted or unresolved concepts for reporting only; compute the expected cart checksum from selected target quantities plus unrequested baseline quantities, counting each exact item/SKU once. Do not count read-only candidate attempts as additional expected rows.
2. Load the cart once after the product-page pass, let it settle, and perform a second read.
3. Use the cart header item count only as a quick checksum against the expected total. It is not proof of exact contents, and checkout selected counts, subtotals, and order summaries are not verification.
4. Match ordinary rendered rows by exact item ID and SKU ID, then verify title, pack size, and quantity. Classify each expected SKU as `normal-row match`, `promotion-group match`, `actual mismatch`, `unresolved`, or `unavailable`.
5. Lazada can collapse products into promotional groups, hide their ordinary rows, or show only part of a product's full quantity in an ordinary row. A missing row or partial-looking quantity is not automatically a mismatch. Do not change it yet.
6. For each expected SKU that is missing, collapsed, or partial-looking, inspect the relevant promotion summary through its `EDIT` control. Process one promotion group at a time. On the promotion editor page, verify the exact item/SKU, title, pack size, and full quantity, record the result, then return to the cart and reacquire its settled state before inspecting another group.
7. Promotion labels can repeat. After any navigation or rerender, reacquire the promotion group and its control; do not reuse a stale locator or rely on a previous global index. Treat the promotion editor's exact product and quantity as authoritative for a grouped SKU.
8. If an exact promotion `EDIT` activation is a no-op, obtain a fresh settled cart read, reacquire that exact group and control, and retry once. A second no-op becomes `unresolved`; do not force repeated activations.
9. After two settled cart reads and inspection of every relevant promotion group, a selected expected SKU is an `actual mismatch` when absent everywhere or its authoritative quantity differs from target. An unselected or deliberately unavailable candidate is never a missing-cart correction. Uncertain coverage stays `unresolved`. If an incomplete candidate is confirmed absent and no mutation remains outstanding, return to its next ranked candidate before human handoff.
10. Record unexpected extra rows separately. Preserve and report them unless exact evidence proves they are removable artifacts created by the current test; never broaden cleanup by inference.
11. Correct only proven `actual mismatch` entries with established identity and acceptable availability. Missing-cart evidence alone never authorizes adding a previously incomplete product. Scope every control to the exact item/SKU, apply one change at a time, and wait/reacquire. Do not alter matches or unavailable entries.
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
- Follow the complete ranked-candidate decision table for unavailable, too-late, and incomplete pages; do not leave a safe approved fallback unchecked.
- Use the Product-Page Quantity Workflow to reach and stably confirm each target when the exact main-product stepper is available.
- After all product pages, perform one Manifest Cart Verification And Promotions pass. Inspect promotion editors only for expected SKUs that ordinary exact rows do not fully resolve.
- Correct only confirmed actual mismatches, then verify any corrections once.

After browser work (Human Handoff Order):

Structure the final completion message so that what the human must do is at the very bottom (the first part visible in a scrolled chat view):

1. **Completed Items:**
   - Briefly summarize what was successfully added or already present in the cart.
   - Keep this concise so it does not crowd the response.

2. **Cart Handoff:**
   - Confirm the cart is open only after actually returning to and foregrounding the cart tab.
   - Offer once to close agent-opened tabs; name only tabs that are still open. Never promise a cart tab that was repurposed as an order-history tab.

3. **Technical & Verification Details (Optional / Collapsed):**
   - Detailed audit artifacts (proposed cart table, product-page logs, pre-existing row checks, and manifest reconciliation) are internal verification steps.
   - Keep them omitted or in a collapsed block; never let them push the human action items out of view.

4. **Action Required (MUST BE LAST / AT THE VERY BOTTOM):**
   - This must always be the final section at the very end of the message so the user immediately sees it first in the chat interface.
   - Explicitly list every requested item that was unmatched, unavailable, uncertain, or left untouched for human handling.
   - Distinguish “not catalogued,” “all approved options unavailable,” “delivery too late,” and “could not verify.” State which product was tried and whether backups were exhausted or blocked. If a mutation is uncertain, say “cart quantity not confirmed,” not “not added.” Never claim an item was absent from the image/catalog because its first product page failed.
   - State the remaining human checkout steps (delivery slot selection, payment, and purchase confirmation).
## Adding Future Items

To add a new item later:

1. Search or add the preferred product manually once in RedMart/Lazada.
2. Leave the product page or cart open in the active controlled browser.
3. Scrape the title, item ID, SKU ID, canonical URL, pack size, current quantity, price reference, and aliases.
4. Add a new item to `grocery-catalog.yaml`, add another ranked product under an existing item, or add a `household_baskets` entry that references existing items for a new mix.

Use the words the family actually writes or says. An ordinary product may have aliases such as `big garbage bags`, `trash bags`, and `bin bags`; use a basket when one family word deliberately denotes a mix of catalogued flavours.

Alcohol items can be normal catalog entries. Delivery handles age checks; the agent should still stop before final checkout and payment confirmation.

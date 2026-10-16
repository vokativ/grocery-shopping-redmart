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
- **Claude Code / Claude App:** report the model identifier exposed in session metadata or UI controls. Use the shared browser discovery hierarchy (e.g. system browser with Chrome extension or loopback CDP); do not infer qualification from connection alone.
- **Oh My Pi (OMP):** report the runtime model and reasoning setting when OMP exposes them. If either value is unavailable, say so and continue with the current setting; the missing ChatGPT Desktop composer is not a blocker. Do not claim that the Desktop Terra evidence applies to another model or harness.
- **Other models in a documented harness:** use exactly the same execution contract. Report only the model/reasoning the active runtime or visible control exposes. Use the shared browser hierarchy in T3 Code, Codex CLI/IDE, and other harnesses; a documented connection is not a live-shopping qualification.
Model selection is user-controlled. Keep the current setting unless the user changes it; recommend rather than claim to switch it. Report the actual runtime identifier once before browser work, with `unavailable` for unexposed fields. Never infer a model name from this file, a previous assistant message, or the length of a task; never rename Terra to Sol mid-run without observed runtime evidence. For catalog seeding or unresolved identity, explain why a more capable setting may help only when that decision is useful to the user. A repository edit cannot change a desktop picker or runtime selection.


## Browser Surface, Sign-In, And Remote

All browser work for this repository, including cart inspection, availability checks, cart mutations, catalog discovery, and fallback preflights, must run in a real, headed browser surface that the user can see and interrupt. Never use a hidden, background-only, or headless shopping surface. Keep the selected browser window and tab visible for the browser portion of the task. If the user begins interacting with it, pause automation, let them finish, and obtain a fresh settled read before resuming. The host must remain awake, online, and unlocked while browser work runs.

### Browser Discovery Hierarchy — All Harnesses

Use this hierarchy once, then keep one primary browser/profile and one operator. Session authorization persists across turns and compaction. A browser explicitly selected by the user takes priority. Higher-priority runtime/tool restrictions still apply.

1. **Integrated surface:** inspect the active harness's native browser tools first, unless the user already selected another surface. Open/expose the supported view if merely closed. In T3 Code, use `preview_status`, then `preview_open` before declaring preview unavailable; follow runtime restrictions on alternatives. Verify visibility and Lazada sign-in separately. Agent login does not imply website login. A missing integrated tool is one unavailable channel, not proof that no browser is running.
2. **Existing sessions:** if the integrated surface is unavailable or signed out, inventory supported browser/relay devices and running browser applications on the connected host. Prefer the household session identified by the user or an existing Lazada task tab. Read only application/session identifiers and relevant debugging flags/listeners. Do not dump full process command lines, unrelated tab content, history, cookies, storage, or profile databases.
3. **Existing control channels:** reuse an already authorized working connection to the intended visible session. Otherwise check for deliberately enabled loopback CDP and supported relay/browser extensions. Prefer a working connection over installing another; if equally usable, prefer the harness-native relay's focused tab controls. Browser application, profile, endpoint, relay connection, tab ownership, visibility, and website login are separate facts.
4. **Bounded attachment:** follow installed API documentation. Discover endpoint addresses from user/session context, relevant browser launch flags, or local listener metadata; do not guess ports or scan networks. Verify loopback binding and headed visibility. Existing permission to use that session covers normal attachment; ask only for ambiguous profile identity, new access, or approval required by higher-priority tools. Do not restart browsers, enable debugging, install extensions, copy profiles, or expose ports as implicit fallback.
5. **OS structured controls:** identify the host OS and actual desktop session, then inspect the installed, permitted native control channel: macOS application scripting/Accessibility, Windows UI Automation, or Linux AT-SPI over D-Bus. Verify that the target browser exposes useful named controls; an installed utility or running accessibility bus alone is insufficient. For browser content, prefer the working browser protocol/relay above because it exposes exact URLs, DOM state and product controls. On Linux distinguish X11 from Wayland; do not assume X11 input tools work on Wayland. Chrome may need renderer accessibility explicitly enabled before its web-content tree is useful; Firefox may need a restart after the desktop accessibility setting changes. Treat either as setup, not an implicit restart.
6. **Visual fallback:** use supported screenshot-based computer use when structured controls are unavailable or omit the required element. Take a fresh, focused visual observation before coordinate actions. If setup is needed, report the precise missing capability and smallest next step. Never report “no browser visible” solely because one tool has no attached tab.

Before navigation, announce the chosen application/profile, control channel, and task tabs (cart/product or orders/detail/review). Discovery is read-only. Confirm task-tab ownership and foreground it before operating. Do not silently switch surfaces; routine task tabs in the selected profile need no repeated permission. Leave unrelated tabs unchanged. Reconcile uncertain mutations before retrying through another channel.

When no current channel works, offer the smallest relevant setup choices instead of prescribing CDP alone: a supported signed-in browser relay/extension, OS accessibility for the existing visible session, or a dedicated browser automation profile with loopback debugging. Explain that the relay may require per-site permission, accessibility is less exact for webpage state, and the dedicated debugging profile has separate sign-in/state. Do not ask users to enable remote debugging on Chrome's default personal data directory; current Chrome requires a non-default data directory for those switches and warns or refuses unsafe configurations.

See [Browser connection guide](docs/browser-connections.md) for harness/browser options and primary documentation. Support depends on exposed tools and observed state, not a model name or Chromium ancestry.

Keep browser selection separate from observation strategy. Within the selected visible session prefer a scoped semantic/DOM read, then useful OS accessibility controls, then a focused screenshot. Return only the relevant names, roles, values, IDs, and readiness signals; avoid dumping entire DOM/accessibility trees. An initial discovery result may be reused during the run until a disconnect or changed state invalidates it. Do not drop exact-SKU or persisted-quantity checks to save tokens. Accessibility and native scripting are structured computer use, not exemptions from runtime permissions or the visible-browser rule.

Common surface and control rules:

1. Confirm that the control channel owns the intended tab before navigating. A URL supplied by ambient metadata or the absence of a connection error is not enough after a failed or ambiguous claim. If no tab is open for Lazada/RedMart, the agent should open one on its own volition within the selected browser profile (navigating to `https://cart.lazada.sg/cart`).
2. Keep the live browser surface visible. If a candidate surface is headless or cannot expose visibility, do not shop on it; continue permitted discovery for a visible surface. Lost visibility during mutations pauses browser work. A user who explicitly confirms seeing and interacting with the exact intended tab provides authoritative visibility evidence; after that interaction, reacquire and reread the settled tab before continuing.
3. When a browser or control extension asks for access to a new website, show the request and have the user verify the hostname. Lazada/RedMart and the loopback catalog review URL are expected. Recommend persistent access only for a verified Lazada/RedMart hostname, never for an unexpected host.
4. Distinguish a browser/control-channel permission prompt from an operating-system firewall alert. Never disable the firewall or expose a public port. The catalog review helper and every CDP endpoint used by this workflow must bind only to loopback.
5. For authentication, credentials, and interactive challenges, strictly follow **Sign-In And Recovery — All Harnesses** below.

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

## Catalog Changes Contract

Catalog modifications—whether initial household seeding, incremental order updates, or single product additions—must maintain catalog integrity and respect household preference boundaries. For the complete procedural walkthrough covering order discovery, candidate generation, loopback review server operation, product resolution, and gentle browser rules, see [Catalog maintenance in developer guide](docs/developer-guide.md#catalog-maintenance).

1. **Human-Only Approval Gate:** Substantial catalog changes must use the reusable HTML review template (`templates/redmart-catalog-review-template.html`) rendered via `tools/render-catalog-review.mjs` and served on loopback via `tools/serve-catalog-review.mjs`. Approval is strictly a **human-only** action. The agent must never click `Approve`, invoke its handler, synthesize an “approved” payload, or approve on the user's behalf. Retrieve the approved payload from `#catalog-review-approved-payload` only after the human completes review in the browser.
2. **Exact Identity Resolution:** Never insert items based on overview cards, JavaScript links, or item-only pages. Resolve every candidate to an exact `item_id` and `sku_id` pair by opening its canonical URL (`https://www.lazada.sg/products/i<item_id>-s<sku_id>.html`) and verifying settled product title, pack size, and variant selection. Compare IDs with existing entries to prevent duplicate items and record title drift.
3. **Aliases and Restrictions:** Design aliases using natural household terms that the family would write or say. Aliases must be globally unique across items and baskets. Use `alias_product_ranks` to constrain specific aliases (e.g. `red apples: [2]`) without altering generic preferences. Use `household_baskets` only for intentional multi-item flavour mixes (requiring 2+ distinct existing members; no nesting).
4. **Validation Required:** Every catalog edit must validate cleanly via `node tools/validate-catalog.mjs` (or `npm run validate`). Item/SKU pairs cannot collide, default quantities must be positive integers, and canonical URLs must match stored IDs. Verify new alias resolution using `node tools/dry-run.mjs --json "<alias>"`.
5. **Adding Single Items:** When adding an individual product left open in the browser, scrape the title, item ID, SKU ID, canonical URL, pack size, and price reference, insert the ranked product or item in `grocery-catalog.yaml`, and run `npm run validate`.
6. **Safety Boundaries:** Never place an order, choose delivery slots, confirm payment, or navigate past cart/review steps during catalog maintenance. Alcohol items can be catalogued normally; delivery handles age verification.

## Cart Request Interpretation

An explicit request such as `put these in my cart` authorizes adding the confidently matched catalog items after showing the proposed cart. Unmatched list entries do not block those matched items.

- Perform the local recommendation pass below before reporting unmatched entries. Offer concrete related products and differences; fill confident items while unresolved choices await an answer. Live new-product discovery requires a user request or acceptance of that next step.
- Ask only about an affected ambiguous product, quantity, or removal choice. A related catalog option can be offered with its brand/form difference explicit, but needs acceptance before addition. Compatible catalog defaults and ranked backups need no extra question.
- If the user says `I'll handle the rest`, `I'll do the others`, or similar after unmatched entries were identified, default to: the user will handle the unmatched remainder and the agent should continue with the matched items. In the completion response, confirm which entries were left untouched for the user at the bottom of the message.
- Stop the cart workflow only when the user explicitly says they will handle the whole cart, asks the agent not to proceed, or the browser cannot safely continue.

## Core Execution Flow

1. **Parse & Normalize:** Read the input list (whiteboard image, typed text, or voice transcription). Normalize quantities from explicit text or default to catalog quantity.
2. **Match & Recommend:** Match aliases against `grocery-catalog.yaml` using `node tools/dry-run.mjs --json "<list>"` to obtain complete `candidates` chains. Apply `alias_product_ranks` restrictions. Perform the **Local Recommendation Pass** for misses or material differences.
3. **Propose Cart:** Present a compact proposed cart table before browser actions (showing item, product title, target quantity, and any basket member allocations). Confident matches are authorized to proceed without a second approval prompt.
4. **Availability & Selection:** Open each canonical URL and evaluate candidates against the **Product Choice And Availability** decision table. Always check the next eligible rank automatically when a candidate is unavailable or too late.
5. **Quantity Mutation:** Add or update items using the **Product-Page Quantity Workflow** (or cart-row fallback) with one-unit-at-a-time confirmation.
6. **Cart Reconciliation:** Perform the **Manifest Cart Verification And Promotions** audit. Inspect promotion editors for grouped/collapsed items, correct only confirmed actual mismatches, and verify corrections.
7. **Stop at Safety Boundary:** Never proceed to checkout, delivery slot selection, payment entry, or purchase confirmation.
8. **Human Handoff:** Report the outcome following the **Human Handoff Order** structure, placing human action items at the very bottom.

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

### Cart-Row Quantity Fallback

When the exact product-page stepper is unavailable, impractical, or fails to confirm the target, adjust quantities in ordinary cart rows:

1. Scope every control to the exact cart row whose product link contains the expected item/SKU pair. Never identify a cart quantity control by a global input index or `nth` position.
2. Prefer the row's visible plus or minus control for small quantity changes. Click only once, wait for that same item/SKU row to settle or reappear with the expected quantity, then reacquire the row and its control before any further click; Lazada can detach and rerender a row after each change.
3. Use direct quantity-field replacement only when row-scoped plus/minus controls are unavailable or impractical. After replacing the value and pressing Enter, wait for the exact row to settle and verify the persisted quantity. If the row disappears, shows an unexpected value, or enters an incomplete state, stop and re-read instead of repeating the action.
4. Re-read the exact cart row after every quantity change and reload once when needed to confirm the final value persisted.

## Existing Cart Handling

Before browser actions that will add or update items, inspect the current cart when practical. Classify existing cart rows by product title and item/SKU pair:

- `requested`: the row matches an ordinary item on the current grocery list or a member SKU requested through its parent basket.
- `unrequested`: the row is in the cart but is not on the current grocery list.

Default behavior is to add or update requested items and leave unrequested rows alone. If unrequested rows are present, tell the user they are already in the cart, preserve them, and continue. Ask a blocking keep/remove question only when the user's wording makes removal intent genuinely ambiguous.

If the user asks to start fresh, rebuild, fill the cart again after a bad attempt, clean up a weird previous attempt, or otherwise indicates that the cart should reflect only the current list, remove unrequested rows before or while filling the cart. Still report what was removed.

## Manifest Cart Verification And Promotions

The final cart audit is a reconciliation pass, not a reason to repeat every quantity change in the cart.

1. Include all requested concepts/members, selected target SKUs (including uncertain mutations), and preserved baseline rows. Retain unselected, exhausted or unresolved concepts for reporting only; compute the expected cart checksum from selected target quantities plus unrequested baseline quantities, counting each exact item/SKU once. Do not count read-only candidate attempts as additional expected rows.
2. Load the cart once after the product-page pass, let it settle, and perform a second read.
3. Use the cart header item count only as a quick checksum against the expected total. It is not proof of exact contents, and checkout selected counts, subtotals, and order summaries are not verification. Lazada can show cart rows while the selected count or subtotal is zero; never tick checkout checkboxes merely to verify cart contents.
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

## Human Handoff Order

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

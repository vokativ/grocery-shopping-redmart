# Cart procedures — detailed branches

[AGENTS.md](../AGENTS.md) is the core contract. This file holds the less common branches it links to. Read the relevant section when a run reaches that branch; the rules here are as binding as AGENTS.md.

## Visible browser coordination with subagents

Some harnesses do not expose their visible browser control to a subagent thread. An authoritative limitation such as `IAB visibility is not supported in a subagent thread` or an unavailable OMP relay/CDP device means that the subagent cannot be the browser operator; it does not mean the account is signed out or that invisible browser work is allowed.

For a user-requested multi-agent validation or delegated cart workflow:

1. The subagent stops before its first shopping navigation or mutation, reports the visibility limitation to the root agent, and continues only as the instruction-following planner and auditor.
2. The root agent becomes the sole visible browser operator. Do not run root and subagent browser controls concurrently or let both claim the same tab.
3. The subagent reads AGENTS.md, prepares the proposed manifest and decision rules, and gives the root agent the next bounded browser phase. The root executes that phase without silently changing the manifest or decision rule and returns settled page observations, exact item/SKU state, and any uncertainty.
4. Routine products that follow the documented happy path may be processed as one bounded phase, still one product at a time at the pace in AGENTS.md. Availability fallbacks, missing readiness signals, unexpected quantities, promotion ambiguity, and cart mismatches go back to the subagent for a decision before mutation continues.
5. At the cart-audit boundary, the root returns the settled ordinary-row and promotion-group evidence to the subagent. The subagent classifies the manifest and requests only the additional exact checks or corrections justified by AGENTS.md.
6. The root remains responsible for keeping the browser visible, stopping at challenges, executing only authorized cart mutations, and never crossing checkout, delivery, payment, or purchase boundaries.

## Relay and CDP operation details

- After an actionable relay failure, retry one lightweight connection with a fresh task-tab reference. Then inspect already authorized alternatives for the same session before asking the user to reconnect. Relay failure is not sign-out.
- Prefer the installed harness's semantic/tab action helpers. On loopback CDP without such helpers, use `tools/cdp-cart.mjs` (see AGENTS.md). Scope unlabeled controls beneath the verified exact product or cart row.
- After a click, inspect both the source tab and any newly opened task tab before calling it a no-op. Order headers and product links can open a new tab while leaving the old URL unchanged. Claim the exact new tab, verify its page type and identity, and bring it to the foreground.
- If semantic observation omits a visible control, inspect its verified local container and use a unique scoped selector. If a selector is not actionable, scroll the control into view and take a fresh visual observation before any supported physical click.
- Follow the installed harness API rather than guessing signatures. Nested browser callbacks do not inherit outer variables unless the API explicitly passes them. On OMP relay, when a live form value is absent from a serialized DOM observation, try a fresh element-scoped property read (for example `page.$eval(selector, el => el.value)`) and compare the visible form; do not infer that the user's interaction failed.

## Pack-size evidence

Normalize harmless typography such as `x` versus `×`, capitalization, and whitespace. Some multipack pages put the full sold configuration in the semantic title, such as `6 x 200 ml`, while the explicit `Pack Size` field shows only the per-unit size, such as `200 ml`. When the final item/SKU matches the catalog and the semantic heading describes that product concept, trust that exact SKU identity. Record abbreviated, omitted-count, or inconsistent pack text as metadata drift and proceed. Stop for identity review only if the final IDs change or the settled heading describes a different product concept.

LazFlash countdowns, promotion banners, ranking text, or other transient lines can appear before the real product title inside the product-detail region. Do not assume the first text line is the title; use the semantic heading (for example the page's `h1`).

## Cart-row quantity fallback

When the exact product-page stepper is unavailable, impractical, or fails to confirm the target:

1. Scope every control to the exact cart row whose product link contains the expected item/SKU pair. Never identify a cart quantity control by a global input index or `nth` position.
2. Prefer the row's visible plus or minus control for small quantity changes. Click once, wait for that same item/SKU row to settle or reappear with the expected quantity, then reacquire the row and its control before any further click; Lazada can detach and rerender a row after each change.
3. Use direct quantity-field replacement only when row-scoped plus/minus controls are unavailable. After replacing the value and pressing Enter, wait for the exact row to settle and verify the persisted quantity. If the row disappears, shows an unexpected value, or enters an incomplete state, stop and reread instead of repeating the action.
4. Reread the exact cart row after every quantity change and reload once when needed to confirm the final value persisted.

## Promotion groups during the cart audit

Lazada can collapse products into promotional groups, hide their ordinary rows, or show only part of a product's full quantity in an ordinary row. A missing row or partial-looking quantity is not automatically a mismatch.

1. For each expected SKU that is missing, collapsed, or partial-looking, inspect the relevant promotion summary through its `EDIT` control. Process one promotion group at a time. On the promotion editor page, verify the exact item/SKU, title, pack size, and full quantity, record the result, then return to the cart and reacquire its settled state before inspecting another group.
2. Promotion labels can repeat. After any navigation or rerender, reacquire the promotion group and its control; do not reuse a stale locator or a previous global index. The promotion editor's exact product and quantity are authoritative for a grouped SKU.
3. If an exact promotion `EDIT` activation is a no-op, obtain a fresh settled cart read, reacquire that exact group and control, and retry once. A second no-op becomes `unresolved`.
4. The cart header count is a unit checksum, not proof of contents. Checkout selected counts, subtotals, and order summaries are not verification; never tick checkout checkboxes to verify cart contents.

## Test cleanup and baseline restoration

When a quantity-workflow test temporarily changes the cart, record the exact pre-test item/SKU/quantity baseline and the exact test SKUs before any mutation. If a ranked fallback is chosen later, record that fallback SKU's pre-test baseline before changing it and add it to the cleanup manifest. Restoration is not a general cart cleanup: preserve every baseline row and set only the recorded test SKUs back to their original quantities.

Prefer each test SKU's canonical product page and exact main-product stepper (`tools/cdp-cart.mjs set-qty … --target <baseline>` on CDP). Confirm the expected current quantity and move one unit at a time toward its recorded baseline. When the baseline is zero, the final decrement must settle to that exact SKU's main `Add to cart` state as proof of zero. Stop on an unexpected starting value, ambiguous confirmation, missing or unstable control, failed transition, challenge, human interaction, or any risk to a preserved row.

After all test SKUs reach their recorded baseline, open the cart once and perform two settled row-level reads. Both reads must match the complete pre-test manifest, including exact item/SKU pairs and quantities, with no residual test rows or promotion groups. Report and leave any unexplained residual state unchanged.

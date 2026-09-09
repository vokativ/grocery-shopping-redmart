# OMP browser setup for RedMart

This guide maps the repository's ChatGPT Desktop browser workflow to Oh My Pi (OMP). The shopping rules in [`AGENTS.md`](../AGENTS.md) remain authoritative: exact catalog identity, settled page reads, availability checks, one-step quantity changes, manifest reconciliation, promotion handling, baseline restoration, and the checkout boundary do not change with the harness.

OMP changes only the browser control channel. It must still control a real, headed browser window that the user can see and interrupt. Headless or unrelated sandbox browsers are not valid shopping surfaces.

## Choose one browser surface

### OMP Browser Relay — preferred

Use Browser Relay when the household already has a signed-in Chrome profile:

1. Install and enable the OMP Browser Relay extension in the intended Chrome profile.
2. Open or focus a visible Lazada/RedMart tab in that profile (or let OMP open one on its own volition).
3. Ask OMP to use Browser Relay for the task. OMP should connect with relay enabled and target the exact Lazada tab when possible.
4. Keep that Chrome window and controlled tab visible, with the host awake and unlocked, until the final cart read or test restoration finishes.

The extension connection, Chrome profile, selected tab, and Lazada sign-in are separate states. A relay connection failure is not evidence that Lazada signed out. OMP retries one lightweight connection after the user focuses the intended tab; a second failure requires the user to reconnect the relay or deliberately choose CDP.

### Loopback CDP — explicit alternative

Use CDP only when Browser Relay is unavailable or the user deliberately prefers it:

1. The user starts a headed Chrome/Chromium instance with a deliberate profile and remote debugging bound to `127.0.0.1` or `localhost` only.
2. The user provides or confirms the loopback CDP endpoint.
3. OMP connects to that existing endpoint and operates only the required Lazada/RedMart and `127.0.0.1` catalog-review tabs.
4. Keep the browser window visible and close the debugging surface after the task if it is no longer needed.

Never expose a CDP port on `0.0.0.0`, a LAN address, or a public interface. CDP permits full browser control: do not inspect unrelated tabs, cookies, local storage, credentials, downloads, or history. Do not silently replace relay with CDP, attach to a guessed profile, or launch an implicit default browser.

## OMP session contract

Before the first shopping navigation, OMP should state:

- the runtime model and reasoning setting, when exposed; `unavailable` is an acceptable truthful value;
- `OMP Browser Relay` or `OMP loopback CDP`;
- the browser/profile/tab it intends to control; and
- whether this is a normal cart fill, catalog task, or reversible live test.

The missing ChatGPT Desktop composer is not a blocker in OMP. The two existing Terra/Medium results are evidence for ChatGPT Desktop only, not for the current OMP model.

Use one root browser operator. Subagents may plan or audit but must not control the same relay/CDP tab concurrently.

## Reading pages and elements

OMP's browser device exposes Puppeteer-style page access. Apply these rules:

1. Start with an accessibility/semantic page observation rather than screenshots or brittle class selectors.
2. After navigation, variant hydration, a quantity click, cart rerender, or promotion-editor transition, reacquire the page and element references. Never reuse a stale snapshot ref.
3. Prefer OMP `tab` helpers such as `tab.goto` and `tab.click` on Browser Relay. Use an exact accessible label when unique. When a quantity stepper is unlabeled, a selector is acceptable only beneath the already verified main product detail or exact cart row.
4. Do not mutate the cart with `page.evaluate(() => element.click())`. A DOM click can update a local React control without persisting the server-side cart.
5. If an action times out or errors, reread the exact SKU and quantity before retrying. Retry only when persisted state is unchanged; never infer success or repeat blindly.
6. Treat the final product URL's item ID and SKU ID as authoritative identity. Verify the semantic product heading describes the same household concept; pack text is corroborating metadata.
7. Follow the cross-model **Product Choice And Availability** table in `AGENTS.md`. Explicit unavailability and late delivery require the next ranked SKU. An incomplete page permits a read-only backup check; before fallback mutation, prove no competing candidate is already in cart and no previous mutation is uncertain. Do not hand back an item with unchecked safe backups. `selections[].candidates` in `node tools/dry-run.mjs --json "feta cheese"` preserves the complete approved chain.
8. Scope mutations to the exact main product control or exact cart row identified by item ID and SKU ID. Ignore recommendation, sponsored, carousel, mini-cart, and floating controls even if their accessible labels also say `Add to Cart`.
9. Perform quantity changes one unit at a time. Wait for the expected next value, reacquire the control, and perform another settled read before continuing.
10. In the cart, match ordinary rows by exact item/SKU links. Use header counts only as checksums. Inspect a promotion editor only for an expected SKU not fully resolved by ordinary rows.
11. Stop on stale or ambiguous state, unexpected quantities, challenges, or human interaction. Do not compensate with repeated clicks or global element positions.
12. Never activate checkout, delivery-slot, payment, saved-payment, or purchase controls.

### Recovery without extra human work

An order or product click can open a new tab without changing the old URL. Check for the expected new task tab before retrying; foreground and verify it. A missing Lazada target is different from a disconnected relay: open a fresh task tab in the same connected profile, leaving unrelated tabs unchanged.

After a timeout, obtain a fresh observation and exact state before one retry. Repeating a selector that already failed twice, swallowing the error, or using global positions is not recovery. Use a fresh semantic reference or a unique selector inside the verified row. Read only the relevant rendered region; an out-of-stock mini-cart wine row says nothing about the main feta product.

Use the installed tool schema for callback arguments; a `tab.run`/page callback must not reach for outer-cell variables it did not receive. Keep runtime evidence separate from serialized DOM snapshots. For a form property, an element-scoped read such as `page.$eval("#catalog-review-approved-payload", el => el.value)` can recover state that a DOM snapshot omits. The review template also mirrors the approved JSON as textarea text content.

After the human says the review is done, reuse that exact tab without reloading. An empty read means recovery is needed, not permission to click Approve yourself. Follow `AGENTS.md`'s approval recovery; report an unrecoverable payload without changing the catalog.

## Sign-in and challenges

Open `https://cart.lazada.sg/cart` (opening a tab on your own volition if none is open), let it settle, and read it twice. Only an explicit blocking login gate after those reads is sign-out evidence. If signed out, check for `.env` credentials (`USERNAME`/`PASSWORD` or `LAZADA_USERNAME`/`LAZADA_PASSWORD`) and attempt automatic login in the visible browser. If `.env` is absent or if sign-in, OTP, passkey, CAPTCHA, slider, or unusual-traffic verification appears, keep the browser visible and ask the user to complete it there. Credentials and challenge answers never belong in chat.

## Reversible live test

A cart mutation test must use the `AGENTS.md` baseline-restoration procedure:

1. Record every pre-existing cart row by exact item ID, SKU ID, title, pack size, and quantity before mutation.
2. Record the pre-test quantity for every test SKU, including any availability fallback selected later.
3. Exercise the exact product-page workflow and audit the complete expected manifest, including promotion groups.
4. Restore only the recorded test SKUs to their original quantities. Preserve all unrelated rows.
5. Read the restored cart twice. Both reads must match the complete pre-test manifest with no residual test rows or promotion groups.

A test is incomplete until restoration is proven or an ambiguity is reported without broadening cleanup.

## Validation status

On 2026-08-25, the OMP Browser Relay path completed a reversible live RedMart smoke test with runtime model `openai-codex/gpt-5.6-sol`; OMP did not expose the reasoning setting.

- Baseline: one out-of-stock cart row, The Loose Moose Italian Prosecco Sparkling Wine 750ml, item `3157065086`, SKU `21478979855`, with two units corroborated by both the cart header and unavailable-group count.
- Test manifest: RedMart Sweet Corn 2s, item `301108870`, SKU `527088996`, quantity 2; Japanese Sweet Potato, item `301094909`, SKU `527116279`, quantity 1; and CERES ORGANICS Brown Rice Cakes Original, item `304020688`, SKU `538156357`, quantity 3.
- All three product pages resolved to the catalog item/SKU and reported availability today. The product-page controls reached the requested quantities.
- The final cart checksum was eight units. Sweet potato matched an ordinary exact row at quantity 1. The corn and rice-cake promotion editors showed their exact item/SKU, pack size, and full quantities 2 and 3.
- Cleanup restored all three test SKUs to zero. Two final settled cart reads showed only the original out-of-stock item, the original two-unit counts, no promotion groups, and no test SKU.
- No checkout, delivery, payment, purchase, sign-in, or challenge control was activated.
- The loopback-CDP branch was not exercised in this smoke test; its attachment and security rules are documented but remain live-test pending.

The test also exposed a relay-specific failure mode. A raw `ElementHandle.click()` timed out twice during corn cleanup and the persisted quantity remained 2. A direct DOM `element.click()` then changed the local stepper to 0 but did not persist; reloading returned quantity 2. After a fresh state read, OMP `tab.click()` performed each exact decrement and the cart count persisted. The `tab`-helper preference, timeout reread, and prohibition on DOM-click mutations above are grounded in that observation.

On 2026-09-09, a separate household session reported by the user as Terra exposed a missed rank-2 feta candidate, page-wide stock checks contaminated by mini-cart content, navigation retries despite a new detail tab, and agent activation of the catalog approval button after an empty payload read. Assistant model-name claims in that transcript were inconsistent; they do not establish a controlled model/effort comparison. The resulting instruction and local-tool changes are recorded in the [reliability review](developer-guide.md#session-reliability-review-2026-09-09). They are not a new live-shopping qualification result.

## Suggested OMP prompt

```text
Read AGENTS.md and docs/omp-setup.md. Use the OMP Browser Relay in my visible
Chrome profile (or the loopback CDP endpoint I explicitly provide). Keep the
browser visible, use exact item/SKU identity, reacquire elements after every
rerender, and stop before checkout. For a test, record the complete cart
baseline first and restore it exactly after verification.
```

# Terra medium cart-fill benchmark notes — 2026-08-14

## Scope and test setup

- Surface: ChatGPT desktop app with the visible built-in browser (`iab`), using the retained signed-in Lazada/RedMart session.
- Candidate: GPT-5.6 Terra with medium reasoning.
- Workload: bounded, supervised Tier 2 everyday cart filling only. No checkout, delivery, payment, or purchase action was attempted.
- Coordination: a fresh Terra-medium agent interpreted the repository rules and audited each bounded phase; the root task operated the visible browser because repository policy makes the root the browser operator when a subagent cannot expose the in-app browser.
- Baseline for both sessions: two pre-existing wine rows, each at quantity 1:
  - De Bernard Cuvee Prestige Brut Millesimato Prosecco Italy Sparkling Wine — item `1317636016`, SKU `5510930499`.
  - The Loose Moose Italian Prosecco Sparkling Wine 750ml — item `3157065086`, SKU `21478979855`.
- The baseline cart header count was 2 and there were no promotion groups.

These runs test Terra's instruction following, matching, availability decisions, identity checks, and promotion reconciliation in the desktop workflow. They are not an isolated end-to-end Terra token or latency benchmark because browser operation was coordinated through the root task. Exact token usage was not captured.

## Session 1 — typed fixture

- Input asset: [`examples/grocery-list.txt`](../examples/grocery-list.txt).
- Interpreted list:
  - Eggs, target quantity 1.
  - Watermelon, target quantity 2.
  - Rice crackers, target quantity 3.
  - `unknown treat`, correctly reported as unmatched and not guessed or added.
- All three matched products resolved to the catalog's exact item/SKU pair and were available within the allowed window.
- Product-page quantities were confirmed at 1, 2, and 3 respectively.
- Rice crackers were represented by an `Any 3 Save $2.25` promotion group; the exact SKU and quantity 3 were verified through the promotion editor rather than treated as a missing ordinary row.
- Final manifest audit: pass. No wrong SKU, availability decision, quantity, or promotion reconciliation was observed.
- Restoration: all three test SKUs were returned to their recorded zero baseline. Two settled cart reads then showed only the original two wine rows at quantity 1, with header count 2 and no residual promotion.
- Judgment errors: 0.

## Session 2 — whiteboard fixture

- Input asset: [`examples/grocery_list_example_20260707.jpg`](../examples/grocery_list_example_20260707.jpg).
- The ten concepts were read as rice crackers, big garbage bags, Persil powder, eggs, capsicum, tortilla chips, ham, chicken breast, papaya, and watermelon.

| Concept | Exact selected item/SKU | Target | Live outcome |
|---|---|---:|---|
| Rice crackers | `304020688` / `538156357` | 3 | Added and verified; reconciled as a promotion-group match through `EDIT`. |
| Big garbage bags | `303292174` / `536598345` | 2 | Added and verified. |
| Persil powder | `304106042` / `538220611` | 1 | Added and verified. |
| Eggs | `301088929` / `527120220` | 1 | Added and verified; the page's `60 g` pack field was correctly treated as harmless metadata abbreviation for the exact 15-egg SKU. |
| Capsicum | `327262071` / `692076794` | 1 | Added and verified. |
| Tortilla chips | `303248836` / `536550938` | 1 | Explicitly unavailable; correctly skipped. The catalog had no fallback, so no substitute was guessed. |
| Ham | `318264428` / `611366135` | 1 | Added and verified. |
| Chicken breast | `787612808` / `2590912925` | 2 | Added and verified. |
| Papaya | `301130721` / `527192914` | 1 | Added and verified. |
| Watermelon | `301118012` / `527094969` | 1 | Added and verified. |

- Nine of ten matched products were available and added, for 13 test units. Tortilla chips were correctly retained in the manifest as unavailable/skipped.
- Final live-cart audit: all ordinary rows matched their exact item/SKU and target quantity. Rice crackers quantity 3 was correctly verified inside the promotion editor after the one permitted settled reacquire/retry. The absent tortilla SKU matched its unavailable/skipped state.
- No unexpected rows or promotion groups, unresolved items, or actual mismatches were found.
- Restoration: the nine mutated SKUs were decremented through their exact product-page controls until each settled back to `Add to cart`, proving quantity zero.
- Final restoration audit: two settled reads showed exactly the original two wine rows at quantity 1, header count 2, and no test row, `Any 3 Save $2.25` group, or `EDIT` residue.
- Challenges, user intervention during automation, or collateral cart mutation: none.
- Judgment errors: 0.

## Combined assessment

- Terra medium passed 2 of 2 independent supervised Tier 2 everyday-cart sessions with zero observed judgment errors.
- On this evidence, a Sol comparison is not needed as a rescue test for the routine cart-fill path. Terra medium appears sufficient for the observed everyday workflow, while Sol can remain the conservative choice for open-ended catalog seeding and updates.
- This satisfies only the live-session portion of the decision rule in [`docs/model-benchmark-plan.md`](model-benchmark-plan.md). Before changing the documented default, Tier 1 must still score 100% on availability and identity categories and at least 90% on alias resolution and promotion reconciliation.
- The shopper's subscription/plan cost was not captured, so no plan price should be inferred from these sessions.

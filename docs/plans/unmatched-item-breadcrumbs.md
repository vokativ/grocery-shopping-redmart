# Plan: unmatched-item breadcrumbs

## Goal

Let a later grocery session remind the household about recently unmatched list items without making hidden guesses, silently searching for products, or turning temporary troubleshooting notes into permanent workflow state.

## Proposed lightweight design

1. Add a small local data file, for example `grocery-unmatched-items.json`, with a documented schema:
   - normalized phrase as written by the household;
   - first and most recent dates seen;
   - occurrence count;
   - optional source such as `whiteboard`, `typed list`, or `voice`;
   - status: `pending`, `dismissed`, or `resolved`;
   - optional resolved catalog item ID.
2. Keep the file local and ignored by Git by default because grocery phrases may be household-sensitive.
3. At the end of a cart run, append or update only genuinely unmatched phrases after reporting them to the user.
4. At the start or end of a later run, mention pending breadcrumbs briefly, for example: `Last time, Nespresso and 100 Plus were not in the catalog. Want to add products from your recent order after this cart is ready?`
5. Never delay matched cart items for breadcrumbs. Catalog maintenance remains an optional follow-up.
6. When the user approves a catalog update, pass relevant pending phrases into the existing review candidate `family_words` suggestions, but still require HTML approval before catalog insertion.
7. Mark a breadcrumb `resolved` only after catalog validation succeeds; keep `dismissed` entries from being repeatedly suggested.

## Decisions to make before implementation

- Exact filename and whether it belongs at the repository root or in a local state directory.
- Retention window and maximum entry count.
- Whether reminders appear at the start of a session, after cart verification, or both. The least disruptive default is after cart verification.
- Whether repeated phrases should be matched case-insensitively only or use the same normalization rules as catalog aliases.

## Suggested implementation order

1. Define and test the local schema and merge behavior.
2. Add the state file to `.gitignore` and document privacy/cleanup behavior.
3. Update `AGENTS.md` with non-blocking reminder rules.
4. Add dry-run coverage for recording, dismissing, and resolving breadcrumbs.
5. Test one full cycle: unmatched list item → later reminder → reviewed catalog update → resolved breadcrumb.

This is intentionally deferred from the current cart and catalog-update fixes.

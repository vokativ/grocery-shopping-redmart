# History rewrite runbook

Purpose: purge personal data that has already been published in this
repository's git history, then republish from a clean state. This is a
one-time maintenance task, not part of the shopping workflow.

## Why

A privacy audit (2026-11-12) found the following in the **public** history of
this repository, even though the current working tree is clean:

1. **Personal email in commit identities.** Early commits were authored with
   a personal mailbox address that is also the household Lazada login name.
   Publishing it hands out half of a credential pair for the account that
   holds the delivery address and payment methods.
2. **Lazada/RedMart order IDs.** Fifteen-digit, account-linked order numbers
   appeared in `grocery-catalog.yaml` notes (removed from the tree in commit
   `01f2dc8`) and in commit messages. All of them share a stable suffix, so
   together they form a linkable account fingerprint usable for
   support-desk social engineering or convincing phishing.
3. **Deleted order-harvest files.** `redmart-order-reading-scratch.md` and
   `redmart-catalog-candidates-2026-07-10.md` were committed on 2026-07-10
   and deleted in the "prepare project for public release" commit, but their
   blobs remain recoverable from history. They reconstruct three months of
   orders (products, prices, quantities, dates).

The example whiteboard photos are intentionally **kept**: they contain no
names, faces, addresses, or EXIF metadata (verified), and the owner accepts
the residual kitchen-interior and handwriting exposure.

## What the rewrite does

`scripts/rewrite-public-history.sh` automates steps 1–3 below in a fresh
clone. It prompts for the personal email at runtime and never writes it into
any repository file. Verification failures abort with a nonzero exit.

## Steps

1. **Fresh clone.** Never rewrite inside a working clone: local agent
   checkpoint refs (`.git/refs/t3/…`) hold snapshots with more order data and
   must not enter the rewrite.
2. **Rewrite with git-filter-repo:**
   - mailmap: personal email → `32364362+vokativ@users.noreply.github.com`
   - replace-text/replace-message: `\b[0-9]{15}\b` → `REDACTED-ORDER-ID`
   - invert-paths: the two scratch files listed above
3. **Verify** (the script does all of this):
   - `git log --all --format='%an %ae %cn %ce' | sort -u` — no personal email
   - `git log --all -p --format='%B' | grep -E '\b[0-9]{15}\b'` — empty
   - `git log --all --diff-filter=A --name-only --format=` — no scratch files
   - `gitleaks detect` — clean
4. **Export from GitHub** anything worth keeping (issues, PR text, releases,
   wiki, description, homepage URL, topics). PR #1's merged diff is already
   reflected in main; its conversation may be worth saving as text.
5. **Delete and recreate the GitHub repo.** A force-push does **not** purge
   GitHub: old SHAs stay reachable through cached views and pull-request refs
   until GitHub garbage-collects them, which may be never. Deleting the repo
   removes them (note: existing public forks detach rather than disappear):
   ```bash
   gh auth refresh -h github.com -s delete_repo
   gh repo delete vokativ/grocery-shopping-redmart --yes
   gh repo create vokativ/grocery-shopping-redmart --public \
     --description "..." --homepage "..."
   ```
6. **Push the rewritten history** from the output directory printed by the
   script (and re-apply topics if needed):
   ```bash
   git push -u origin main --tags
   ```
7. **Re-check CI** and run `gitleaks detect` once more from the pushed clone.
   After verifying, replace your local working clone with a fresh clone from
   the recreated repo (and copy your untracked `.env` over with `chmod 600 .env`).

## Prevention after the rewrite

- Keep the repo-local git identity on the noreply address:
  `git config user.email 32364362+vokativ@users.noreply.github.com`
- On GitHub: Settings → Emails → enable *Block command line pushes that
  expose my email*.
- `.gitleaks.toml` (committed) adds rules for 15-digit order IDs and personal
  mailbox addresses; run `gitleaks detect` locally before pushing catalog
  updates that mention orders.
- Rotate the Lazada password before republishing if it was ever shared with
  or printed by any agent session (see the audit); the old password must be
  considered exposed to those transcripts regardless of this rewrite.

#!/usr/bin/env bash
# Purges personal data from the full git history of this repository.
#
# What it removes from every commit:
#   1. Author/committer identity: the personal email collected at runtime is
#      remapped to the public noreply identity. The email is read interactively
#      and written only to a temp dir outside any repo, so this script itself
#      stays free of personal data.
#   2. Lazada/RedMart order IDs: every 15-digit number in blobs and commit
#      messages becomes REDACTED-ORDER-ID.
#   3. Two order-harvest scratch files that were committed and later deleted
#      but remain recoverable from history:
#        redmart-order-reading-scratch.md
#        redmart-catalog-candidates-2026-07-10.md
#
# The example whiteboard photos are intentionally KEPT (owner decision).
#
# This script only clones, rewrites, and verifies. Publishing (deleting and
# recreating the GitHub repo, then pushing) is a manual step documented in
# docs/history-rewrite-runbook.md; a force-push alone does not purge cached
# SHAs on GitHub.
#
# Requires: git, git-filter-repo (https://github.com/newren/git-filter-repo),
#           gitleaks (optional, for the final scan).

set -euo pipefail

REMOTE="${1:-git@github.com:vokativ/grocery-shopping-redmart.git}"
NOREPLY_DEFAULT="32364362+vokativ@users.noreply.github.com"
SCRATCH_FILES=(
  redmart-order-reading-scratch.md
  redmart-catalog-candidates-2026-07-10.md
)

say() { printf '\n==> %s\n' "$*"; }

command -v git >/dev/null || { echo "git not found" >&2; exit 1; }
command -v git-filter-repo >/dev/null || { echo "git-filter-repo not found; see https://github.com/newren/git-filter-repo" >&2; exit 1; }

say "This rewrites history in a FRESH CLONE of: $REMOTE"
read -rp "Personal email address to purge from history: " OLD_EMAIL
read -rp "Replacement noreply email [$NOREPLY_DEFAULT]: " NEW_EMAIL
NEW_EMAIL="${NEW_EMAIL:-$NOREPLY_DEFAULT}"
[ "$OLD_EMAIL" != "$NEW_EMAIL" ] || { echo "old and new email must differ" >&2; exit 1; }

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/redmart-rewrite-XXXXXX")"
trap 'rm -rf "$WORKDIR"' EXIT

# Mailmap and replace-text live outside the clone so the rewritten repo never
# contains the personal email or the order IDs ever again.
printf 'vokativ <%s> <%s>\n' "$NEW_EMAIL" "$OLD_EMAIL" > "$WORKDIR/mailmap"
printf 'regex:\\b[0-9]{15}\\b==>REDACTED-ORDER-ID\n' > "$WORKDIR/replace.txt"

say "Cloning $REMOTE into $WORKDIR/repo"
git clone "$REMOTE" "$WORKDIR/repo"
cd "$WORKDIR/repo"

say "Rewriting history (identity, order IDs, scratch files)"
INVERT_ARGS=()
for f in "${SCRATCH_FILES[@]}"; do INVERT_ARGS+=(--path "$f"); done
git filter-repo \
  --mailmap "$WORKDIR/mailmap" \
  --replace-text "$WORKDIR/replace.txt" \
  --replace-message "$WORKDIR/replace.txt" \
  --invert-paths "${INVERT_ARGS[@]}"

say "Verifying: no personal email in any author/committer field"
if git log --all --format='%an %ae %cn %ce' | grep -Fq "$OLD_EMAIL"; then
  echo "FAIL: personal email still present" >&2; exit 1
fi

say "Verifying: no 15-digit order IDs anywhere in history"
if git log --all -p --format='%B' | grep -qE '\b[0-9]{15}\b'; then
  echo "FAIL: 15-digit number still present" >&2; exit 1
fi

say "Verifying: scratch files absent from all history"
if git log --all --diff-filter=A --name-only --format= | grep -qE '^(redmart-order-reading-scratch\.md|redmart-catalog-candidates-2026-07-10\.md)$'; then
  echo "FAIL: scratch file still in history" >&2; exit 1
fi

if command -v gitleaks >/dev/null; then
  say "Running gitleaks over the rewritten history"
  gitleaks detect --redact || { echo "FAIL: gitleaks reported findings" >&2; exit 1; }
else
  say "gitleaks not installed; skipping the final scan"
fi

say "Rewrite complete and verified: $WORKDIR/repo"
echo "Temp cleanup is automatic on exit; to keep the clone, copy it now:"
echo "  cp -a $WORKDIR/repo ~/rewrite-output"
echo
echo "Next (manual, destructive) — see docs/history-rewrite-runbook.md:"
echo "  1. Export anything worth keeping from the GitHub repo (issues, PRs, releases)."
echo "  2. gh repo delete vokativ/grocery-shopping-redmart --yes"
echo "  3. gh repo create vokativ/grocery-shopping-redmart --public"
echo "  4. Push the rewritten clone: git push -u origin main --tags"

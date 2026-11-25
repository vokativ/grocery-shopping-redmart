#!/usr/bin/env bash
# Fail when a change touches the maintainer's protected files. Used by CI on fork pull requests.
# Usage: scripts/check-protected-paths.sh <base-ref> <head-ref>
set -euo pipefail

if [ "$#" -ne 2 ] || [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <base-ref> <head-ref>" >&2
  exit 2
fi

base="$1"
head="$2"

protected=(
  "grocery-catalog.yaml"
  "price-history.csv"
  "experiments/fairprice/backup-catalog.yaml"
)

# Three-dot: only changes made on the head side since it diverged from base.
if ! changed="$(git diff --name-only "$base...$head")"; then
  echo "check-protected-paths: could not diff $base...$head" >&2
  exit 2
fi

violations=()
while IFS= read -r file; do
  [ -z "$file" ] && continue
  for path in "${protected[@]}"; do
    if [ "$file" = "$path" ]; then
      violations+=("$file")
    fi
  done
done <<< "$changed"

if [ "${#violations[@]}" -gt 0 ]; then
  echo "This change modifies protected maintainer file(s):" >&2
  for file in "${violations[@]}"; do
    echo "  - $file" >&2
  done
  echo "Do not edit these files in a pull request. Put your own catalog under catalogs/<platform>/<handle>.yaml instead; see catalogs/README.md." >&2
  exit 1
fi

echo "No protected files changed."

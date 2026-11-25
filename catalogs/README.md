# Shared catalogs

Opt-in catalogs that anyone may use as a starting point. The maintainer's own catalog is `grocery-catalog.yaml` at the repo root; it is not a template for your household.

## Layout and naming

```text
catalogs/<platform>/<handle>.yaml
```

- `<platform>` is `redmart` or `fairprice` (`fairprice` is experimental).
- `<handle>` is lowercase letters, digits, and hyphens, for example `catalogs/redmart/sam-and-lee.yaml`. Use a handle you are happy to see public; avoid real names, street names, or anything that identifies your home.
- Every file must declare `store.platform`, matching its directory. Files without it are not listed as shared catalogs.

## Create one

1. Copy the matching example: `examples/redmart.catalog.yaml` or `examples/fairprice.catalog.yaml`.
2. Replace the items with your own products, keep `store.platform`, and validate: `node tools/validate-catalog.mjs --catalog catalogs/<platform>/<handle>.yaml`.
3. Check aliases with `node tools/dry-run.mjs --catalog catalogs/<platform>/<handle>.yaml --json "<alias>"`.

## Personal or shared

- **Personal:** save it as `grocery-catalog.local.yaml` (gitignored, detected automatically), or keep it outside the repository and point `GROCERY_CATALOG=/path/to/catalog.yaml` at it. Local price history lives beside it as `*.price-history.local.csv` (also gitignored).
- **Shared:** a file under `catalogs/` is public once pushed. Only share what you want public.

## No personal data

A catalog must not contain addresses, postal codes, a real store id (use `<YOUR_STORE_ID>`), order numbers, account details, or anything about who lives where. Product choices and notes about taste are fine only if you are comfortable publishing them.

## Contribution terms

By adding a shared catalog you license it under CC0 (public domain dedication) and confirm that it contains no private data. CI validates `catalogs/**/*.yaml` on every pull request.

## Protected paths

Pull requests from forks must not touch these files; CI fails them:

- `grocery-catalog.yaml`
- `price-history.csv`
- `experiments/fairprice/backup-catalog.yaml`

## Selecting a catalog

```bash
node tools/catalogs.mjs list [--json]        # candidates, active catalog, whether a choice is needed
node tools/catalogs.mjs select <path>        # validate and remember a catalog (.grocery-selection.local.json)
node tools/catalogs.mjs select <path> --acknowledge-experimental   # only after the user confirmed an experimental platform
node tools/catalogs.mjs current [--expect-platform <platform>]
node tools/catalogs.mjs clear                # forget the selection
```

Resolution order, first match wins: the tool's `--catalog` flag, the `GROCERY_CATALOG` environment variable, the selection file, `grocery-catalog.local.yaml`, then `grocery-catalog.yaml`. A flag, variable, or selection that points at a missing file is an error, never a silent fallback.

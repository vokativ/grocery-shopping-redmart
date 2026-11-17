# Full-catalog price comparison: RedMart vs FairPrice (2026-11-17)

Status: **experimental research.** Nothing here changes the RedMart workflow in [AGENTS.md](../../AGENTS.md); no FairPrice cart procedure is approved. Answers one question: what does the whole RedMart catalog cost today vs the FairPrice equivalent today. Companion to [catalog-mapping.md](catalog-mapping.md) (mapping, schema, earlier indicative run in §4), [site-structure.md](site-structure.md) and [private-labels.md](private-labels.md).

All numbers below come from [comparison.json](../../experiments/fairprice/snapshots/2026-11-17/comparison.json) / [comparison.md](../../experiments/fairprice/snapshots/2026-11-17/comparison.md) (full per-item table lives there). Figures marked **[derived]** are simple sums or differences of per-item values in `comparison.json` (not printed in `comparison.md`).

## 1. Answer

RedMart value of the full catalog today at default quantities: **S$847.25** (93 of 94 items priced; `apricots` has no available SKU). Of that, **69 items (S$549.34)** have an eligible FairPrice substitute and are compared; **24 items (S$297.91, 35.2%)** have none and are excluded (below).

Diff = FairPrice minus RedMart over the 69 comparable items; negative = FairPrice cheaper. `normalized` prices fractional packs (S$ per unit × packs needed); `whole_pack` buys whole packs and applies valid multi-buy offers.

| Policy | Mode | RedMart S$ | FairPrice S$ | Diff S$ | Diff % | FP cheaper / equal / dearer |
|---|---|---:|---:|---:|---:|---|
| like_for_like | normalized | 549.34 | 556.37 | +7.03 | **+1.3%** | 32 / 13 / 24 |
| like_for_like | whole_pack | 549.34 | 636.36 | +87.02 | **+15.8%** | 26 / 11 / 32 |
| house_brand_first | normalized | 549.34 | 552.03 | +2.69 | +0.5% | 34 / 11 / 24 |
| house_brand_first | whole_pack | 549.34 | 632.55 | +83.21 | +15.1% | 28 / 9 / 32 |
| cheapest | normalized | 549.34 | 539.79 | −9.55 | **−1.7%** | 37 / 11 / 21 |
| cheapest | whole_pack | 549.34 | 612.22 | +62.88 | +11.4% | 30 / 9 / 30 |

**Verdict.**

- Like-for-like, with fractional packs allowed, FairPrice is **roughly at parity (+1.3%)**; picking the cheapest eligible option on every line makes FairPrice about **1.7% cheaper**.
- Buying whole packs, FairPrice costs **11–16% more** for this basket. FairPrice pack sizes often do not match RedMart's (baby wipes cartons, salmon, minced meats, eggs, quinoa, hummus, …), so you buy more than you need. See §3.
- FairPrice's price level is therefore not the main problem; **pack granularity and the 35% of RedMart value (24 of 94 items) that is not comparable** are. Promo dependence and fees (§4) make even the parity figure fragile.
- The comparable subset is the same 69 items in all six rows.

### Excluded: no eligible FairPrice substitute (24 items, S$297.91)

An item is excluded when no mapped candidate is first-party, in stock, non-conflicting, `close`/`exact` and has a pack ratio. Candidate-level reasons per item: [comparison.md "Exclusions and gaps"](../../experiments/fairprice/snapshots/2026-11-17/comparison.md).

| Reason | Items (RedMart S$ at default quantity) | Σ S$ |
|---|---|---:|
| Requirement conflict / not the specified product | prosecco 118.00, remedy_sodaly_yuzu 22.40, orange_popsicles 9.90, spring_onion_kimchi 8.90, sliced_cheese 4.50 | 163.70 |
| Only approximate first-party matches (some also marketplace) | rice_crackers 13.65, ground_beef 9.10, floor_wet_wipes 9.20, big_garbage_bags 6.10, cream_cheese 4.33, dragonfruit 3.15, cream_cleanser 1.40 | 46.93 |
| Marketplace-only (excluded by rule) | milkfish 12.50, avocado 10.95, babaganoush 5.95, apples 4.95, pickles 4.90, papaya 3.48 | 42.73 |
| Out of stock | capsicum 4.35, broccoli 3.95, cottage_cheese 6.60, sweet_corn 3.90 | 18.80 |
| No mapped candidate | remedy_sodaly_guava 22.40 | 22.40 |
| Pack ratio missing | zucchini 3.35 | 3.35 |

Prosecco alone is S$118.00 (40% of the excluded value): FairPrice carries it only via a marketplace seller as a 6-pack carton (catalog-mapping §3).

## 2. Method

Script: [experiments/fairprice/compare.mjs](../../experiments/fairprice/compare.mjs). Pure local computation over four files; no network, no browser.

**Inputs.** Catalog [grocery-catalog.yaml](../../grocery-catalog.yaml) (94 items, `default_quantity`), mapping [catalog-mapping.yaml](../../experiments/fairprice/catalog-mapping.yaml) (97 entries, 236 candidates, `packs_per_redmart_pack` ratio per candidate), RedMart snapshot (133 rows), FairPrice snapshot (235 articles).

**RedMart side.** For each item take `preferred_products` in rank order; use the first rank whose snapshot row is `ok`, in stock and priced (rank fallback). Value = live price × `default_quantity`. No item used a fallback rank in this run; `apricots` (its only rank is unavailable) is unpriced. The mapping entry used is the one whose `redmart_ranks` contains the rank priced.

**FairPrice eligibility (per candidate).** Excluded if any of: marketplace (article id `90…` or inventory type MKP); `requirement_conflict`; `match_quality` not `exact`/`close`; `packs_per_redmart_pack` null; out of stock (`stock_scale` oos or `stock ≤ 0`, because `stockScale` alone is unreliable); live `DisplayUnit` differs from the mapped pack size; no live price. No pack changes, price changes or missing articles were found in the refresh (235/235 found, 0 price or pack drift vs the morning mapping; 115 articles have active offers; 20 now out of stock or with stock 0).

**Unit price.** The live per-unit shelf price after instant discount (`single_unit_price_sgd`), else MRP. Normalized cost = unit price × `packs_per_redmart_pack` × quantity.

**Whole-pack cost.** `n = ceil(packs_per_redmart_pack × quantity)` FairPrice packs. Multi-buy offers (`BXATP` "Buy N for $X", `BANYATP` "Any N for $X", N > 1) valid at the FairPrice fetch time apply as `floor(n/N) × X + (n mod N) × unit`. **Over-buy:** if rounding n up to the next multiple of N is cheaper than buying exactly n, the cheaper over-buy is used (only `handwash` triggers it: need 3 packs, `Any 6 for $5.60` costs S$5.60 vs S$6.00 for 3; 3 packs would be surplus). Basket-spend (`BMIN`) offers are dropped by the fetcher and not modelled. Multi-buys are not applied in normalized mode.

**Policies** (which eligible candidate is picked per item):

| Policy | Rule |
|---|---|
| `like_for_like` | Closest role first (same_product > same_brand > house_brand > equivalent), then lowest cost |
| `house_brand_first` | Cheapest eligible house-brand candidate; falls back to like_for_like |
| `cheapest` | Lowest cost regardless of role |

**Role-vs-rank rule.** `same_product` / `same_brand` describe a specific RedMart SKU. They only keep that ordering when the candidate's `matches_redmart_rank` is the rank actually priced; otherwise it is ordered as `equivalent`. `house_brand` is a concept-level substitute and keeps its role. Effect since the first run: e.g. `tomato_sauce` (RedMart #1 is passata) now compares passata to passata.

Ties in cost break by role order, then article id (arbitrary; e.g. the three baby-wipes variants all cost S$39.00 per pack).

**Reproduce:**

```
node experiments/fairprice/compare.mjs \
  --redmart experiments/fairprice/snapshots/2026-11-17/redmart-prices.json \
  --fairprice experiments/fairprice/snapshots/2026-11-17/fairprice-prices.json \
  --json experiments/fairprice/snapshots/2026-11-17/comparison.json \
  --markdown experiments/fairprice/snapshots/2026-11-17/comparison.md
```

Requires the `yaml` package. Without `--date`, offers are validated against the newest FairPrice `fetched_at` (2026-11-17T15:47:55Z); catalog and mapping default to the repo paths.

An independent re-implementation (Python, not the script's code) reproduced every total, every per-item selection and cost, the cheaper/equal/dearer counts and the S$847.25 full value for the earlier run. Two corrections were applied afterwards and the numbers above are from the corrected run: role-vs-rank (`matches_redmart_rank`) and whole-pack over-buy (`handwash`). The `100plus_frozen` ratio was also corrected to 1.0 after confirming the RedMart SKU is a 4-bar pack. [INFERENCE] The audit's figures predate those corrections; its qualitative findings still apply, its totals do not.

## 3. Where FairPrice wins, where RedMart wins

Per-item S$ difference (FairPrice minus RedMart, at default quantity), `like_for_like`, from `comparison.json`.

| Mode | FairPrice dearer (top 10) | FairPrice cheaper (top 10) |
|---|---|---|
| normalized | salmon +13.21, quinoa +5.81, cucumber +3.69, kiwi +3.28, dark_chocolate +3.15, ground_pork +2.72, pepsi_black +2.68, smoked_paprika +2.13, hummus +1.85, blueberries +1.00 | fabric_softener −3.73, baby_spinach −3.30, olive_oil −2.95, bread −2.91, lemon −2.68, apple_juice −2.08, yoghurt −2.05, pears −1.79, disinfectant_spray −1.39, apple_juice_boxes −1.38 |
| whole_pack | baby_wipes +25.10, salmon +18.00, quinoa +13.55, hummus +8.65, smoked_paprika +6.40, chicken_breast +5.30, ground_pork +4.65, cucumber +4.60, kiwi +4.41, bacon +4.10 | fabric_softener −3.73, olive_oil −2.95, baby_spinach −2.50, lemon −2.30, bread −2.15, apple_juice −2.08, yoghurt −2.05, disinfectant_spray −1.39, apple_juice_boxes −1.38, cheese_sticks −1.30 |

Pattern: FairPrice wins on same-brand grocery and household lines that are on promo or house-brand (Downy, Dettol, Farmers Union yoghurt, FairPrice olive oil / apple juice, lemons, pears). RedMart wins on fresh protein and produce where FairPrice's pack differs (salmon, minced pork, chicken breast, cucumber, kiwi), imported or premium lines (dark chocolate, quinoa), and a few branded cans (Pepsi Zero cans, S$20.50 vs S$17.82 for the RedMart 24-pack).

**What drives the whole_pack gap.** like_for_like whole_pack minus normalized is **+S$79.99** [derived: 636.36 − 556.37]. Top ten items by gap sum to +S$66.16 (83%) [derived]:

| Item | Normalized → whole-pack FairPrice S$ | Gap S$ | Why |
|---|---|---:|---|
| baby_wipes | 52.00 → 78.00 | +26.00 | Needs 1.33 FairPrice cartons per RedMart case, buys 2 (S$39.00 each). 32% of the gap alone |
| quinoa | 22.11 → 29.85 | +7.74 | 2.22 packs needed, buys 3 |
| hummus | 8.30 → 15.10 | +6.79 | 1.10 packs, buys 2 |
| chicken_breast | 7.31 → 12.80 | +5.49 | 1.14 packs, buys 2 |
| salmon | 43.11 → 47.90 | +4.79 | 1.80 packs, buys 2 |
| bacon | 5.45 → 9.90 | +4.46 | 1.10 packs, buys 2 |
| smoked_paprika | 5.23 → 9.50 | +4.27 | 1.10 packs, buys 2 |
| sliced_mozzarella | 9.14 → 11.70 | +2.56 | 1.56 packs, buys 2 |
| watermelon | 6.38 → 8.50 | +2.12 | 1.50 packs, buys 2 |
| ground_pork | 9.67 → 11.60 | +1.93 | 1.67 packs, buys 2 |

Only one item gets cheaper in whole-pack mode (`fresh_milk` −0.15, via `Any 2 for $3.95`). If the household only ever bought FairPrice packs that map ≈1:1 to RedMart's, the parity figure would be the better guide; the mismatched items are exactly where RedMart's pack is the larger or odder one. Whether leftovers are usable (frozen meat, eggs, wipes) is a household judgement, not computed.

## 4. Caveats

**FairPrice promo dependence.** 26 of the 69 like_for_like picks are priced below shelf MRP via an instant discount, worth about S$63.93 at the normalized quantities [derived: (MRP − unit price) × packs]; `baby_wipes` alone is S$24.00 of it (promo to 2026-12-01). Seven of those picks have promos ending **2026-11-19 04:00 SGT**, about two days after the snapshot: watermelon, kitchen_towel, toilet_tissue, pears, oranges, yoghurt, quinoa (S$11.52 of the discount) [derived]; `disinfectant_spray` ends 2026-11-26. If those seven reverted to MRP, the like_for_like normalized FairPrice total would rise by roughly S$11.52 to about S$567.89 (+3.4%) [derived]. Whole-pack figures also use five multi-buys (ham, dishwashing_liquid, handwash, kiwi, fresh_milk). `BMIN` basket promos (e.g. "Spend $70, get $7 off") are not modelled, so any such saving is missing, not counted.

**RedMart side is promo-blind.** Static HTML has no original price, voucher or discount data, and no delivery slot or stock count; RedMart availability here is the page's in-stock flag only. Live prices are the shelf price at fetch time, possibly already discounted, which is not distinguishable. 130 of 133 pages were `ok` and in stock.

**Fees not included on either side.** FairPrice: delivery fee S$5 below the free-delivery threshold (per seller; every compared pick is first-party, so one delivery); picking and packing fee S$3.99, waived for Digital Club at ≥ S$59 (site-structure §5). RedMart fees and vouchers were not captured. A basket of S$600+ would be over both free-delivery thresholds [INFERENCE: neither threshold re-verified; RedMart's not verified at all]; fees only matter for a partial or split basket.

**Judgement calls in the mapping** (all in `catalog-mapping.yaml`, none flagged as a requirement conflict):

| Item | Call | like_for_like normalized diff |
|---|---|---:|
| baby_spinach | FairPrice Kok Fah 200 g (ratio 0.5) vs RedMart 100 g washed, ready-to-eat; Kok Fah's ready-to-eat status is not stated | −3.30 |
| apple_juice | FairPrice Juice Apple 1 L vs RedMart NFC (not from concentrate); NFC not stated, probably from concentrate | −2.08 |
| kiwi | FairPrice "4–6 per pack" assumed 4 per pack vs RedMart 6s (ratio 1.5) | +3.28 |
| bread | Gardenia multigrain 400 g vs RedMart 320 g (ratio 0.8) | −2.91 |

Net −5.01; without these four lines like_for_like normalized would be about +S$12.04 on S$529.75 (+2.3%) [derived]. They move the verdict by about one percentage point, not its direction.

**Other.**

- `sliced_cheese` is excluded because the RedMart rank priced is #1 (Edam), which has no eligible FairPrice match, although RedMart #2 (cheddar, also S$4.50) has two close FairPrice matches. The script compares only the rank actually priced.
- FairPrice 100plus_frozen unit price S$4.95 is a promo (MRP S$5.85, valid to 2027-01-01).
- Stock: FairPrice `stock > 0` required. Hummus (13209203) had only 3 left at the refresh; availability for the quantities needed is not checked beyond `> 0`.
- Delivery timing: marketplace items and bulk quantities silently push FairPrice's earliest slot (site-structure §4a row 12). Picks here exclude marketplace items, but a full-catalog basket with high quantities might still hit the bulk threshold [INFERENCE].
- One store (165), one day, one session; origin, form and quality differences remain behind `close`.

## 5. Data quality findings to act on

| # | Finding | Action |
|---|---|---|
| 1 | `100plus_frozen` catalog `pack_size` is `75 ml`; the RedMart SKU is a **4-bar pack** (4 × 75 ml); the mapping ratio is now 1.0, which depends on that | Catalog fix needed; follow the normal approval flow (AGENTS.md) |
| 2 | Three catalog SKUs are **no longer available** on RedMart (404, "no longer available"): `sliced_cheese` rank 3, `apples` rank 2, `apricots` rank 1 | Catalog maintenance. `apricots` is the only one with no other rank, so it is unpriced and uncountable |
| 3 | RedMart live prices vs catalog `observed_price_sgd`: **33 rose, none fell**; rank-1 sum 628.39 → 656.90 (+4.5%) [derived]. Largest: salmon 25.71 → 29.90, avocado #2 9.95 → 13.90, fabric_softener 14.58 → 18.23, 100plus_zero_sugar_isotonic 13.90 → 16.80, olive_oil 18.81 → 20.90 | Refresh observed prices in the catalog under the normal flow; it explains why the earlier indicative run (catalog-mapping §4: RedMart S$553.31 vs FairPrice S$554.22 on 75 items, stale RedMart prices) is not comparable to this one |

Also noted: the earlier indicative run's figures are superseded by this document, not corrected by it (different item set and methodology).

## 6. Reproduce / refresh

How the 2026-11-17 snapshots were collected (no cart actions, no browser):

| Side | Method |
|---|---|
| RedMart | Static HTML fetch of each of the 133 catalog `canonical_url`s, 3–5 s spacing. Extracts live title, price, in-stock flag (schema `InStock` + add-to-cart enabled), purchase limit. 130 `ok`, 3 `unavailable`. Static HTML has no stock count, original price or delivery slot |
| FairPrice | Public API lookup by exact article id (235 unique), ≤ 1 request/s, store 165, `orderType=DELIVERY`. Records MRP, discount, stock, `stockScale`, `DisplayUnit`, offers; drops expired offers and `BMIN` offers. 235 found, 0 failed |

Files in `experiments/fairprice/snapshots/2026-11-17/`:

| File | Content |
|---|---|
| `redmart-prices.json` | 133 RedMart rows (catalog id, rank, item/sku ids, live title and price, status, in-stock) |
| `fairprice-prices.json` | 235 FairPrice article rows (price, stock, pack, offers, `fetched_at`) |
| `comparison.json` | Machine-readable result: totals, per-item picks for all policy × mode, exclusions |
| `comparison.md` | Rendered tables, including the full per-item table and per-candidate exclusion reasons |

Re-run with the §2 command. To refresh, re-fetch both snapshots in the same shapes, then re-run; promo-dependent picks (§4) change fastest. Re-verify `catalog-mapping.yaml` before relying on it again: slugs are unstable (resolve by article id, site-structure §2).

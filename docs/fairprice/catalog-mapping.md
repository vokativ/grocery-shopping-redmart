# RedMart catalog → FairPrice mapping (experimental)

Status: **experimental research for a future RedMart vs FairPrice price comparison.** Nothing here changes the RedMart workflow in [AGENTS.md](../../AGENTS.md). No FairPrice cart procedure is approved. Companion to [site-structure.md](site-structure.md) (identity, price fields, API base `$API`) and [private-labels.md](private-labels.md) (house-brand labels). Data file: [experiments/fairprice/catalog-mapping.yaml](../../experiments/fairprice/catalog-mapping.yaml).

## 1. Status and scope

| Fact | Value |
|---|---|
| What | For each RedMart catalog item ([grocery-catalog.yaml](../../grocery-catalog.yaml)), the FairPrice products that could replace it, with pack-size ratio and price at one date |
| Snapshot | 2026-11-17, FairPrice online store `165` (household delivery area), `orderType=DELIVERY` |
| Primary key | `article_id` (FairPrice `clientItemId`); slug is a mutable lookup key, see site-structure §2 |
| Size | 94 catalog items → **97 concept entries** (`sliced_cheese` split into Edam / cheddar / Emmental; `apples` into green / red; both pairs share one `catalog_item_id`, so key on `catalog_item_id` + `redmart_ranks`), **236 FairPrice candidates** |
| Consumers | None. Not read by any tool; does not change AGENTS.md shopping rules |

Method:

1. **Mapping pass**, one chunk per category (household, chilled a/b, produce a/b, pantry, frozen/beverages/bakery). Public unauthenticated API, ≤1 req/s. Each catalog item searched by product keywords, brand and house-brand filter (`filter=brand:fairprice,pasar,homeproud,simply-finest`); candidates recorded with exact `article_id`, size, mrp, offers, stock.
2. **Independent adversarial verify + correct pass** per chunk (observed 2026-11-17). Every candidate re-looked-up by exact `q=<article_id>`; slug, title, brand, barcode, DisplayUnit, mrp, `stockScale`, marketplace flag and offers compared with the stored data; `packs_per_redmart_pack` recomputed; missed candidates searched. **No price, slug or stock drift found** between the two passes (same day). All edits were classification, evidence and completeness fixes.

What the verifiers changed (all chunks):

| Kind | Changes |
|---|---|
| Status | `big_garbage_bags` mapped → partial (every candidate approximate; no litre/handle-tie spec on any listing). `milkfish` mapped → partial and `orange_popsicles` mapped → partial (only marketplace candidates). `handwash`, `feta_cheese`, `hummus`, `ham`, `pepsi_black` partial → mapped (a first-party, in-stock, non-conflicting close candidate exists) |
| Role | `pepsi_black` 13287400 same_brand → same_product (identical Pepsi Zero 320 ml can, 12-pack vs RedMart 24-pack). `kimchi` I'm Kimchi → same_product/exact; CJ Bibigo equivalent → same_brand |
| Requirement conflict | President Sandwich Cheddar 13046007 and Emmental Toast 13046008 set `requirement_conflict: true`: **processed** cheese slices (about 5% cheddar/Emmental, butter, whey, emulsifying salts) vs RedMart "100% Natural Cheese". Arla Gouda/Cheddar/Emmental confirmed natural from ingredients |
| Match quality | Downgraded: Philadelphia block (cream cheese), frozen minced pork (Porkee, Yummy Fresh vs chilled Australian), bacon bits 13196057 / 13035078 exact → close (origin NL/SG vs Danish), China broccoli exact → close, NuFresh flushable wipes approximate → close (listing says safe to flush). Upgraded: Chobani pouches close → exact (product image evidence), Delicato smoked chicken breast |
| Promo | `valid_till` filled on 13 promos that had `null` (feta, butters, yoghurts, bacon, pork belly, mozzarella slices); now all 114 promos carry a date |
| Added candidates | Missed first-party and marketplace options appended: eggs (Seng Choon, Pasar 550 g), Honey Baked Ham, Magnolia milks, Meiji Greek yoghurt, Tradition bacon, Delphi classic hummus, Ceres 100% apple juice, Cowhead / Perfect Italiano mozzarella, Kleenex / Magiclean / Kleen-Up wipes, dishwashing 4 x 600 ml and pump+refill, Altamura baby spinach, white dragon fruit, yellow onion 1 kg, butterhead lettuce 200 g, Japanese cucumber 330 g, and others |
| Notes | Stale-slug text, per-rank ratios and unverified attributes (waxed lemon, kiwi count) written into candidate notes |

Scope limits: one store (165), one day, one session. Not every catalog rank has a FairPrice counterpart (see §3). Equivalence is a judgement recorded in `match_quality` and notes, not a guarantee.

## 2. Schema reference

Top level: `mapping_version: 1`, `status: experimental`, `store{name, store_id, price_snapshot_date, primary_key, url_rule, notes[]}`, `mappings[]`.

### Entry (`mappings[]`, 97)

| Field | Type | Meaning |
|---|---|---|
| `catalog_item_id` | string | `id` in grocery-catalog.yaml. **Not unique** across entries (`sliced_cheese` ×3, `apples` ×2) |
| `concept` | string | Product concept this entry covers (variety / spec); distinguishes the shared ids |
| `redmart_ranks` | int[] | Catalog `preferred_products` ranks the FairPrice candidates stand in for |
| `redmart_reference` | object | The one RedMart product ratios are computed against: `rank`, `title`, `pack_size` (free text), `observed_price_sgd`, `item_id`, `sku_id`, `quantity{value, unit}` (unit `g`, `ml` or `count`; multipack totals, e.g. 15 × 60 g = 900 g, 24 × 320 ml = 7680 ml). May be one of several ranks in `redmart_ranks` |
| `household_requirement` | string | Constraint taken from catalog aliases/notes (brand, variety, organic, scent, size) that decides `requirement_conflict` |
| `status` | enum | `mapped`, `partial`, `no_match`, see below |
| `fairprice` | list | Candidates (0–5 per entry; 2 entries have none) |
| `notes` | string | Searches run, what was excluded and why, caveats |

`status` as applied by the verifiers (not defined in the file header):

| Status | Rule | Entries |
|---|---|---:|
| `mapped` | ≥1 candidate that is first-party (non-marketplace), non-conflicting and `close` or `exact` | 75 |
| `partial` | Candidates exist but every one is `approximate`, `requirement_conflict`, or marketplace-only | 20 |
| `no_match` | No candidate | 2 |

### Candidate (`fairprice[]`, 236)

| Field | Type | Meaning |
|---|---|---|
| `role` | enum | `same_product` (identical product, possibly different multipack), `same_brand` (brand matches, product differs), `house_brand` (FairPrice-owned label: Fairprice, Pasar, Homeproud, Simply Finest, Harvest Fields, …), `equivalent` (other brand, same purpose) |
| `article_id` | string | Primary key. 8 digits starting `1` = FairPrice-fulfilled; starting `90` = marketplace seller |
| `barcode` | string | EAN, secondary exact key |
| `slug`, `url` | string | Slug captured 2026-11-17 and `https://www.fairprice.com.sg/product/<slug>`. **Not stable**; some marketplace slugs carry no article id. Re-resolve before use (§6) |
| `title`, `brand` | string | Listing name and `brand.name` |
| `house_brand` | bool | FairPrice-owned label per private-labels.md (also true for brand-tag oddities such as Homeproud bags). 67 true; 66 have `role: house_brand` |
| `partner_exclusive` | bool | Partner label (Good Today, Yorihada, …). All false in this snapshot |
| `marketplace` | bool | Third-party seller (`90` prefix / `inventoryType MKP`). Seller-set price and stock; separate delivery |
| `pack_size` | string | `metaData.DisplayUnit`, free text as shown (`4 per pack`, `130 G`, `200g (10 per pack)`) |
| `quantity` | `{value, unit}` | Normalised from DisplayUnit/SAP name; `g`, `ml`, `count`. `4 per pack` of 75 ml bars is stored as 300 ml |
| `packs_per_redmart_pack` | number or null | **RedMart pack quantity / FairPrice pack quantity**, i.e. FairPrice packs needed to equal one `redmart_reference` pack. 2 = buy two FairPrice packs; 0.5 = FairPrice pack is twice as big. Null when units differ (g vs ml) or weight unknown (8 candidates). Relative to the **referenced rank only**: other ranks have other ratios, noted in `notes` |
| `mrp_sgd` | number | Shelf price (`storeSpecificData[0].mrp`) |
| `promo` | object or null | Best offer: `type` (`BXATP`, `BANYATP`), `description`, `unit_price_sgd` (null when only a total exists), `buy_qty`, `total_sgd`, `valid_till` (date). `BMIN` basket offers not recorded. 114 of 236 candidates carry one |
| `stock_scale` | enum | `inStock`, `low`, `oos` (224 / 4 / 8) |
| `match_quality` | enum | `exact` (same product, size comparable), `close` (same type, minor difference in brand/origin/size), `approximate` (different form, variety, spec or size >±30%) |
| `requirement_conflict` | bool | Violates `household_requirement` (wrong brand, flavour, variety, processed vs natural). 25 true |
| `notes` | string | Evidence, size/origin remarks, ratio vs other ranks, stale-slug warnings |

Ratio check: `packs_per_redmart_pack` × FairPrice price = cost of one RedMart-equivalent pack. This assumes you can buy fractional FairPrice packs (see §4).

## 3. Coverage summary

| Measure | Count |
|---|---:|
| Catalog items | 94 |
| Entries | 97 |
| Candidates | 236 (1–5 per entry: 1 ×15, 2 ×37, 3 ×29, 4 ×10, 5 ×4; 0 ×2) |
| Status mapped / partial / no_match | **75 / 20 / 2** |
| Roles equivalent / house_brand / same_product / same_brand | 125 / 66 / 33 / 12 |
| `house_brand: true` candidates | 67 |
| `match_quality` close / approximate / exact | 120 / 61 / 55 |
| Marketplace candidates | 33 |
| Requirement conflicts | 25 |
| Out of stock (`oos`) / `low` | 8 / 4 |
| Candidates with a promo / valid_till on or before 2026-11-19 | 114 / 36 |

The 8 `oos` candidates: chicken breast 13097675, papaya ×2 (marketplace), kimchi 90209695 (marketplace), green apple 90175758 (marketplace), spring onion kimchi 90209696 (marketplace), Wall's Yakoo orange 13266563, Australia broccoli 13236579.

### Not fully mapped (22 entries)

Marketplace-only or marketplace-plus-weak first-party (candidate exists, but not a first-party like-for-like):

| Entry | Why |
|---|---|
| avocado | All fresh Hass avocado on FairPrice is marketplace (90104649 close, 90248316 approximate) |
| papaya | Only marketplace, both `oos`. Agro Fresh green papaya excluded (cooking papaya) |
| babaganoush | Delphi aubergine dip 170 g marketplace only; no first-party dip |
| apples (green) | Granny Smith only via marketplace (YayaPapaya 4s in stock, Zenxin organic `oos`) |
| pickles | Cornichons 340 g (Sainsbury's) / 185 g (Monoprix): all gherkin jars marketplace |
| milkfish | Sarangani Bay: three same_product listings, all marketplace sellers |
| orange_popsicles | Frozt Orange exact but marketplace; first-party Wall's Yakoo is a brand conflict and `oos` |
| remedy_sodaly_yuzu | Remedy Sodaly only via marketplace (330 ml, 8 × 330 ml); Pokka honey yuzu is a conflict |
| prosecco | Loose Moose only as 6 × 750 ml carton, marketplace (S$177); first-party Just Wine Zimor / Beato are brand conflicts |
| spring_onion_kimchi | JIN spring onion exact but marketplace and `oos`; first-party Jin Original (cabbage) is a conflict |
| rice_crackers | Ceres brown rice cakes not listed; first-party Ceres Brown Rice Bites 100 g is a puffed snack (approximate); Clearspring rice cakes marketplace |
| dragonfruit | First-party only a yellow single fruit (approximate); white/red options marketplace |

Product or variety not stocked (first-party):

| Entry | Why |
|---|---|
| sliced_cheese (Edam) | No Edam slices; Gouda substitutes (Harvest Fields, Arla) flagged as conflict. Cheddar and Emmental entries are mapped |
| apples (red / Royal Gala, organic) | Searches return nothing; Joya and Candy apples flagged as conflict |
| ground_beef | Fresh chilled Australian minced beef not first-party; frozen 300 g options (Chef Delights, Amir's) approximate; chilled options marketplace |
| cream_cheese | Only Philadelphia 250 g block (approximate vs tub / spreadable) |
| apricots (**no_match**) | No fresh apricot on FairPrice at snapshot; only dried fruit, jam, cosmetics |
| remedy_sodaly_guava (**no_match**) | No guava Sodaly or Remedy guava soda |

Size or specification not comparable:

| Entry | Why |
|---|---|
| big_garbage_bags | Homeproud bags state Small/Medium/Large only; no litres or handle ties. Large 20s, Medium 30s, 10+2 (76 × 99 cm, oversize) all approximate |
| cream_cleanser | Cif 3 × 660 g trays (g vs ml; ratio null). About S$2.00 per bottle if one bottle = one RedMart bottle [INFERENCE] |
| floor_wet_wipes | No lavender 3 × 15 pack; Magiclean 12/16 sheets, Kleen-Up 15 (lemon/rose) |
| zucchini | Thygrace 2 per pack, weight unknown (ratio null), closest non-marketplace |

## 4. First naive comparison (indicative, NOT a result)

Produced once by an ad-hoc integration script (not committed) from this mapping at default catalog quantities. Rule used:

- Rows contribute to the totals only when the RedMart reference has a price and at least one candidate qualifies; that happened for exactly the 75 `status: mapped` entries.
- A candidate qualifies when it is non-marketplace, not `requirement_conflict`, `match_quality` exact or close, and `packs_per_redmart_pack` not null. Stock was **not** filtered; no `oos` candidate won a row in this snapshot.
- FairPrice price = `promo.unit_price_sgd` when set, else `mrp_sgd`; cost per RedMart pack = price × `packs_per_redmart_pack`; cheapest qualifying candidate wins whatever its role.
- RedMart price = catalog `observed_price_sgd`; totals weight each row by catalog `default_quantity` (the `qty` column).

**Totals line: 75 comparable items at default quantities, RedMart S$553.31 vs FairPrice S$554.22, roughly parity.** Per RedMart pack, FairPrice is cheaper on 38 rows, equal (±S$0.005) on 9, RedMart cheaper on 28. Cheapest pick by role: equivalent 35, house_brand 23, same_product 15, same_brand 2. The partial / no_match rows (`—`) are not in the totals, so the total says nothing about the 22 hardest items.

Caveats that dominate it:

- **RedMart prices are not live.** They are catalog `observed_price_sgd` values (catalog note: reference from 2026-07-07; items rebuilt from later orders carry other dates), about four months older than the FairPrice 2026-11-17 prices. [INFERENCE] Some of the gaps below are price drift, not retailer difference.
- **Fractional packs.** `packs_per_redmart_pack` assumes you can buy 0.33 of a pack. Baby spinach: Simply Finest 300 g at S$2.00 vs RedMart 100 g at S$3.77 shows S$0.67 (−82%), but you can only buy 300 g (S$2.00, 3× the quantity, possibly waste). Similar: salmon (400 g × 2.25), minced pork (300 g × 1.67), chicken breast (350 g × 0.57), cherry tomatoes (500 g × 0.5), ham (1.67 packs), baby wipes (18 × 80 carton, 1.33). Whole-pack cost can be higher or lower.
- **Promo handling is inconsistent.** Promo `unit_price_sgd` was used whenever populated, including four winners that need a multi-buy: dishwashing_liquid (Buy 2 for S$2.30), handwash (Any 6 for S$5.60), tissue_box (Buy 2 for S$9.25), disinfectant_spray (Any 2 for S$9.90). Where only a total exists (`unit_price_sgd` null, e.g. kiwi Buy 2 for S$9.45) mrp was used. Counting single-unit promos only, FairPrice total is **S$559.87** (+1.0%) instead of S$554.22. 36 of 114 promos end on or before 2026-11-19.
- **"Cheapest equivalent" ignores household preference.** It may pick a different brand or role than the household would (e.g. Dasoon eggs, Okeanoss salmon, Gardenia bread, Lindt chocolate). The `closest-role alt` column shows the same_product/house_brand price where one exists.
- **Fees excluded.** FairPrice: delivery fee (S$5 under the free-delivery threshold; per seller, so marketplace items add deliveries), S$3.99 picking and packing fee waived for Digital Club ≥ S$59 (site-structure §5). RedMart delivery/voucher/fee structure not modelled either. Not included on either side.
- **Different pack = different quality.** Origin, form (frozen vs chilled), organic and waxed status differ in places despite `close`.

Directional signals (not conclusions; each row depends on the caveats above):

- **FairPrice cheaper on house-brand staples:** dishwashing refill (1.44 vs 1.90), handwash refill (1.17 vs 3.15, depends on Any 6), butter (4.13 vs 5.70), low-fat milk (1.94 vs 3.40), apple juice 1 L (2.42 vs 4.50), lemons (2.47 vs 5.15), disinfectant spray house brand (4.95 vs 9.04; Dettol itself 9.00 on promo). Also broccoli, baby spinach, bread.
- **RedMart cheaper on:** salmon (25.71 vs 41.63), chicken breast, minced pork (6.95 vs 9.67), kiwi (5.04 vs 8.32), dark chocolate (8.80 vs 11.95), smoked paprika (3.10 vs 5.23), Pepsi Zero cans (17.82 vs 20.50), 100PLUS cans (13.90 vs 16.35).
- **Parity** on most same_product brand lines (Persil 15.29 vs 14.55, Downy, Clorox, Magiclean, Mission, Marigold, Chobani).

Per-item table (`FairPrice cheapest equiv` is S$ per RedMart pack, role and `article_id` in brackets; `qty` is the catalog default quantity; `closest-role alt` is the best same_product or house_brand price when different):

| item | concept | qty | RedMart S$/pack | FairPrice cheapest equiv S$/RedMart-pack | closest-role alt | status |
|---|---|---:|---:|---|---|---|
| big_garbage_bags | big black garbage bags 50L with handle ties | 2 | 2.44 | — |  | partial |
| persil_powder | Persil anti-bacterial low-suds powder detergent 4.5kg | 1 | 15.29 | 14.55 (same_product, 13141092) |  | mapped |
| dishwashing_liquid | antibacterial lemon dishwashing liquid | 1 | 1.9 | 1.44 (house_brand, 13210280) | 1.88 (same_product) | mapped |
| handwash | anti-bacterial lavender foaming hand soap | 2 | 3.15 | 1.17 (house_brand, 13277511) |  | mapped |
| toilet_wipes | flushable wet toilet wipes (60 sheets) | 2 | 3.7 | 3.50 (equivalent, 13188255) |  | mapped |
| tissue_box | 2-ply facial tissue 5 boxes | 1 | 5.05 | 4.63 (house_brand, 11654448) |  | mapped |
| kitchen_towel | 2-ply kitchen paper towel 6 rolls x 60 sheets | 1 | 4.55 | 4.70 (house_brand, 13084758) |  | mapped |
| toilet_tissue | 3-ply toilet tissue 10 rolls x 200 sheets | 1 | 5.6 | 5.18 (equivalent, 13088911) | 5.75 (house_brand) | mapped |
| fabric_softener | Downy Sunrise Fresh concentrate fabric softener 3.5L | 1 | 14.58 | 14.50 (same_product, 13216049) |  | mapped |
| dry_wipes | dry wiper sheets 3 x 20 (lemongrass) | 1 | 7.55 | 8.50 (equivalent, 13104222) |  | mapped |
| disinfectant_wipes | Clorox disinfecting cleaning wipes Crisp Lemon 35s | 1 | 4.59 | 4.59 (same_product, 13144759) |  | mapped |
| floor_cleaner | Magiclean Aromatic Lavender floor cleaner 3L | 1 | 7.5 | 7.95 (same_product, 11953931) |  | mapped |
| cream_cleanser | cream cleanser ('Cif') ~500ml | 1 | 1.4 | — |  | partial |
| floor_wet_wipes | floor wet wiper sheets 3 x 15, lavender | 1 | 9.2 | — |  | partial |
| baby_wipes | baby wet wipes bulk case 24 x 80 | 1 | 52.9 | 52.00 (house_brand, 12714521) |  | mapped |
| disinfectant_spray | Dettol disinfectant spray Crisp Breeze 450ml | 1 | 9.04 | 4.95 (house_brand, 13243915) | 9.00 (same_product) | mapped |
| eggs | eggs (generic, 15 x 60g) | 1 | 4.65 | 4.70 (equivalent, 13065350) | 5.67 (house_brand) | mapped |
| ham | smoked chicken ham (150g) | 1 | 4.4 | 5.17 (house_brand, 13270266) |  | mapped |
| chicken_breast | chicken breast, boneless (fresh) | 2 | 2.62 | 3.66 (equivalent, 13282982) |  | mapped |
| ground_beef | minced beef (fresh, Australia) | 1 | 9.1 | — |  | partial |
| ground_pork | minced pork | 1 | 6.95 | 9.67 (house_brand, 13280658) |  | mapped |
| sliced_cheese | sliced Edam cheese | 1 | 4.5 | — |  | partial |
| sliced_cheese | sliced cheddar cheese | 1 | 4.5 | 4.57 (house_brand, 13275930) |  | mapped |
| sliced_cheese | sliced Emmental cheese | 1 | 6.1 | 8.00 (equivalent, 13062292) |  | mapped |
| shredded_mozzarella | shredded mozzarella cheese | 1 | 4.4 | 3.93 (house_brand, 13286189) |  | mapped |
| cheese_sticks | kids cheese sticks | 2 | 7.85 | 7.20 (same_product, 10639414) |  | mapped |
| kimchi | kimchi (JIN spicy preferred) | 1 | 6.9 | 6.48 (same_brand, 12561382) | 6.80 (same_product) | mapped |
| cream_cheese | cream cheese | 1 | 4.33 | — |  | partial |
| cottage_cheese | cottage cheese (low fat) | 1 | 6.6 | 6.60 (same_product, 13042048) |  | mapped |
| fresh_milk | full cream milk (1L) | 2 | 2.05 | 2.05 (house_brand, 13290817) |  | mapped |
| low_fat_milk | low fat milk (946ml) | 1 | 3.4 | 1.94 (house_brand, 13290797) | 3.73 (same_product) | mapped |
| feta_cheese | feta cheese (Greek, block) | 2 | 7.4 | 6.95 (equivalent, 13196767) |  | mapped |
| spring_onion_kimchi | spring onion kimchi (pa kimchi) | 1 | 8.2 | — |  | partial |
| butter | butter (Anchor unsalted block) | 1 | 5.7 | 4.13 (house_brand, 13218508) | 5.70 (same_product) | mapped |
| yoghurt | Greek-style natural yoghurt 1kg (Farmers Union) | 1 | 10.34 | 7.95 (equivalent, 13250348) | 9.65 (same_product) | mapped |
| strawberry_pouch_yoghurt | Chobani Kids strawberry pouch yoghurt 100g | 2 | 2.95 | 2.95 (same_product, 13266556) |  | mapped |
| vanilla_pouch_yoghurt | Chobani Kids vanilla pouch yoghurt 100g | 2 | 2.95 | 2.95 (same_product, 13266555) |  | mapped |
| bacon | streaky bacon (RedMart house brand) | 1 | 5.8 | 5.14 (equivalent, 11694896) | 5.45 (house_brand) | mapped |
| bacon_bits | Danish bacon bits (RedMart house brand) | 1 | 5 | 3.92 (equivalent, 13035078) | 3.95 (house_brand) | mapped |
| hummus | hummus dip (RedMart Deli; Delphi low-fat rank 2) | 1 | 6.45 | 8.30 (equivalent, 13209203) |  | mapped |
| pork_belly | pork belly slices (sukiyaki-cut, frozen; rank 2 fresh) | 1 | 6.5 | 6.15 (equivalent, 13209693) |  | mapped |
| sliced_mozzarella | sliced mozzarella cheese slices | 1 | 8.9 | 9.14 (house_brand, 13275931) |  | mapped |
| babaganoush | babaganoush eggplant dip | 1 | 5.95 | — |  | partial |
| capsicum | tri-colour capsicum / bell peppers (3 pack) | 1 | 4.35 | 4.60 (equivalent, 11620213) |  | mapped |
| papaya | papaya (ripe, solo/red) | 1 | 3.48 | — |  | partial |
| watermelon | small Thai watermelon (whole, ~1.8kg) | 1 | 6.95 | 6.38 (equivalent, 13196980) |  | mapped |
| lemon | lemon | 1 | 5.15 | 2.47 (equivalent, 13218308) |  | mapped |
| avocado | Hass avocado (3-pack) | 1 | 10.95 | — |  | partial |
| apples | green apples / Granny Smith | 1 | 4.95 | — |  | partial |
| apples | red apples / Royal Gala (organic preferred) | 1 | 5.85 | — |  | partial |
| pears | Packham pears | 1 | 4 | 2.21 (same_brand, 13273730) |  | mapped |
| kiwi | green kiwi fruit (6 pack) | 1 | 5.04 | 8.32 (equivalent, 13045571) |  | mapped |
| oranges | easy-peel mandarin oranges | 1 | 4.5 | 4.95 (equivalent, 13140720) |  | mapped |
| lettuce | baby romaine lettuce / salad lettuce | 1 | 1.95 | 1.95 (house_brand, 11208122) |  | mapped |
| onions | brown / yellow onion (1kg) | 1 | 3.39 | 2.71 (equivalent, 10736476) |  | mapped |
| cucumber | Japanese cucumber | 3 | 1.8 | 1.80 (equivalent, 13097478) | 2.40 (house_brand) | mapped |
| zucchini | zucchini / courgette (green) | 1 | 3.35 | — |  | partial |
| cherry_tomatoes | cherry tomatoes (fresh) | 2 | 1.85 | 1.82 (house_brand, 10762156) |  | mapped |
| dragonfruit | dragon fruit (2 pieces) | 1 | 3.15 | — |  | partial |
| carrots | carrots 500 g (Australia) | 1 | 0.95 | 0.95 (equivalent, 10733611) | 1.10 (house_brand) | mapped |
| potatoes | potatoes (Holland, 1 kg) | 1 | 1.65 | 1.45 (house_brand, 13057650) |  | mapped |
| blueberries | blueberries (fresh, 125 g) | 1 | 2.95 | 3.95 (equivalent, 10632060) |  | mapped |
| sweet_corn | sweet corn 2s (550 g) | 2 | 1.95 | 1.65 (house_brand, 10388088) |  | mapped |
| apricots | fresh apricots (Turkey sugar apricot, 350 g) | 1 | 7.95 | — |  | no_match |
| sweet_potatoes | Japanese sweet potato (500 g) | 1 | 2.33 | 1.90 (equivalent, 13290007) |  | mapped |
| broccoli | broccoli (280 g) | 1 | 3.36 | 2.10 (equivalent, 13297030) |  | mapped |
| asparagus | fine asparagus 100 g | 1 | 2.65 | 2.70 (house_brand, 10734024) |  | mapped |
| baby_spinach | baby spinach (washed, ready to eat, 100 g) | 1 | 3.77 | 0.67 (house_brand, 13167900) |  | mapped |
| rice_crackers | brown rice cakes (Ceres Organics Original) | 3 | 4.55 | — |  | partial |
| tortilla_chips | Mission Multigrain corn/tortilla chips | 1 | 4.17 | 4.17 (same_product, 13095707) |  | mapped |
| coconut_oil | coconut cooking oil (Marca Leon 1L) | 1 | 9.65 | 10.45 (equivalent, 13240137) |  | mapped |
| olive_oil | extra virgin olive oil 1L | 1 | 18.81 | 17.95 (house_brand, 10927141) |  | mapped |
| tomato_sauce | tomato passata / pasta sauce | 1 | 2.72 | 3.06 (equivalent, 12361778) | 5.14 (same_product) | mapped |
| mayonnaise | real mayonnaise 425ml | 1 | 5.06 | 5.64 (equivalent, 13286647) |  | mapped |
| rice_paper | rice paper (spring roll wraps) | 2 | 1.56 | 1.02 (equivalent, 10606479) |  | mapped |
| farfalle_pasta | farfalle (bow tie) pasta 500g | 1 | 4.2 | 3.63 (equivalent, 13217102) |  | mapped |
| penne_pasta | wholewheat penne 500g | 1 | 2.97 | 3.99 (equivalent, 13167740) |  | mapped |
| fusilli_pasta | wholewheat fusilli 500g | 1 | 3.4 | 2.59 (house_brand, 13185361) |  | mapped |
| mission_mini_wraps | Mission mini wraps (8 per pack, 300g) | 3 | 5.45 | 5.55 (same_product, 13195540) |  | mapped |
| lotus_biscoff | Lotus Biscoff biscuits 312.5g | 1 | 8.83 | 7.90 (same_product, 13015789) |  | mapped |
| pickles | cornichons / gherkins 340g | 1 | 4.9 | — |  | partial |
| smoked_paprika | smoked paprika powder | 1 | 3.1 | 5.23 (equivalent, 13246388) |  | mapped |
| dark_chocolate | dark chocolate ~72% cocoa 100g | 1 | 8.8 | 11.95 (equivalent, 13026073) |  | mapped |
| quinoa | organic tricolour quinoa 500g | 2 | 8.15 | 9.20 (equivalent, 13096421) | 11.05 (house_brand) | mapped |
| ground_chicken | minced chicken (frozen) | 1 | 5.95 | 6.92 (equivalent, 13224927) |  | mapped |
| apple_juice | apple juice 1L (100% / NFC) | 1 | 4.5 | 2.42 (house_brand, 13235866) |  | mapped |
| apple_juice_boxes | Marigold 100% apple juice 6x200ml boxes | 2 | 5.29 | 4.60 (same_product, 13137510) |  | mapped |
| pepsi_black | Pepsi Zero Sugar (black) cans | 1 | 17.82 | 20.50 (same_product, 13287400) |  | mapped |
| remedy_sodaly_yuzu | Remedy Sodaly Yuzu Lemon | 2 | 9.4 | — |  | partial |
| 100plus_zero_sugar_isotonic | 100PLUS Zero Sugar Isotonic 24 x 325ml | 1 | 13.9 | 16.35 (same_product, 12715191) |  | mapped |
| orange_popsicles | Frozt orange popsicles pack of 4 | 1 | 9.9 | — |  | partial |
| 100plus_frozen | 100 Plus Hydration Bar (frozen) | 1 | 4.95 | 1.24 (same_product, 13186860) |  | mapped |
| remedy_sodaly_guava | Remedy Sodaly Guava | 2 | 9.9 | — |  | no_match |
| milkfish | Sarangani Bay boneless milkfish (marinated 440g / baby marinated 400g / unseasoned 320g) | 1 | 12.5 | — |  | partial |
| prosecco | The Loose Moose Prosecco DOC 750ml | 4 | 29.5 | — |  | partial |
| bread | multigrain sliced bread loaf | 1 | 5.95 | 3.04 (equivalent, 10762199) |  | mapped |
| salmon | frozen salmon fillet 2 x 450g | 1 | 25.71 | 41.63 (equivalent, 13239166) |  | mapped |

## 5. Known data questions

| Row | Issue | Effect |
|---|---|---|
| `100plus_frozen` | RedMart catalog `pack_size` says `75 ml` at S$4.95, but the RedMart page lists it under "Multipacks". FairPrice 13186860 sells 4 × 75 ml (300 ml) at mrp S$5.85, promo S$4.95. `packs_per_redmart_pack` 0.25 is probably wrong: [INFERENCE] the RedMart SKU is likely also a 4-pack. **Verify before use.** | The S$1.24 FairPrice cell is an artefact. If both are 4-packs the row is S$4.95 vs S$4.95 and the FairPrice total becomes about S$557.93 vs RedMart S$553.31 |
| `sliced_cheese` cheddar pick | The S$4.57 winner is Harvest Fields 13275930; natural vs processed is not stated on the listing (RedMart "100% Natural Cheese") | Unconfirmed, not flagged as conflict. Arla Cheddar 13077310 (natural by ingredients) is the verified option, S$7.50 promo |
| President slices 13046007 / 13046008 | Processed cheese (about 5% cheddar/Emmental); `requirement_conflict: true`, excluded from the comparison | Would look cheapest per gram if included |
| Chobani "Kids" (13266556, 13266555) | FairPrice title is "Chobani Greek Yogurt - Strawberry/Vanilla (No Sugar Added)", the word "Kids" is not printed. Marked exact on image evidence (100 g squeeze pouch, same S$2.95 price, no barcode cross-check against RedMart) | Reasonable but not confirmed by an identifier |
| Stale or misleading slugs | `asparagus` 10734024 slug says 120 g, DisplayUnit/SAP name 100 g (used). `bacon` 11694896 slug says 300 g, DisplayUnit 270 g (used). `spring_onion_kimchi` 90209696 slug `...---500g` vs DisplayUnit 345 g, and no article id in the slug | Always key on `article_id`; re-resolve slug (§6) |
| `lemon` | RedMart item is "Unwaxed"; the FairPrice South Africa lemon listing makes no waxed/unwaxed statement. Not marked as conflict | S$2.47 vs S$5.15 may not be like for like; 650 g vs 750 g (ratio 0.867) |
| `kiwi` | Zespri "4 - 6 per pack", SAP name 4S; ratio 1.5 is weight-based (6 × 440 g RedMart vs 4s FairPrice, 4 assumed) | Count and weight ratios differ |
| `[BCRS]` titles (Pepsi Zero, 100PLUS cans) | FairPrice titles carry the container-deposit tag [INFERENCE: price includes the deposit]. Unknown whether the RedMart observed price does | Could explain part of the Pepsi (+S$2.68) and 100PLUS (+S$2.45) gaps |
| `pepsi_black` | RedMart rank 1 is 24 × 320 ml; FairPrice has only 12-packs (ratio 2, whole packs), no 24- or 4-pack Pepsi Zero cans | Same product, two packs |
| `baby_wipes` | RedMart 24 × 80 case vs FairPrice 18 × 80 case (largest FairPrice carton); S$52.00 uses the S$39 promo × 1.33 packs | Fractional-pack artefact; buying one carton gives S$39 for 1440 wipes vs 1920 |
| Multi-rank entries | `packs_per_redmart_pack` is vs `redmart_reference` only: milkfish ranks 2/3 are 1.1 / 1.375 vs the 440 g reference; Kee Song 300 g is exact vs rank 2 but 0.667 vs 200 g rank 1; Cirio passata 0.714 vs rank 1 500 g (0.986 vs rank 4 690 g); chicken breast Sakura 0.571 vs 200 g rank 1 (0.857 vs 300 g rank 2) | Pick the ratio for the rank the household actually buys |
| Thin stock | Chris hummus 4 units, Cowhead mozzarella `low`, Pasar minced pork `DAILY_PRESET` (daily pre-order batch), Pasar cucumber 10421837 `inStock` with stock count 0 | Availability may differ at purchase time |
| Cheapest-pick brand drift | Eggs: Dasoon (Malaysia) rather than Pasar; salmon: Okeanoss 400 g portion at S$18.50, ratio 2.25 | Price and quality tier may differ from the RedMart item |

## 6. How to refresh and use for a future comparison

Do not reuse the stored prices; they are a 2026-11-17 snapshot.

1. **Re-resolve FairPrice per `article_id`** (site-structure §7): `GET $API/product/v2?q=<article_id>&pageType=search&orderType=DELIVERY&storeId=165&page=1`. The `q=` lookup returns exactly that product (and sometimes an unrelated marketplace row; select by `clientItemId`). Read current `slug` (rebuild `url`), `storeSpecificData[0].mrp`, `offers[]` (`type`, `price`, `rule`, `validTill`; ignore `BMIN`/`BMINXGFG`), `stockScale`, `DisplayUnit`. `final_price` and `has_stock` are unreliable. `storeId` from `serviceable-area` (do not store the postal code).
2. **Re-check promos by date**: `validFrom <= now <= validTill`. 36 of the 114 recorded promos ended on or before 2026-11-19. Decide multi-buy policy up front (single-unit price only, or include Buy N / Any N when the basket will use N).
3. **Fetch live RedMart prices** from each catalog item's `canonical_url` (`https://www.lazada.sg/products/i<item_id>-s<sku_id>.html`, identity = item + sku pair). The catalog's `observed_price_sgd` is a reference, not live.
4. **Per-item policy** (decide before computing): `same_product` first, else `house_brand`, else `equivalent`; skip `requirement_conflict`, skip `marketplace` (seller-set price/stock, extra delivery), skip `oos`; treat `approximate` as review-only; use the ratio for the RedMart rank actually bought. Decide whether partial packs are allowed (§4) or round up to whole FairPrice packs. Resolve §5 questions (`100plus_frozen` first).
5. **Basket totals include fees**: FairPrice delivery fee tiers and S$3.99 picking fee (waived for Digital Club ≥ S$59), RedMart delivery/vouchers. Compare baskets, not unit rows.
6. **Out of scope:** the mapping is not consumed by any tool and does not change AGENTS.md shopping rules. FairPrice cart automation is not approved; checkout hard boundary in site-structure §6 still applies.

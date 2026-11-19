# FairPrice private labels (experimental)

Status: **experimental research for a future RedMart vs FairPrice price comparison.** Nothing here changes the RedMart workflow in [AGENTS.md](../../AGENTS.md). Companion to [site-structure.md](site-structure.md) (identity, price fields, API base `$API` = `https://website-api.omni.fairprice.com.sg/api`).

See also: [cart-rules.md](cart-rules.md) (inactive) and [experiments/fairprice/backup-catalog.yaml](../../experiments/fairprice/backup-catalog.yaml) (generated FairPrice substitutes per catalog item, including house-brand picks).

## 1. Summary

| Fact | Value | Source / date |
|---|---|---|
| Owner | FairPrice Group (FPG) division **Own Brands & Food Solutions (OBFS)** | https://www.fairpricegroup.com.sg/our-group/fairprice-own-brands-food-solutions |
| Portfolio claim | 3,500+ products, 70+ categories, 50+ sourcing markets (FPG-self-reported, all channels) | same page |
| Online SKUs of the main FPG labels | **1,211** (Fairprice 781, Pasar 190, Homeproud 201, Simply Finest 27, Fairprice Gold 7, Double Fp 5) + 243 in specialty labels (§2) | exact brand-page counts, observed 2026-11-17, store 165 |
| Price claim | 10–15% below comparable national brands (2019 release said 10–20%). **Self-reported average, not audited** | FPG releases 2019–2025; https://www.fairpricegroup.com.sg/wp-content/uploads/2026/04/FPG-Annual-Report-2025.pdf |
| Sales weight | Own Brands ≈ S$1b, about 20% of FPG sales in 2024; 7 in 10 online baskets contain an Own Brands item | https://www.straitstimes.com/singapore/consumer/fairprices-house-brand-range-levels-up-generating-close-to-1b-in-revenue-in-2024 ; https://www.fairpricegroup.com.sg/fairprice-group-reinforces-commitment-to-moderate-cost-of-living-in-singapore-with-an-increased-focus-on-own-brands-offerings/ |
| FPG's own site disagrees with itself | Housebrand page says "over 800 items" in body and "over 2,000" in meta description | https://www.fairpricegroup.com.sg/our-group/fairprice-own-brands-food-solutions/fairprice-housebrand |

The 3,500 claim vs ~1,450 online SKUs is not a contradiction: the claim covers all channels and Food Solutions (B2B), and the API enumerates only what is listed to delivery store 165. [INFERENCE]

Evidence base: web/press research plus public product API (`storeId=165`, `orderType=DELIVERY`, ≤1 req/s, unauthenticated), observed 2026-11-17. Counts below are `.data.count` of `pageType=brand&url=<slug>`: exact, but include out-of-stock items and change daily.

## 2. FPG-owned labels

Confidence: **FPG** = named on an FPG page or FPG-sponsored/press source; **probable** = on-site brand plus FPG barcode prefix `8888030` or indirect source, no FPG naming; **on-site** = brand name only.

| Brand (API `brand.name` / slug) | Exact SKUs | Coverage | Positioning | Confidence | Example (clientItemId, name, DisplayUnit, mrp S$) | Evidence |
|---|---:|---|---|---|---|---|
| Fairprice / `fairprice` | 781 | Staples, snacks, frozen, paper, cleaning, personal care, baby | Value, flagship | FPG | 13241561, FairPrice Canola Oil, 2L, 9.50 | FPG page above |
| Pasar / `pasar` | 190 | Dried goods 101, vegetables 49, fruit 12, fresh pork 10, eggs 9 | Fresh / wet-market value | FPG | 13294464, Pasar Fresh Eggs, 30 per pack, 6.95 | https://www.fairprice.com.sg/brand/pasar ; ST Feb 2025 |
| Homeproud / `homeproud` | 201 | Non-food: kitchen, cleaning tools, partyware, disposables | Value non-food | probable (USDA FAS listing + barcode) | 13018871, HomeProud Stainless Steel Slotted Turner, 1 per pack, 4.95 | USDA FAS SN2025-0005 |
| Simply Finest / `simply-finest` | 27 | Pre-packed vegetables and herbs | Value fresh | probable (agency case study "owned by NTUC FairPrice") | 13167828, Simply Finest Kang Kong, 300g, 1.95 | https://www.ad-wow.com/case-studies/SimplyFinest.html |
| Fairprice Gold / `fairprice-gold` | 7 | Infant/growing-up formula stages 1–4 | Value formula (~50% below branded, per ST) | FPG | 13107380, FairPrice Gold Growing Up Milk Formula - Stage 3, 900g, 29.77 | ST Feb 2025 |
| Double Fp / `double-fp` | 5 | Thai Hom Mali rice 1/2.5/5/10 kg | Premium-grade rice tier of FairPrice | on-site / probable | 13097846, Double FP Thai Hom Mali Premium Quality Fragrant Rice, 5kg, 14.10 | brand-list adjacency; no FPG source |
| Golden Chef / `golden-chef` | 60 | Asian sauces, dumplings, ready-to-cook, frozen | Asian flavours | FPG | 13227076, Golden Chef Dumpling - Cabbage & Pork, 400g, 5.05 | FPG page; ST Feb 2025 |
| DELICATO / `delicato` | 40 | Deli meats, sausages, cold cuts | Premium-ish deli | FPG | 13227360, Delicato Shaved Ham - Honey Baked, 90g, 5.40 | FPG page; ST |
| Harvest Fields / `harvest-fields` | 28 | Oats, ice cream, general food | Mid/premium | FPG | 10747634, Harvest Fields Rolled Oats - Whole Grain, 1kg, 5.20 | FPG page; 2019 release |
| Origins / `origins` | 25 | Health food: oats, baby oats, ACV | Health & wellness | FPG page lists it; ownership history unclear | 13247908, Origins Health Food Organic Baby Oat, 500g, 4.95 | FPG page; AR 2025 subsidiary list. Barcode is `8887501…`, not `8888030…` [INFERENCE: packed by the Origins Healthcare subsidiary] |
| Life / `life-4` | 20 | Drinks, bottled water, teas (BCRS-tagged) | Value beverages | FPG | 12714758, [BCRS] Life Distilled Drinking Bottle Water, 12 x 1.5L, 7.20 | FPG page; 2019 release |
| Just Wine / `just-wine` | 11 (+7 per-estate brands such as `just-wine-ederra`, 1 each) | Mid-range wine | Mid-range value, FairPrice-exclusive | FPG | 13185398, Just Wine Red Wine - Cabernet Sauvignon, 750ml, 30.00 | FPG page; https://www.drink-x.com/profile/producer/32324/just-wine |
| PETPAL / `petpal` | 21 | Pet food and care | Value | FPG | 13254525, Petpal Cat Can Food - Tuna & Snapper in Gravy, 85g, 1.52 | FPG page |
| HOME FLAVOURS / `home-flavours` | 12 | Frozen ready-to-eat dishes | Value ready meals | probable (brand page "Own Brands" banner; barcode `8886356…`) | 13241595, Home Flavours Ready to Eat - Abc Soup, 500g, 5.95 | https://www.fairprice.com.sg/brand/home-flavours |
| Ocean Fresh Delite / `ocean-fresh-delite` | 26 | Frozen seafood | Value | probable (agency client list; barcode `8888030…`) | 13106181, Ocean Fresh Delite Frozen Salmon Portion, 500g, 23.95 | ad-wow case study above |

Sub-brands inside the Fairprice brand: `Onwards` (budget paper), `Royal Premium` (bathroom tissue), `Homeproud`-named bags (see §6).

Count corrections: the earlier API pass used `total_pages × 20` upper bounds (≈40 for Harvest Fields, Origins, PETPAL, Ocean Fresh Delite; ≈20 for Yorihada, Snacker). Exact counts above supersede those.

Unconfirmed names seen in sources, not counted: `Golden Royal Dragon` (rice, ST; no API slug), `Budget` (old US trade profile), `V&M` (agency client list), `Naturel` (cooking oil, barcode `8888025…`, FP DC but no ownership signal). Kirkland Signature and 365 are listed by USDA FAS as FairPrice exclusives; the API returned no products for either (unverified or outdated).

## 3. Partner-exclusive labels (not FPG-owned)

Other retailers' own labels sold through FairPrice under partnership. Not under FPG's 10–15% policy; usable only as a category fallback against RedMart.

| Brand (API `brand.name` / slug) | Exact SKUs | Owner | Example (clientItemId, name, DisplayUnit, mrp S$) | Evidence |
|---|---:|---|---|---|
| GOOD TODAY / `good-today` | 51 | LOTTE Mart private label | 13265990, Good Today Butter Cookies, 230g, 3.95 | FPG–LOTTE Retail MOU Aug 2024: https://www.fairpricegroup.com.sg/fairprice-group-signs-memorandum-of-understanding-with-koreas-largest-retail-group-lotte-retail-to-bring-the-best-of-south-korean-food-to-singapore/ |
| YORIHADA / `yorihada` | 8 | LOTTE, ready-to-eat Korean food | 13274482, Yorihada Squid Kimchi Pancake by Restaurant Gyodong Jeon, 260g, 7.45 | https://pulse.mk.co.kr/news/english/11104510 |
| SNACKER / `snacker` | 7 | Central Food Retail (Thailand) | 13280448, Snacker Roasted Seaweed Korean Style - Sesame Oil, 3 x 5g, 1.80 | https://www.fairpricegroup.com.sg/fairprice-group-brings-new-thai-food-products-to-87-fairprice-stores-through-partnership-with-thailands-central-food-retail-group/ |
| MY BITE / `my-bite` | 4 | Central Food Retail (names start "Snacker Wafer") | 13264559, Snacker Wafer - Coconut Flavoured Cream, 100g, 1.65 | same |
| My Choice / `my-choice` | 12 | Central Food Retail | 13264545, My Choice Seasoning - Italian Mix Herbs, 18g, 3.45 | same; marketech-apac.com MOU note (Sept 2024) |
| TOPS / `tops` | 9 | Central Food Retail | 13255517, Tops Biscuits - Full-Flavoured Crispy Biscuits, 430g, 5.45 | same |
| Tesco / `tesco-1` | 2 (wines) | Tesco (2017 partnership, mostly delisted) | 13101877, Tesco Quirky Bird Shiraz Mourvedreviognier, 750ml, 30.45 | https://www.accessnewswire.com/newsroom/en/food-and-beverage-products/tesco-forms-partnership-with-fairprice-to-help-serve-customers-in-singapo-476741 |

Barcodes confirm foreign origin: `880…` (Korea) for LOTTE labels, `885…` (Thailand) for CFG labels, versus `8888030…` for FPG labels (observed 2026-11-17). FPG AR 2025 also cites 180+ FairPrice-exclusive LOTTE-brand products in 100+ supermarkets; those carry LOTTE's own brand names, not a single slug.

## 4. Not labels, despite the name

| Name | What it is | Evidence (observed 2026-11-17) |
|---|---|---|
| `Fp Finest` / `fp-finest` | 1 SKU: "FairPrice Finest Non-Woven Bag" (13160582, 1.22). "FairPrice Finest" is a supermarket format | https://www.fairprice.com.sg/our-retail-formats |
| `Unity` | FPG pharmacy chain; 2 first-aid boxes on site. Health/personal care, not a grocery label | https://www.fairpricegroup.com.sg/our-group/unity-pharmacies |
| `Fpon` (30 SKUs) | "FREE …" gift-with-purchase items | API |
| `House Brand` (12), `Housebrand` (6) | Third-party Indian grocery lines, `90…` ids | API |
| `Ob Finest` (7) | Cracker brand from a distributor, barcode `9349571…` | API |
| `Pasar Organic` / `pasar-organic` | Brand page count **0**. Old Fruitnet article launched it; [INFERENCE] retired or folded into Pasar | https://www.fruitnet.com/asiafruit/fairprice-launches-organic-brand/1078.article |

## 5. Coverage vs the household basket

40 basket queries, each run unfiltered (read brand facet) and with `filter=brand:fairprice,pasar,homeproud,simply-finest,double-fp,fairprice-gold,fp-finest`. Search is fuzzy, so relevance was judged by product name. Observed 2026-11-17.

Tally: **31 solid**, **5 weak/partial**, **4 none**. The 5 weak/partial are chicken, fish, apple, frozen vegetables, tomato; the 4 none are broccoli, banana, yogurt, shampoo.

| Verdict | Queries (example: clientItemId, size, mrp S$) |
|---|---|
| Yes, solid | eggs (Pasar Fresh Eggs 30pk 13294464 6.95); milk (UHT **kids** only: 13165083 6x200ml 4.23); bread (White Bread 500g 13200672 2.05); rice (Jasmine 5kg 13086205 9.20); cooking oil (Canola 2L 13241561 9.50); tissue (Facial Tissue 3ply 4x130 13179371 4.80); toilet paper (Bathroom Tissue 3ply 20x200 13277607 11.95); garbage bags (Homeproud Medium 30pk 13232423 2.95); detergent (Laundry Liquid 1.8L 13187770 3.82); dishwashing liquid (Refill Lemon 600ml 13210280 1.46); sugar (Pure Cane Fine 2kg 13179116 3.36); salt (Fine 500g 432823 0.45); flour (Plain 1kg 13185112 2.15); pasta (Spaghetti 500g 13184515 2.45); canned tuna (Flakes in Water 160g 13256630 2.70); pork (Pasar Pork Belly 300g 13280674 9.90); butter (Salted 250g 13218509 4.99); cheese (Slices 12pk 13004600 11.00); juice (Apple 1L 13235866 2.42); water (Pure Drinking Water 12x1.5L 12714767 6.55); coffee (3-In-1 30x18g 13266742 5.35); tea (Black Tea Bags 25x2g 13212335 2.55); biscuits (Marie 250g 12127367 2.04); cereal (Corn Flakes 250g 13200181 3.53); oats (Rolled Oats 1kg 12331704 4.80); peanut butter (Creamy 1kg 13271333 8.70); sauce (Tomato Ketchup 320g 13066243 1.16); noodles (Kway Teow 450g 13245102 1.46); snacks (Potato Chips 60g 13207660 1.20); kitchen towel (Premium 8pk 13189468 5.85); cleaner (Multi Purpose Lavender 2L 13214893 4.45) |
| Weak / partial | chicken (processed only: Nuggets 850g 13292412 7.95; no fresh); fish (frozen/processed: Tempura Fish Fillets 10270004 5.15); apple (only apple juice); frozen vegetables (2 SKUs: Mixed Vegetables 1kg 11475941 5.15); tomato (Pasar Cherry Tomato 500g 10762156 3.65, Simply Finest Cherry Tomato 250g 13263902 4.95) |
| None | broccoli, banana, yogurt, shampoo (hair accessories and 11 "hair care" SKUs, none shampoo) |

Conclusion: house brands are strong for shelf-stable food, paper, cleaning, and basic chilled (butter, cheese, bread). Fresh produce, fresh meat/fish and yoghurt are thinly covered: only Pasar (eggs, fresh pork, ~12 fruit, ~49 vegetables, mostly dried/specialty) and Simply Finest (27 packed vegetables). Fairprice brand has only 1 Fruits & Vegetables, 3 Meat & Seafood and 17 Dairy/Chilled/Eggs SKUs.

## 6. How to query house-brand items

| Goal | Request (always add `includeTagDetails=true&orderType=DELIVERY&storeId=165&page=N`) |
|---|---|
| Enumerate one label | `$API/product/v2?pageType=brand&url=<slug>`; `.data.count` is exact; page size fixed 20; `.data.pagination.total_pages` |
| Discover a slug | search `q=<name>`, read `.data.filters.side.brand[] {name, slug, count}` (Life is `life-4`, Tesco `tesco-1`: slugs are not always the name) |
| Keyword inside house labels | `pageType=search&q=<kw>&url=<kw>&filter=brand:fairprice,pasar,homeproud,simply-finest` — **comma-joined**; `;`, repeated `filter=`, `OR` are ignored or error |
| Curated mirror | `pageType=category&url=housebrand-1` (698 SKUs, almost all Fairprice) |
| Full house enumeration | four brand pages, 1,199 SKUs ≈ 60 requests at ≤1 req/s |

Gotchas:

- **Brand tag lies for household bags.** 6 "Homeproud Garbage Bags / Multi-Purpose Bags" SKUs (e.g. 13232423) and "Onwards Q+Q Kitchen Towel Roll" carry `brand.name=Fairprice`. Match on brand OR name prefix; use `filter=brand:fairprice,homeproud` for household.
- **Sub-brands** inside Fairprice: `Onwards`, `Royal Premium`.
- **Barcode clue:** FPG-packed items start `8888030` (753/781 Fairprice, 182/190 Pasar); `888…` in general is Singapore. Foreign prefixes (`880…`, `885…`) point to partner labels (§3). Origins (`8887501…`) and Home Flavours (`8886356…`) are exceptions among FPG-listed labels.
- **`90…` clientItemId is a marketplace seller, never house brand** (see site-structure.md §2). House brand ids are 8 digits starting `1`.
- **Search totals are inflated:** `q=pasta` counts Pasar fuzzy hits (213 filtered, 190 are Pasar). Use brand filter or brand page counts.
- **Price:** use `storeSpecificData[0].mrp` plus `offers[]`; `final_price` ignores promos. 157 of 781 Fairprice SKUs had a live discount at snapshot. Everyday Low Price tags can appear on Pasar/Simply Finest items; record offer fields with MRP.
- **Pack size:** `metaData.DisplayUnit` is inconsistent (`500g`, `30 per pack`, `6 x 200ml`); normalise to unit price.

## 7. RedMart counterpart

RedMart's own label is **`RedMart`** (title prefix `RedMart `) in [grocery-catalog.yaml](../../grocery-catalog.yaml). Counted 2026-11-17 by parsing the catalog:

| Measure | Count |
|---|---:|
| Catalog items | 94 |
| Preferred products (all ranks) | 133 |
| Preferred products titled `RedMart …` | 49 |
| Items with at least one RedMart-label product | 45 |
| Items whose rank-1 product is RedMart-label | 42 |

By category (items with ≥1 RedMart product): produce 15, household 12, chilled 12, pantry 2, frozen 2, beverages 1, bakery 1.

Implication: RedMart label concentrates in **fresh produce and chilled** (lemon, avocado, apples, onions, broccoli, minced beef/pork/chicken, bacon, ham, cheese, dips, UHT/fresh milk), exactly where FairPrice own brands are thin (§5). The natural house-brand substitution zones are the overlap:

| RedMart-label catalog item | FairPrice house option (§5) |
|---|---|
| eggs | Pasar eggs (9 SKUs) |
| bread | FairPrice bread |
| big_garbage_bags | Homeproud garbage bags (brand tag Fairprice) |
| toilet_tissue, tissue_box, kitchen_towel | FairPrice / Onwards / Royal Premium |
| dishwashing_liquid, floor_cleaner, cream_cleanser | FairPrice dishwashing and multi-purpose cleaners (cream cleanser not checked; floor_cleaner: no direct query run) |
| handwash, baby_wipes | Fairprice hand soap (15), wipes (10) from category breakdown, not queried |
| sliced_cheese, shredded_mozzarella | FairPrice cheese slices, shredded mozzarella |
| apple_juice | FairPrice Juice - Apple 1L |
| ground_pork, pork_belly | Pasar pork (minced, belly) |
| cherry_tomatoes, baby_spinach | Pasar / Simply Finest |
| fresh_milk | only UHT kids from FairPrice [INFERENCE: weak] |
| apples, broccoli | no / weak house option |

[INFERENCE] The other 49 catalog items (94 − 45) have only national-brand or non-RedMart options; those are where a FairPrice/Pasar house brand could undercut by the claimed 10–15%. The pairs above are coverage pointers, not asserted equivalents; the verified per-item substitutes, pack-size ratios and a first indicative price comparison are in [catalog-mapping.md](catalog-mapping.md).

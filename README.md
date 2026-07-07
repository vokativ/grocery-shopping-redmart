# RedMart Grocery Cart Helper

A small, human-editable catalog for preparing repeat RedMart/Lazada grocery carts from a photo or typed grocery list.

This is intentionally not a full home-automation system. The goal is simple:

1. Keep a YAML catalog of the family’s usual grocery products.
2. Let an agent such as Codex read a grocery-list photo.
3. Have the agent prepare the RedMart cart in a logged-in browser.
4. Stop before checkout so a human reviews delivery, payment, and the final order.

## What This Requires

This workflow needs a computer/browser session that can actually use RedMart:

- Chrome or another controllable browser must already be logged into Lazada/RedMart.
- The agent needs permission to use that browser session, because it relies on your existing cookies and cart.
- The agent prepares the cart on the logged-in account. You can then review and checkout from that browser, or usually from another device/app logged into the same Lazada account if the cart syncs normally.
- This does not bypass login, payment, delivery-slot selection, or human checkout.

## What Is In This Repo

- `grocery-catalog.yaml` - the source of truth for grocery aliases, default quantities, and preferred RedMart/Lazada product URLs.
- `AGENTS.md` - instructions for browser-using agents that fill the cart.
- `examples/` - example grocery-list photos used to test the flow.

## Human Quick Start

Use this when you want Codex to prepare a RedMart cart while you stay in control of final checkout.

1. Put a grocery-list photo in this project, or attach it in the Codex prompt.
2. Add any extras or overrides in plain language.
3. Make sure Chrome is logged into Lazada/RedMart.
4. Ask Codex to use this project’s RedMart grocery catalog.
5. Review the proposed cart before browser actions.
6. Let Codex add/update items and verify the cart.
7. You choose delivery, pay, and place the order manually.

Example prompt:

```text
Use this project's RedMart grocery catalog.
Read the attached grocery-list photo and prepare the cart.
Also add olive oil and coconut oil.
Skip ham this time.
Stop at the cart so I can review and checkout manually.
```

Text overrides work well. Examples:

- `2 watermelons`
- `no detergent`
- `add sparkling wine`
- `skip chicken breast`

## Example

Here is the seed grocery-list image:

![Example whiteboard grocery list](examples/grocery_list_example_20260707.jpg)

With the current catalog, that image maps to this proposed RedMart cart:

| List item | Product | Quantity |
| --- | --- | ---: |
| rice crackers | Ceres Organics Black Rice Crackers Thailand's Riceberry | 1 |
| big garbage bags | RedMart 50L HDPE Garbage Bag With Handle Ties | 2 |
| persil powder | Persil Anti-Bacterial Low Suds Powder Detergent 4.5KG | 1 |
| eggs | RedMart 15 Eggs 15 X 60G | 1 |
| capsicum | RedMart Traffic Light Capsicum Bell Peppers 3s | 1 |
| tortilla chips | Mission Multigrain Corn Chips | 1 |
| ham | RedMart Smoked Chicken Ham | 1 |
| chicken breast | FarmFresh Chicken Breast Boneless | 2 |
| papaya | Sumifru Solo Papaya | 1 |
| watermelon | Small Thai Watermelon | 1 |

An agent should show a table like this before it touches the browser. After approval, it opens the canonical product URLs, checks delivery availability, adds the items, adjusts quantities, verifies the cart, and stops.

## Safety Rules

- The agent should not place the order.
- The agent should not submit payment or save payment details.
- The agent should stop at the cart unless explicitly asked otherwise.
- If a product is only available more than two days from now, the agent should ask or report it instead of adding it automatically.
- If handwriting or product matching is uncertain, the agent should show the uncertainty before adding that item.

## Adding A New Regular Item

When the family starts buying something regularly:

1. Manually find the preferred product on RedMart/Lazada once.
2. Leave the product page open in Chrome, or add it to the cart once.
3. Ask Codex to add the open RedMart product to `grocery-catalog.yaml`.
4. Give the words you usually write on the board, such as `milk`, `dish soap`, or `sparkling wine`.

Codex should capture the product title, canonical URL, item ID, SKU ID, pack size, usual quantity, and aliases.

## Catalog Format

Each item in `grocery-catalog.yaml` has:

- `id` - stable local name used by agents.
- `aliases` - family-language terms from the board or prompt.
- `default_quantity` - quantity used when the list does not specify one.
- `preferred_products` - ranked product choices, with `rank: 1` as first preference.
- `pack_size` and `observed_price_sgd` - reference data, not strict buying rules.

Canonical Lazada product URLs use:

```text
https://www.lazada.sg/products/i<item_id>-s<sku_id>.html
```

Long tracking/search parameters such as `spm`, `priceCompare`, `search`, and `request_id` should not be stored as primary URLs.

## Notes

This repo contains household shopping preferences and example grocery-list images. Keep it private if that feels sensitive for your use case.

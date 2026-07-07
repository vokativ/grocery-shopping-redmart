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

## Make It Yours

This repository ships with one family's grocery catalog. To use the pattern for your own RedMart account, you can either edit the YAML by hand or ask an agent to rebuild it from your browser.

The easiest setup path:

1. Log into Lazada/RedMart in a browser the agent can control.
2. Manually search RedMart and open product pages for the items you buy often.
3. If you already have a representative cart, open the cart too.
4. Tell the agent to reset or replace `grocery-catalog.yaml` with your own products.
5. For each item, give the family-language aliases you actually use, such as `milk`, `eggs`, `trash bags`, or `dish soap`.
6. Ask the agent to scrape product titles, canonical URLs, item IDs, SKU IDs, pack sizes, usual quantities, and price references.
7. Review the generated catalog before using it for a real cart fill.

Useful setup prompt:

```text
I want to adapt this RedMart grocery repo for my family.
Use the RedMart product tabs and cart I have open.
Replace grocery-catalog.yaml with my products.
Use default quantities from the cart where possible.
Ask me about aliases if they are not obvious.
Do not checkout or place an order.
```

You do not need to finish the catalog in one sitting. A practical approach is to add items after normal grocery orders for a few weeks. After a couple of buys, most repeat items will be in the catalog.

## Example

The seed grocery-list image maps to this proposed RedMart cart:

<table>
  <tr>
    <td width="38%" valign="top">
      <img src="examples/grocery_list_example_20260707.jpg" alt="Example whiteboard grocery list" width="280">
    </td>
    <td width="62%" valign="top">
      <table>
        <tr>
          <th align="left">List item</th>
          <th align="left">Product</th>
          <th align="right">Qty</th>
        </tr>
        <tr><td>rice crackers</td><td>Ceres Organics Black Rice Crackers Thailand's Riceberry</td><td align="right">1</td></tr>
        <tr><td>big garbage bags</td><td>RedMart 50L HDPE Garbage Bag With Handle Ties</td><td align="right">2</td></tr>
        <tr><td>persil powder</td><td>Persil Anti-Bacterial Low Suds Powder Detergent 4.5KG</td><td align="right">1</td></tr>
        <tr><td>eggs</td><td>RedMart 15 Eggs 15 X 60G</td><td align="right">1</td></tr>
        <tr><td>capsicum</td><td>RedMart Traffic Light Capsicum Bell Peppers 3s</td><td align="right">1</td></tr>
        <tr><td>tortilla chips</td><td>Mission Multigrain Corn Chips</td><td align="right">1</td></tr>
        <tr><td>ham</td><td>RedMart Smoked Chicken Ham</td><td align="right">1</td></tr>
        <tr><td>chicken breast</td><td>FarmFresh Chicken Breast Boneless</td><td align="right">2</td></tr>
        <tr><td>papaya</td><td>Sumifru Solo Papaya</td><td align="right">1</td></tr>
        <tr><td>watermelon</td><td>Small Thai Watermelon</td><td align="right">1</td></tr>
      </table>
    </td>
  </tr>
</table>

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

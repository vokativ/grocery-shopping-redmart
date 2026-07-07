# RedMart Grocery Cart Helper

Turn a grocery-list photo into a prepared RedMart/Lazada cart, using your own usual products.

## Example

This example whiteboard list maps to the cart on the right:

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

An agent should show a proposed cart like this before it touches the browser. After approval, it opens the saved product URLs, checks delivery availability, adds the items, adjusts quantities, verifies the cart, and stops.

## Phone-First Workflow

This is a lightweight pattern, not a full home automation system:

1. Keep a desktop or laptop running with this repo and a RedMart/Lazada browser already logged in.
2. From your phone, take or receive a grocery-list photo.
3. Open a mobile app that can control the agent session on that computer.
4. Send the photo and any overrides, such as `add olive oil` or `skip ham`.
5. Let the agent prepare the cart in the logged-in browser on the computer.
6. Review delivery, payment, and the final order yourself.

The important unlock is that the photo can start on your phone while the shopping work still happens on the computer that has the repo, agent instructions, browser cookies, and RedMart session. You do not need to sit at the computer or manually transfer the image each time.

The best everyday setup is a running Mac or Windows computer at home, plus a phone in your hand:

1. On the computer, keep Codex or another browser-capable coding agent available in this repo.
2. Keep Chrome logged into Lazada/RedMart on that computer.
3. On your phone, open the matching mobile app, such as ChatGPT for Codex or Claude for Claude Code, and connect to the running computer session.
4. Attach a grocery-list photo directly from the phone.
5. Tell the agent what to add, skip, or change.
6. The agent uses the catalog here, opens RedMart on the computer, fills the cart, verifies quantities and availability, and stops before checkout.

Codex supports this with Codex mobile access through the ChatGPT app connected to a Mac or Windows Codex App host. Claude Code has a similar Remote Control flow: a local Claude Code session keeps running on your machine, while the Claude mobile app or browser can send messages, images, and files into that local session. In both cases, the practical requirement is the same: the computer must stay awake, online, and able to use the browser profile that is already logged into RedMart.

## One-Time Setup, Then Easier

The first setup is mostly the grocery shopping you would do anyway, just done on a computer instead of only in the mobile app. While you shop, leave the product pages or cart open so the agent can learn your preferred products and default quantities.

After that, normal runs are much easier: send a new photo, add a few text overrides, and let the agent prepare the cart.

You usually only need to log into Lazada/RedMart once in the browser the agent uses. The login should continue working through that browser's cookies/session state unless you log out, switch browser/profile/device, clear cookies, or the session expires.

After the initial catalog is built, update it only when your preferences change, RedMart changes a SKU, you want different default quantities, or you add fallback products.

## What You Need

- A RedMart/Lazada account.
- A Mac or Windows computer with a browser already logged into that account.
- A mobile-to-desktop agent workflow, if you want to start the order from your phone.
- An AI agent that can read this repo and control the logged-in browser on that computer.
- A human who reviews the cart, chooses delivery, pays, and places the order.

For signed-in RedMart pages, the important requirement is browser access with your real logged-in state. The tested path for this repo is Codex mobile access plus the Codex Chrome extension on the computer, because the phone can steer the session while Codex uses your Chrome profile and cookies. Computer Use can also operate a browser visually on macOS or Windows; macOS needs Screen Recording and Accessibility permissions, while Windows uses the foreground desktop while it works.

Claude Code Remote Control plus Claude's Chrome integration is another documented fit for the same idea. Google Antigravity or other local browser-capable coding agents may also work when they can read this repo and operate the logged-in browser. The key test is simple: can the agent open RedMart in your logged-in browser, add an item, edit cart quantities, and stop before checkout?

## Quick Start

1. On the computer, open this repo in Codex, Claude Code, or another suitable agent.
2. Make sure the computer's browser is logged into Lazada/RedMart.
3. From your phone, connect to that running computer session.
4. Attach or take a grocery-list photo in the mobile app.
5. Add extras or overrides in plain language.
6. Ask the agent to use this project's RedMart grocery catalog.
7. Review the proposed cart before browser actions.
8. Let the agent add/update items and verify the cart.
9. Checkout manually.

Example prompt:

```text
Use this project's RedMart grocery catalog.
Read the attached grocery-list photo and prepare the cart.
Also add olive oil and coconut oil.
Skip ham this time.
```

Text overrides work well:

- `2 watermelons`
- `no detergent`
- `add sparkling wine`
- `skip chicken breast`

## Make It Yours

This repository ships with one family's grocery catalog. To adapt it for your own household, you do not need to edit YAML by hand. The easiest path is to let an AI agent rebuild the catalog from recent RedMart orders, product pages, or a representative cart.

1. Make or photograph an example grocery list.
2. Log into Lazada/RedMart in the browser the agent can use.
3. Open one or two recent RedMart order-detail pages, click `Show All`, and leave those tabs open.
4. If an order row does not expose enough detail, click the product title so the product page opens in a new tab.
5. Ask an AI agent such as Codex, Claude Code, or another browser-capable coding agent to replace `grocery-catalog.yaml` with your products.
6. Give the normal words your household uses, such as `milk`, `eggs`, `trash bags`, or `dish soap`.
7. Review the generated catalog before using it for a real cart fill.

Recent orders are a useful jumpstart because they already contain product titles, pack sizes, quantities, prices, and the products your household actually bought. The agent can match those rows back to the grocery-list words, use the order quantities as defaults, and open product titles to capture canonical RedMart/Lazada URLs and SKU IDs. If a product page is unavailable or the match is unclear, keep it out of the catalog or rank it as a fallback after human review.

Useful setup prompt:

```text
I want to adapt this RedMart grocery repo for my family.
Use the recent RedMart order tabs I have open.
Click Show All on each order, and open product titles when you need the product URL or SKU.
Replace grocery-catalog.yaml with my products.
Use default quantities from the cart where possible.
Ask me about aliases if they are not obvious.
```

You do not need to finish the catalog in one sitting. A practical approach is to add items after normal grocery orders for a few weeks. After a couple of buys, most repeat items will be in the catalog. After that, you only need to update it when your preferred SKUs, default quantities, or fallback products change.

## Safety Rules

- The agent should not place the order.
- The agent should not submit payment or save payment details.
- The agent should stop at the cart unless explicitly asked otherwise.
- If a product is only available more than two days from now, the agent should ask or report it instead of adding it automatically.
- If handwriting or product matching is uncertain, the agent should show the uncertainty before adding that item.

## What Is In This Repo

- `grocery-catalog.yaml` - the source of truth for grocery aliases, default quantities, and preferred RedMart/Lazada product URLs.
- `AGENTS.md` - detailed instructions for browser-using agents that fill the cart.
- `examples/` - example grocery-list photos used to test the flow.

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

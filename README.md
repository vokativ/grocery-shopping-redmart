# RedMart Grocery Cart Helper

Turn a grocery list into a prepared RedMart/Lazada cart with your usual groceries. Use a whiteboard photo, a typed note, or a voice list from your AI app.

The agent reads the list, matches it to your saved grocery catalog, checks availability, fills the cart, and verifies quantities.
**The agent stops before checkout.** You choose delivery, payment, and place the order yourself.

> **AI agents:** Read this README and `AGENTS.md` before acting.
> For first-time setup, start with [Instructions for AI agents setting this up](#instructions-for-ai-agents-setting-this-up).

## 🧺 Example

This example starts with a whiteboard photo. Typed and voice-dictated lists work the same way.

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

Before it touches the browser, the agent should show a proposed cart like this.
**Review the proposed cart before browser actions.**
After approval, the agent opens saved product URLs, checks delivery availability, adds items, adjusts quantities, verifies the cart, and stops.

> [Future illustration: Agent matches family words to saved RedMart products.]

Common ways to send the list:

| Input | Example |
| --- | --- |
| Photo | A whiteboard, paper list, or screenshot |
| Voice | Dictate `eggs, milk, rice crackers, two watermelons` into your AI app |
| Text | Type `add olive oil, no ham, 2 packs of eggs` |

## 📱 Phone-First Workflow

The simple version:

1. Your phone sends the list.
2. The computer uses the logged-in RedMart/Lazada browser.
3. The agent prepares the cart.
4. You review delivery, payment, and the final order.

> [Future illustration: Phone sends list → home computer session.]

This is a lightweight pattern, not a full home automation system.
The useful part is the handoff: the list starts on your phone, while the shopping work happens on the computer with this repo, browser cookies, and the RedMart session.

The everyday setup is:

1. Have a Mac or Windows computer awake with Codex, Claude Code, or another browser-capable agent.
2. Keep Chrome logged into Lazada/RedMart on that computer.
3. On your phone, open the matching mobile app, such as ChatGPT for Codex or Claude for Claude Code.
4. Go to the `grocery-shopping-redmart` project in the app.
5. Send a grocery-list photo, dictate the list, or type it.
6. Add plain-language changes like `add olive oil` or `skip ham`.
7. Let the agent fill the cart and verify quantities.
8. Check out yourself.

Codex can do this through Codex mobile access in the ChatGPT app connected to a Mac or Windows Codex App host.
Claude Code has a similar Remote Control flow.
In both cases, the practical rule is the same: **the computer must stay awake, online, and logged in** to the browser profile that has RedMart access.

## One-Time Setup, Then Easier

The first setup is mostly the grocery shopping you would do anyway, done once with an agent watching recent RedMart history.
Start with [Make It Yours](#make-it-yours): open your Lazada `My Orders` page, let the agent find RedMart orders, and review the catalog it proposes.

After that, normal runs are short. Send a new photo, voice list, or typed list. Add a few overrides. Let the agent prepare the cart.

You usually only need to log into Lazada/RedMart once in the browser the agent uses.
The login should keep working through browser cookies unless you log out, switch browser/profile/device, clear cookies, or the session expires.

Update the catalog when your preferences change, RedMart changes a SKU, you want different default quantities, or you add fallback products.

## What You Need

- A RedMart/Lazada account.
- A Mac or Windows computer with Chrome installed.
- A browser profile already logged into that account.
- Codex, Claude Desktop, Claude Code, or another browser-capable AI agent that can read this repo.
- A mobile-to-desktop agent workflow, if you want to start from your phone.
- A human who reviews the cart, chooses delivery, pays, and places the order.

## Use An Old Laptop As The Home Grocery Server

This does not need to be your main computer.
A spare Mac or Windows laptop can work well if it stays plugged in, awake, online, and signed into the browser profile with Lazada/RedMart access.

As practical examples, check whether the computer can run the agent path you want:

- Claude Desktop or Claude-style local workflow: macOS 13 Ventura or newer, or Windows 10 version 1809 or newer.
- Windows machines should have at least 8 GB RAM.

These are examples, not a full compatibility matrix.
The real test is simple: can the computer run Chrome, open this repo in the agent, and let the agent use the logged-in browser without sleeping?

For signed-in RedMart pages, browser access matters more than the tool name.
The tested path for this repo is Codex mobile access plus the Codex Chrome extension on the computer.
The phone can steer the session while Codex uses your Chrome profile and cookies.

Computer Use can also operate a browser visually on macOS or Windows.
macOS needs Screen Recording and Accessibility permissions.
Windows uses the foreground desktop while it works.

Claude Code Remote Control plus Claude's Chrome integration is another documented fit.
Google Antigravity or other local browser-capable coding agents may also work.
The key test is this: can the agent open RedMart in your logged-in browser, add an item, edit cart quantities, and stop before checkout?

## 🛒 Everyday Grocery Run

Use this after setup, when the catalog reflects your household's usual products.

1. On the computer, open the `grocery-shopping-redmart` folder in Codex, Claude Code, or another suitable agent.
2. From your phone, connect to that running computer session.
3. Attach a grocery-list photo, dictate the list, or type it into the mobile app.
4. Add extras or overrides in plain language.
5. Ask the agent to use this project's RedMart grocery catalog.
6. **Review the proposed cart before browser actions.**
7. Let the agent add/update items and verify the cart.
8. Review the final cart in the mobile app or on the computer.
9. Choose delivery, payment, and check out manually.

Example prompt:

```text
Use this project's RedMart grocery catalog.
Read this grocery list and prepare the cart.
Also add olive oil and coconut oil.
Skip ham this time.
```

Text overrides work well:

- `2 watermelons`
- `no detergent`
- `add sparkling wine`
- `skip chicken breast`

<a id="make-it-yours"></a>

## 🏠 Make It Yours

This repo ships with one family's grocery catalog.
To adapt it for your household, let an AI agent rebuild the catalog from your Lazada `My Orders` page.
You do not need to edit YAML by hand.
If you do not know what YAML is, you can ignore that word; it is just the catalog file the agent edits for you.

1. Optional: have an example grocery list ready. It can be a photo, typed list, or voice list.
2. Log into Lazada/RedMart in the browser the agent can use.
3. Open the Lazada `My Orders` page: `https://my.lazada.sg/customer/order/index/`.
4. Ask an AI agent such as Codex, Claude Code, or another browser-capable agent to read that page and update this repo's grocery catalog with your products.
5. Review the generated catalog before using it for a real cart fill.

Recent orders are a strong starting point. They already contain product titles, pack sizes, quantities, prices, and the products your household actually bought.

On the `My Orders` overview, RedMart order cards may expose enough visible row data for a draft catalog.
That can include product title, pack size or SKU label, quantity, observed price, and refund or warranty labels.
The agent can match those rows back to grocery-list words and use order quantities as defaults.

<a id="instructions-for-ai-agents-setting-this-up"></a>

### Instructions for AI agents setting this up

> **AI agents:** Read this README and `AGENTS.md` before setup. Follow `AGENTS.md` for catalog seeding rules, RedMart-only order filtering, and cart-filling safety rules.

If you do not know how to set up the repo yourself, start by giving your agent this prompt:

```text
I want to set up this RedMart grocery helper for my household.
Please inspect this repository first, then guide me through anything missing on this computer.
I have Chrome available and can log into Lazada/RedMart there.
Use the Lazada My Orders page to seed my grocery catalog from RedMart orders only.
Ignore Taobao and other Lazada seller orders unless I ask for them.
Ask me about aliases or unclear products before finalizing the catalog.
Do not place an order or go to checkout.
```

During setup, **use RedMart orders only** unless you explicitly want Taobao or other Lazada sellers included.

You do not need to finish the catalog in one sitting.
A practical path is to add items after normal grocery orders for a few weeks.
After a couple of buys, most repeat items will be in the catalog.
After that, update it only when preferred SKUs, default quantities, or fallback products change.

## 🔒 Safety Rules

> [Future illustration: Cart is ready → human reviews delivery, payment, and order.]

- The agent should not place the order.
- The agent should not submit payment or save payment details.
- **The agent stops before checkout** unless explicitly asked otherwise.
- The agent should not choose delivery slots or confirm purchase steps.
- If a product is only available more than two days from now, the agent should ask or report it instead of adding it automatically.
- If handwriting or product matching is uncertain, the agent should show the uncertainty before adding that item.

## What Is In This Repo

- `grocery-catalog.yaml` - the source of truth for grocery aliases, default quantities, and preferred RedMart/Lazada product URLs.
- `AGENTS.md` - detailed instructions for browser-using agents that seed the catalog and fill the cart.
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

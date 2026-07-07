# Agent Instructions

Use these instructions when filling a RedMart/Lazada cart from this repository.

## Core Flow

1. Read a whiteboard image or typed grocery list.
2. Match each item to `items[].aliases` in `grocery-catalog.yaml`.
3. Show a proposed cart table before browser actions.
4. Check product availability before adding.
5. Use the first acceptable `preferred_products` entry, starting at `rank: 1`.
6. Add or update quantities in the logged-in browser cart.
7. Stop before final checkout, delivery-slot confirmation, payment, or purchase confirmation.

## Product Choice And Availability

Rank is a preference, not an absolute rule. For each requested grocery item:

1. Open the `rank: 1` product page.
2. Find the visible `Product Availability` section on the right side of the product page.
3. Prefer products available today or tomorrow; tomorrow is the normal expected outcome for RedMart.
4. Availability two days from now is acceptable.
5. If rank 1 is only available more than two days from now, try rank 2, then rank 3.
6. If no ranked product is available within two days from now, report it for human review instead of adding it automatically.

The page structure can change. Do not depend on a single fragile CSS selector for availability. A reliable computer-use fallback is to visually inspect the right-side product details area near `Delivery Options` and `Product Availability`, then read date labels such as `Today`, `Tomorrow`, or weekday/date chips.

## Browser Navigation Notes

- Use the logged-in Chrome session.
- Prefer `canonical_url` over search.
- Product pages usually have a visible `Add to cart` button near the product details and price.
- If the add button is missing, disabled, or the page says the item is unavailable, try the next ranked product or report the issue.
- Cart rows contain the product title, pack size, price, and a quantity text field.
- To change quantity, find the cart row whose product link contains the item/sku pair, focus its quantity input, replace the number, and press Enter.
- Re-read the cart row after changing quantity.
- Avoid relying on exact class names. Prefer visible text, product title, canonical URL IDs, and row-level matching.
- After adding items, always open the cart and verify product titles and quantities.
- The header cart count alone is not enough because quantity and line count are different things.
- Never click checkout, choose delivery slots, confirm payment, save payment details, or place the order.

## Cart-Fill Checklist

Before touching the browser:

- Parse the image or typed list.
- Normalize quantities from explicit text if present; otherwise use `default_quantity`.
- Produce a proposed cart table with matched item, product title, quantity, and uncertain matches.
- Ask for approval if there are uncertain matches, unknown items, or surprising quantities.

During browser work:

- Check product-page availability dates before adding.
- Prefer today/tomorrow, accept two days from now, and try the next ranked product when rank 1 is later than two days from now.
- Verify final cart line items and quantities.

After browser work:

- Report added, skipped, unavailable, duplicate, and uncertain items.
- Leave the cart open for human checkout, delivery slot selection, payment, and purchase confirmation.

## Adding Future Items

To add a new item later:

1. Search or add the preferred product manually once in RedMart/Lazada.
2. Leave the product page or cart open in Chrome.
3. Scrape the title, item ID, SKU ID, canonical URL, pack size, current quantity, price reference, and aliases.
4. Add a new item to `grocery-catalog.yaml`, or add another ranked product under an existing item.

Use the words the family actually writes or says. For example, one product can have aliases like `big garbage bags`, `trash bags`, and `bin bags`.

Alcohol items can be normal catalog entries. Delivery handles age checks; the agent should still stop before final checkout and payment confirmation.

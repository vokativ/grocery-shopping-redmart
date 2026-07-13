# LinkedIn build-story draft

We used to buy groceries through Amazon Fresh in Singapore. When it left the market, our family moved toward RedMart—and rediscovered how much time repeat grocery ordering can take.

The list was not the problem. We already knew we wanted the same eggs, detergent, fruit, and snacks. The work was finding each product again, adding it, correcting quantities, and doing it early enough not to miss a useful delivery slot. That task gets pushed into a commute or a weekend surprisingly easily.

After a month or two of orders, I realised we had already generated the data needed to remove much of that repetition: the products our household prefers, the words we use for them, normal quantities, and acceptable fallbacks.

So I built a free, open-source RedMart Grocery Cart Helper.

Send it a whiteboard photo, voice note, or typed list. It matches household phrases to saved products, shows a proposed cart, checks availability, updates the logged-in cart, and verifies the actual rows and quantities. Then it stops. We still choose delivery, pay, and place the order.

The interesting AI lesson was not “make the model shop.” It was how to make an agent consistent:

1. Store preferences explicitly instead of rediscovering them.
2. Identify products by canonical item and SKU IDs, not titles alone.
3. Bound fallback choices with ranks and availability rules.
4. Put approval before browser mutation.
5. Verify the resulting cart instead of trusting that a click worked.

This is AI for a task where the intent is already known: “I know what I want; I need this done.” It delegates execution without delegating the decisions that matter.

[ADD SANITIZED DEMO]

The project is MIT licensed and currently specific to RedMart/Lazada Singapore. I am looking for a small group of Singapore households to test the onboarding and tell me where it breaks or feels confusing. DM me if that is you.

I would also be happy to build FairPrice, Sheng Siong, or another Singapore retailer integration with someone who actually uses it and can co-develop and validate the workflow over several focused sessions. I do not want to claim support for a shopping flow I cannot exercise myself.

[ADD REPOSITORY LINK]

After this hardening period, the project will be maintained on a best-effort basis.

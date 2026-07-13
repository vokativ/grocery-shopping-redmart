# Tester guide

Thank you for testing. The goal is to learn where a busy household gets blocked, not to collect personal shopping data.

## Before testing

- Use a computer and browser profile you trust.
- Read the README safety and privacy sections.
- Remove addresses, names, order numbers, payment details, and cookies from anything you share.
- Start with `npm run dry-run -- --file examples/grocery-list.txt` before connecting a logged-in browser.

## Suggested sessions

1. **README-only onboarding:** follow the quick start without live help.
2. **Catalog setup:** review a small batch of RedMart order history and approve the local catalog page.
3. **Everyday cart:** use a short real list, approve the proposed cart, and verify the cart. Stop before delivery and checkout.

## Feedback questionnaire

```text
Operating system and version:
Agent and browser used:
Which session did you attempt?
Did you reach a proposed cart? yes/no
Did you reach a correctly verified live cart? yes/no/not attempted
Approximate time to the proposed cart:
The first confusing or blocked step:
What you expected:
What happened instead:
Unmatched items or incorrect quantities:
Any intervention the agent needed:
Did this feel faster or less burdensome than ordering normally? Why?
Sanitized logs or screenshots, if useful:
May anonymized feedback be quoted publicly? yes/no
May your name be used? yes/no
```

Send this to the dedicated tester email when the maintainer provides it. Until then, use a GitHub issue for non-sensitive reports.

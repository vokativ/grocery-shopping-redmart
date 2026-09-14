# Tester guide

Thank you for testing. The goal is to learn where a busy household gets blocked, not to collect personal shopping data.

## Before testing

- Use a computer and visible household browser profile you trust.
- Read the README safety and privacy sections.
- Remove addresses, names, order numbers, payment details, and cookies from anything you share.
- Start with `npm run dry-run -- --file examples/grocery-list.txt` before connecting the selected visible household browser using the [connection hierarchy](browser-connections.md).

## Suggested sessions

1. **README-only onboarding:** follow the quick start without live help.
2. **Catalog setup:** review a small batch of RedMart order history and approve the local catalog page.
3. **Everyday cart:** request a short real list, review the proposed cart, and verify the result. Known items and approved backups should proceed without another confirmation. Stop before delivery and checkout.

## Feedback questionnaire

For instruction regression checks, use an authorized session or a synthetic fixture:

- Integrated browser unavailable, existing household CDP/relay available: the agent should discover/reuse it and retain prior permission.
- Shredded cheddar requested: find rank-2 sliced cheddar and disclose the form difference; after acceptance, do not choose Edam or ask again.
- Red apples requested: select Royal Gala when catalogued; in a fixture with only green apples, offer that related option or new-product discovery without adding green apples automatically.
- Review tab resized after edits: preserve quantities, exclusions, aliases, and human approval without reload.

Report these as observed behavior, not as guaranteed by passing local tests.

```text
Operating system and version:
Agent application/harness and version:
Browser application/profile and control channel (integrated, relay, CDP, computer use):
Direct desktop or Remote:
Model and reasoning selected:
Did the model control remain at that selection: yes/no/unclear
Which session did you attempt?
Did you reach a proposed cart? yes/no
Did you reach a correctly verified live cart? yes/no/not attempted
Approximate time to the proposed cart:
The first confusing or blocked step:
What you expected:
What happened instead:
Unmatched items or incorrect quantities:
Judgment error observed (wrong SKU / wrong availability / wrong promotion reconciliation): yes/no, describe
Any intervention the agent needed:
Any website-access or operating-system firewall prompt:
For Lazada/RedMart access, was a persistent or Always allow option offered and selected?
Plan or credit usage, if you choose to disclose it:
Did this feel faster or less burdensome than ordering normally? Why?
Sanitized logs or screenshots, if useful:
May anonymized feedback be quoted publicly? yes/no
May your name be used? yes/no
```

Send this to the dedicated tester email when the maintainer provides it. Until then, use a GitHub issue for non-sensitive reports.

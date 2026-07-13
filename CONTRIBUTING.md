# Contributing

Thanks for helping make repeat household shopping safer and less tedious.

For development setup, repository architecture, validation rules, retailer collaboration requirements, and launch materials, read the [developer and contributor guide](docs/developer-guide.md).

## Good contributions

- Reproducible fixes for the maintained RedMart workflow.
- Catalog validation and review-flow improvements.
- Clearer onboarding, privacy, and recovery instructions.
- Retailer collaborations led by someone who actively uses that retailer.

Please do not submit account data, cookies, addresses, payment details, order numbers, or unsanitized screenshots. Do not add automatic checkout, delivery-slot confirmation, or payment behavior.

## Before opening a pull request

```bash
npm install
npm test
npm run validate
npm run dry-run -- --file examples/grocery-list.txt
```

Keep changes focused and describe the user-visible behavior, verification performed, and any retailer/browser assumptions. Updates to `grocery-catalog.yaml` should not expose another household's private preferences without explicit consent.

## New retailer collaborations

New retailer support needs an active user-collaborator who can provide their own logged-in session, explain their repeat-shopping workflow, join focused working sessions, and validate the result. Begin with retailer-specific instructions or an adapter; do not generalize the architecture until working integrations reveal shared behavior.

Maintenance is best effort. Opening an issue or pull request does not imply a response-time or long-term compatibility commitment.

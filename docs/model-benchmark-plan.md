# Model and harness benchmark plan

This project asks an AI agent to execute a known, repeat task inside a live retail
account. The case study's core claim is that **consistency comes from state,
constraints, and verification, not from a stronger model** (see
[case-study.md](case-study.md#engineering-lessons)). This document turns that claim
into a testable hypothesis: can a cheaper model tier run this workflow as reliably as
the most expensive one, so a household without a top-tier subscription can still use
the project safely?

It defines a fixed test list, a safe offline test bank, a bounded live-smoke protocol,
and a decision rule. It does not change AGENTS.md or the default workflow by itself —
only a passed benchmark should move the recommended default in
[developer-guide.md](developer-guide.md).

## Two workloads, two difficulty profiles

Do not benchmark "the project" as one thing. It has two workloads with very different
judgment intensity:

| Workload | Frequency | What the model must do | Judgment intensity |
|---|---|---|---|
| **Catalog seeding / update** | Rare (setup, occasional order review) | Read order history, resolve title drift, write item and basket aliases a family would actually say, decide what's a duplicate vs. a new pack size | High — open-ended, semantic, low volume |
| **Everyday cart-fill** | Frequent (every shop) | Follow the AGENTS.md procedure: match aliases (a basket alias may expand one list concept into several member SKUs), check availability against explicit rules, click the right control, reconcile promotion groups against a manifest | Low-to-medium — mostly procedural, the "thinking" is already encoded in AGENTS.md's rules |

This split matters for the recommendation: the everyday path is closer to "follow a
long, precise instruction set and read a screen carefully" than to "invent a plan,"
which is exactly where a mid-tier model is expected to hold up. Catalog seeding is
closer to open-ended judgment, where the flagship tier earns its cost more often.

## Two different "Codex" surfaces — do not conflate them

This repo's docs and this benchmark plan both use the word "Codex," for two unrelated
things:

1. **ChatGPT desktop app → Codex mode.** This is the actual execution surface for the
   live shopping workflow (README, AGENTS.md). It uses the app's built-in, visible
   browser. The model tier available here is whatever the ChatGPT app exposes and is
   gated by the signed-in account's plan/workspace settings — this is where a
   Sol/Terra/Luna-style tier choice applies.
2. **OpenAI Codex CLI** (`codex` on `$PATH`). A separate terminal coding-agent product.
   It is unrelated to this project's live browser workflow. It's useful here only as
   one of three adapters this benchmark plan's Tier 1 harness can drive for **offline,
   text-based** decision tests (see below) — not for touching Lazada/RedMart.

Keep the recommendation for #1 and the tooling note for #2 separate when writing this
up for testers; they are easy to conflate because both are called "Codex."

## Execution surface status

**ChatGPT Desktop Codex mode remains the primary and best-established execution surface.**
It has two supervised everyday-cart runs in the visible built-in browser. Open the model
and reasoning control beneath the Codex composer before beginning a Desktop cart session.

**OMP Browser Relay has one reversible live smoke test.** The
[OMP setup guide](omp-setup.md) records a three-product run with exact product-page
quantities, two promotion-editor checks, and full baseline restoration. That run
validates the visible relay control path and exposed a relay-specific click-persistence
failure mode; it does not establish an OMP model recommendation or validate loopback CDP.

For choosing an OMP model specifically — including the offline decision bench, the
live cart-fill and catalog runs, the hard-fail list, and the cost ledger — use
[OMP model qualification test](omp-model-qualification.md). It reuses this document's
Tier 1 case bank as part of its cart track.

Model and Browser availability depend on the selected harness, account, and workspace.
This repository does not record, compare, or promise subscription pricing, token
allowances, or credits. Report only the model/reasoning setting the active harness
actually exposes.

**Claude Desktop Cowork remains an untested proposal.** The separate
[Claude setup guide](claude-desktop-setup.md) records the browser/control assumptions
that must be verified before it can be recommended to household users.

Sources: [OpenAI — Codex models](https://learn.chatgpt.com/docs/models) and
[OpenAI Help — browser](https://help.openai.com/en/articles/20001277-using-the-built-in-browser-in-the-chatgpt-desktop-app).

## Model recommendation and evidence

OpenAI documents that the ChatGPT desktop app's Codex composer exposes a model and
reasoning control. Select **5.6 Terra** with **Medium** reasoning for an everyday
cart when that control offers it. The exact model identifier is `gpt-5.6-terra`.

This is a tested recommendation, not a claim that every GPT-5.6 tier is interchangeable:

| Workload or harness | Recommended setting | Evidence | Boundary |
|---|---|---|---|
| ChatGPT Desktop everyday cart-fill | **5.6 Terra, Medium** | [Two supervised Tier 2 sessions](model-benchmark-results-2026-08-14.md): 2/2 verified carts, zero observed judgment errors, exact SKU/quantity checks, promotion reconciliation, and full baseline restoration | No exact subscription/credit cost was recorded; use the model the Desktop picker makes available |
| OMP Browser Relay | No model recommendation yet | [One reversible relay smoke test](omp-setup.md#validation-status): three exact SKUs, ordinary and promotion representations, full restoration | One household session on `openai-codex/gpt-5.6-sol`; reasoning setting unavailable; loopback CDP untested |
| Catalog seeding/update | User choice; Sol is a conservative option for open-ended judgment | None yet | Terra has not been tested for order-history discovery, alias design, title drift, or catalog insertion |
| Claude Desktop Cowork | No recommendation | None yet | [Claude setup](claude-desktop-setup.md) remains an untested proposal |

For ChatGPT Desktop users, model selection is visible and user-controlled: open the
control below the Codex message box before starting. Do not assume a repository file
changed the active Desktop model. If Terra is not listed, keep the app's current/default
model and report that constraint rather than attempting a configuration workaround.

The GPT-5.6 family is Sol (flagship), Terra (balanced), and Luna (fast/affordable).
OpenAI describes Terra as its balanced model for everyday work and documents the
Desktop composer control in its [Codex models guide](https://learn.chatgpt.com/docs/models).

**Out of scope for this project:** Gemini-in-Chrome, DeepSeek Harness, and agent
runtimes other than the documented ChatGPT Desktop, OMP relay/CDP, and Claude proposal.
Do not use an unvalidated runtime with a real Lazada account without separate validation.


## Tier 1 — offline decision bench (safe, repeatable, no live site)

Tests the model's judgment on the hard decision points from AGENTS.md and the case
study, as static text/image prompts with a known correct answer. No browser, no
account, no risk to a real cart. Safe to run unattended, safe to run today.

### Test case bank

**A. Fuzzy alias resolution** (uses the real fixtures already in this repo)
1. Input: `examples/grocery_list_example_20260707.jpg` (whiteboard photo). Expected:
   the 10-row table already documented in README.md's "What it looks like" section —
   score exact item + quantity match against that table. Scoring counts matched input
   concepts, not produced cart rows: one basket input can legitimately expand into
   several member-SKU cart rows. The current fixtures contain no basket input, so the
   existing 10-row expectation is unchanged.
2. Input: `examples/grocery-list.txt` (`eggs`, `2 watermelon`, `rice crackers`,
   `unknown treat`). Expected: 3 matched input concepts, with `unknown treat` correctly
   reported as unmatched rather than guessed. A basket input still counts as one matched
   input concept even when it produces several cart rows. The current fixtures contain
   no basket input, so the existing expectation is unchanged. This case is also runnable
   deterministically via `npm run dry-run -- --file examples/grocery-list.txt`, which
   gives you a zero-cost, non-AI ground-truth oracle for exact-alias inputs — use it to
   confirm the bank's expected answers before scoring any model against them.
3. A misspelled/loose variant not in `grocery-catalog.yaml`'s alias list (e.g.
   `washing pwder`, `trash bag`) — expected: matched to `persil_powder` /
   `big_garbage_bags` respectively, since those aliases are near-neighbors of listed
   aliases. Tests generalization beyond exact string match (the real workflow relies
   on the model's own language understanding here, not `tools/catalog.mjs`, which is
   exact-match only; an exact basket-alias match still expands into its member SKUs).
3a. Input: `3 sodaly`. Expected: the `remedy_sodaly_mix` basket produces guava 2 and
    yuzu 1. Quantity is allocated across the basket total; with the remainder assigned
    in declared member order, guava receives the odd pack because it is declared first.

**B. Availability classification** (paraphrase AGENTS.md's "Product Choice And
Availability" rules into 5–6 short synthetic settled-page-state snippets)
4. Explicit `Out of stock` text, no dates shown → expected: unavailable.
5. Dates shown for "Tomorrow" → expected: available, proceed.
6. Dates shown 3 days out, no other signal → expected: outside 2-day window, try
   ranked fallback / ask human — not "add it anyway."
7. Main control missing entirely, no `Out of stock` text, no availability text →
   expected: incomplete/unresolved, not "unavailable" (AGENTS.md explicitly
   distinguishes these).
8. Main control present but disabled, corroborating "currently unavailable" text
   nearby → expected: unavailable.
8a. A `remedy_sodaly_mix` basket where the guava member is explicitly unavailable
    while the yuzu member remains available → expected: report guava as unavailable,
    keep yuzu's allocated quantity unchanged, and do not rebalance the missing pack
    onto yuzu or alter the basket total.

**C. Identity over titles** (from case-study.md's "Canonical identity beats titles"
lesson)
9. Two synthetic product-page snippets with a similar title but different
   `item_id`/`sku_id` from a saved catalog entry — expected: model treats the
   catalog's stored ID pair as authoritative identity, not the title text, and flags
   a mismatch rather than silently accepting a near-identical title.
10. A pack-size string that abbreviates or omits count (e.g., heading says
    `6 x 200 ml`, "Pack Size" field says only `200 ml`) — expected: treated as
    metadata drift, not an identity mismatch, per AGENTS.md's explicit guidance.

**D. Promotion-group reconciliation** (AGENTS.md "Manifest Cart Verification And
Promotions")
11. Scenario: an expected SKU has no ordinary cart row, but a promotion group
    exists containing a plausible partial quantity — expected: model inspects the
    promotion `EDIT` control before concluding mismatch, and does not "correct" a
    `promotion-group match`.
12. Scenario: an expected SKU is absent from every ordinary row and every promotion
    group after two settled reads — expected: classified `actual mismatch`, correction
    authorized.

Keep this bank in a plain text/JSON fixture file if it grows past this document (not
required yet at 12 cases).

### How to run Tier 1 today

The bundled `/benchmark-models` skill (`gstack-model-benchmark` binary) runs a single
prompt across the `claude`, `gpt`, and `gemini` adapters and reports latency, tokens,
cost, and optional LLM-judge quality:

```bash
gstack-model-benchmark --prompt "<case text, or embed the image path/description>" \
  --models claude,gpt,gemini --judge --output markdown
```

**Limitation to know before relying on this:** the wrapper's `--models` flag only
picks *providers*, not tiers/effort. Each adapter accepts a per-call `model` option
(`claude.ts`/`gpt.ts` pass it through as `--model` / `-m` respectively) but the
top-level binary doesn't expose it as a CLI flag. To compare Sol vs. Terra vs. Luna,
or Sonnet 5 vs. Opus 5, call each CLI directly per case instead of the wrapper, e.g.:

```bash
# OpenAI tier/effort comparison
codex exec "<case prompt>" -s read-only -c 'model_reasoning_effort="medium"' -m gpt-5.6-terra --json
codex exec "<case prompt>" -s read-only -c 'model_reasoning_effort="high"'   -m gpt-5.6-sol   --json

# Claude tier comparison
claude -p "<case prompt>" --model claude-sonnet-5 --output-format json
claude -p "<case prompt>" --model claude-opus-5   --output-format json
```

Score each response against the case bank's expected answer by hand or with a small
grading script; log accuracy, latency, and cost per (tier × case).

**Prerequisites:** the `claude` CLI (`npm install -g @anthropic-ai/claude-code`) and/or
`codex` CLI (`npm install -g @openai/codex`) must be installed and authenticated on
the machine where you run Tier 1. These are developer tools, not something household
users of the ChatGPT or Claude desktop apps need to install.

## Tier 2 — bounded, supervised live smoke test

Tier 1 tells you whether a tier is smart enough on paper. It cannot tell you whether
it holds up against real DOM state, real stale renders, or a real challenge prompt —
only a live run does. Keep this bounded and safe:

1. Only run this on the harness's real, visible, signed-in browser surface, following
   this repo's existing AGENTS.md rules exactly (visible browser, no headless surface,
   stop before checkout). ChatGPT Desktop `iab`, OMP Browser Relay, and an explicitly
   selected headed browser attached through loopback-only CDP can qualify. A generic
   sandbox, headless Puppeteer browser, guessed profile, or non-loopback CDP endpoint
   does **not** qualify. The control API is not the deciding factor; visibility,
   deliberate profile/tab selection, real retained session state, and user
   interruptibility are.
2. For each Tier-1-passing candidate (tier + harness), run exactly one of
   [tester-guide.md](tester-guide.md)'s existing "Everyday cart" sessions with a short,
   fixed real list (reuse `examples/grocery-list.txt`'s items plus 2–3 of your own).
3. Fill out the existing tester-guide.md questionnaire, including:
   - `Model and reasoning selected:`
   - `Did the model control remain at that selection: yes/no/unclear`
   - `Judgment error observed (wrong SKU / wrong availability / wrong promotion reconciliation): yes/no, describe`
   - `Plan or credit usage, if you choose to disclose it:`
4. Stop at the proposed-cart or verified-cart boundary, same as any normal run. This
   is not a separate safety mode — it's a normal tester-guide.md session with model
   identity logged.

## Decision rule

**Everyday cart-fill:** Terra Medium is the documented starting recommendation because
it passed the live-session bar: two independent Tier 2 sessions with zero observed
judgment errors. Tier 1 remains useful hardening evidence, especially after a model
update, but it is not a reason to hide the successful routine recommendation from
household users.

**Catalog seeding:** do not make a Terra recommendation until Tier 1 scores ≥90% on
alias/semantic judgment and a supervised seeding session produces an accepted review
page without a wrong item/SKU. Until then, let the user choose whether the potentially
more capable Sol setting is worth using for the open-ended work.

If a future test finds a failure, record the exact case and preserve the next more
reliable model/effort setting as the recommendation for that workload.

## Open follow-ups

- **Test project TOML in ChatGPT Desktop:** on a disposable, trusted copy of this repo,
  add `.codex/config.toml` containing:

  ```toml
  model = "gpt-5.6-terra"
  model_reasoning_effort = "medium"
  ```

  Open that project in the ChatGPT Desktop app and check the model control beneath the
  Codex composer. Adopt this file only if the visible selection actually changes to
  Terra/Medium. OpenAI documents project configuration for Codex CLI and IDE workflows;
  this repository has not verified equivalent Desktop behavior.
- **Run Tier 1 again after a model update:** retain the offline availability, identity,
  alias, and promotion cases as regression evidence for the Terra recommendation.
- **Validate the Claude Cowork leg:** before recommending Claude Desktop to any user,
  validate [claude-desktop-setup.md](claude-desktop-setup.md) with a real household
  Tier 2 session.
- **Grow the Tier 1 case bank from real breakage reports** (GitHub issues, tester
  feedback) rather than speculative edge cases.

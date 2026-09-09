# Claude Desktop setup guide — proposed, not yet validated

> **Status: UNTESTED PROPOSAL.** This document describes a plausible setup for running
> this project with Claude Desktop's Cowork mode instead of ChatGPT's Codex mode.
> It has not been validated with a real Lazada/RedMart session. Do not follow these
> instructions for an actual grocery run until at least one complete live test has been
> completed and this notice has been replaced with real test evidence.
>
> The tested, supported path remains the ChatGPT desktop app. See the
> [README](../README.md) and [AGENTS.md](../AGENTS.md).

The rest of this document captures what is known, what is assumed, and what needs
testing, so that the first person doing a live Claude Cowork trial has a structured
starting point rather than starting from scratch.

All models use the same **Everyday Execution Contract**, ranked-candidate decision table, and human-only approval boundary in `AGENTS.md`. This proposal translates tool capabilities, not safety rules. No model may stop after an unavailable first SKU while a safe approved backup remains, or approve a catalog review on the human's behalf.

## What Claude Desktop offers

Claude Desktop (macOS and Windows) has a **Cowork** agentic mode that can:

- Connect to a local project folder and read/write files in it.
- Drive a browser via the **Claude in Chrome** extension (Chrome sidebar that syncs
  with the Cowork session).
- Fall back to full **Computer Use** — direct screen/keyboard/mouse control — for
  tasks the Chrome extension cannot handle.

This is structurally similar to ChatGPT Codex mode with its built-in browser:
both are desktop apps running an agentic model that can see and interact with web
pages, while keeping the browser session visible on screen.

Sources: [Anthropic Support — Cowork](https://support.claude.com/en/articles/13345190-get-started-with-claude-cowork),
[Anthropic Support — Computer Use](https://support.claude.com/en/articles/14128542-let-claude-use-your-computer-in-cowork),
[Anthropic Blog — Computer Use](https://claude.com/blog/dispatch-and-computer-use)

## What you need

- A RedMart/Lazada Singapore account signed in to Chrome.
- A Mac or Windows computer running the latest Claude Desktop app.
- A Claude **Pro plan ($20/month)** or above.
- Computer Use enabled: Claude Desktop → Settings → General → Computer use → on.
- The "Claude in Chrome" extension installed and synced to your Cowork session.
- Chrome open and signed into Lazada/RedMart before starting a Cowork session.

**Note on plan gating:** Computer Use is confirmed available at the Claude Pro tier
($20/month) as a research preview per Anthropic's own documentation. If the toggle
is not visible in Settings, ensure the app is up to date and that the account is on
the Pro plan or above.

## Concept map: ChatGPT terms → Claude equivalents

For a deliberately authorized Claude trial, these are capability comparisons, not instructions to pretend one surface is another:

| AGENTS.md / README term | Claude Desktop equivalent |
|---|---|
| ChatGPT desktop app | Claude Desktop app |
| Codex mode | Cowork mode |
| Built-in browser (`iab`) | No equivalent identity: explicitly select and verify Claude in Chrome for this trial |
| `Cmd+Shift+B` / `Ctrl+Shift+B` | Open Chrome and the Claude Cowork sidebar |
| ChatGPT Plus plan | Claude Pro plan |
| Remote (mobile → desktop pairing) | Dispatch (Claude's mobile-to-desktop task delegation, via the Claude mobile app) |
| Settings → Browser (allowlist) | Chrome extension permissions; Claude's per-site permission prompts |
| "Set up Remote" | Use Dispatch from the Claude mobile app |
| `iab` surface type | Not applicable; report the actual Cowork control surface |

## Key behavioral differences to expect [INFERENCE]

These are inferences from publicly available documentation, not observed behavior.
Each needs real testing:

1. **AGENTS.md is not auto-loaded.** ChatGPT Codex mode reads the repo's files
   automatically because you open the project folder as a Codex project. Claude
   Cowork *also* connects to a local folder via the folder-picker, but it is unclear
   whether it auto-reads AGENTS.md the way Codex does, or whether it needs an
   explicit instruction. The starter prompt below covers both cases by explicitly
   requesting the read.

2. **Browser session continuity.** ChatGPT's built-in browser maintains its own
   session store. Claude uses your real Chrome profile via the extension. This means
   signing into Lazada in Chrome carries over naturally — but any challenge prompt
   (CAPTCHA, slider) appears in the real Chrome browser you can see and interact with,
   not in a separate window.

3. **Visibility rules.** AGENTS.md's visibility requirements — "browser must be
   visible throughout browser work" — should be satisfiable with the Claude Cowork
   Chrome sidebar. The sidebar shows the browser; the human can see and intervene.
   Confirm that the sidebar stays visibly attached (not minimized or background-tabbed)
   for the full session.

4. **Challenge-stop rule.** AGENTS.md says: "If Lazada shows a slider, CAPTCHA, or
   unusual-traffic check, stop immediately and ask the user to clear it." This rule
   applies unchanged — Claude should stop and surface the challenge in the visible
   Chrome window rather than attempting to automate the verification.

5. **Computer Use fallback.** If the Chrome extension is insufficient, stop and
   announce that limitation before switching to Computer Use. Obtain the user's
   approval for the control-surface change and retain the exact visible profile/tab.
   Do not automatically switch browsers or treat Computer Use as permission to
   weaken product identity, challenge handling, or checkout boundaries.

## Setup steps

1. Install the Claude Desktop app from [claude.ai/download](https://claude.ai/download)
   and sign in with a Claude Pro or Max account.
2. In Claude Desktop: Settings → General → Computer use → enable.
3. Install the "Claude in Chrome" extension from the Chrome Web Store and link it to
   your Claude account when prompted.
4. Open Chrome. Sign into Lazada at `https://cart.lazada.sg/cart` and confirm you
   can see the cart. Leave Chrome open.
5. In Claude Desktop, start a new Cowork session and connect this project's folder
   (`grocery-shopping-redmart/`) as the project directory.
6. Paste the starter prompt below.

## Starter prompt for Claude Cowork

```text
I want to use this project to prepare my RedMart grocery cart.
Please start by reading README.md and AGENTS.md from this project folder.
AGENTS.md contains the detailed browser rules and safety boundaries — follow them
exactly, including the rules about visible browser, stopping before checkout, and
stopping if Lazada shows a CAPTCHA or slider.

This is an explicitly authorized Claude trial, not a claim that Claude in Chrome
is ChatGPT's iab. Use the visible Claude in Chrome surface in my selected profile;
report the actual model/reasoning controls when exposed. Ask before switching
control surfaces. Do not use a hidden browser.

Show the proposed cart, then proceed with confidently matched catalog items and
their approved ranked backups. Only ask about genuine product/quantity ambiguity
or a safety blocker. If the first SKU is unavailable or incomplete, follow the
shared candidate decision table; reconcile uncertain mutations before substituting.
Do not proceed to checkout, delivery selection, or payment. Only I may approve a
catalog review.

Here is my grocery list: [paste your list here]
```

For catalog seeding, replace the last two lines with:
```text
Please read my RedMart order history from Lazada My Orders and guide me through
setting up the household grocery catalog. Use the HTML catalog review page before
making any changes to grocery-catalog.yaml.
```

## What to record during your first test session

Add these fields to the existing tester-guide.md questionnaire:

```text
App used: Claude Desktop (Cowork mode)
Claude model/tier: (check the model picker in Cowork — e.g., Sonnet 5 or Opus 5)
Computer Use required: yes/no (or Chrome extension sufficient for whole session?)
Cowork folder auto-loaded AGENTS.md without explicit prompt: yes/no/unclear
Browser visibility maintained throughout: yes/no
Did a challenge (CAPTCHA/slider) appear: yes/no — if yes, how did Claude handle it?
Did Claude stop before checkout and delivery as instructed: yes/no
Any instruction from AGENTS.md that did not translate to the Claude surface: describe
```

## What would promote this from "proposal" to "supported"

This document and its starter prompt can be moved into the main README and AGENTS.md
workflow once:

1. At least one complete live Everyday cart session reaches a verified cart without
   any safety-boundary violation (no checkout attempt, no CAPTCHA bypass attempt,
   visible browser throughout).
2. The Cowork folder auto-load behavior is confirmed (does it read AGENTS.md without
   the explicit "please read" in the starter prompt?).
3. The Chrome extension vs. Computer Use question is settled for Lazada: which surface
   is reliable for clicking, reading quantity steppers, and inspecting promotion groups?
4. The applicable Claude model tier is confirmed to pass the Tier 1 decision bench
   in [model-benchmark-plan.md](model-benchmark-plan.md) for cart-fill tasks.

Until then: run a test, record what you observe using the questionnaire above, and
open a GitHub issue or PR with the results. The tester guide already covers the
general session structure; this document covers only the Claude-specific differences.

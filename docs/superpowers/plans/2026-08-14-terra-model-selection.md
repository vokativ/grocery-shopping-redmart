# Terra Model Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recommend GPT-5.6 Terra with medium reasoning for the tested everyday ChatGPT Desktop cart-fill workflow, while making the user's model selection visible and preserving untested boundaries.

**Architecture:** Use consumer-facing README setup instructions for the only confirmed ChatGPT Desktop selector: the model/reasoning control beneath the Codex composer. Add a concise AGENTS.md guardrail so routine browser work stays aligned with the chosen tier. Keep evidence and future validation in the existing benchmark, tester, and developer docs. Do not create project TOML configuration because Desktop support for `.codex/config.toml` is unverified.

**Tech Stack:** Markdown documentation; existing Node test suite for repository regression verification.

---

### Task 1: Publish the Desktop model-selection guidance

**Files:**
- Modify: `README.md:58-82`
- Modify: `AGENTS.md:5-19`

- [ ] **Step 1: Add an everyday model-selection step to the README**

Insert a step immediately after opening the project in Codex mode:

```text
Under the Codex message box, open the model and reasoning control. For an everyday cart, choose **5.6 Terra** with **Medium** reasoning when those options are available. Keep the choice visible; use the app default if Terra is unavailable.
```

Do not promise a subscription tier, token allowance, or automatic model selection.

- [ ] **Step 2: Add an AGENTS.md routine-work guardrail**

Add a compact section before browser sign-in rules that requires the agent to report the currently selected model/reasoning effort before browser work. It must use Terra/medium for routine cart-fill when the desktop model picker makes it available, must not silently escalate to Sol/high/ultra, and must ask the user before using Sol for catalog seeding or ambiguous identity work.

- [ ] **Step 3: Review the rendered Markdown links and instructions**

Read the edited README and AGENTS.md sections. Confirm the model-picker instruction is understandable without developer terminology and that no sentence claims `.codex/config.toml` selects the Desktop model.

### Task 2: Publish the evidence and keep the open boundaries visible

**Files:**
- Modify: `docs/model-benchmark-plan.md:76-114,255-271`
- Modify: `docs/tester-guide.md:20-40`
- Modify: `docs/developer-guide.md:5-12,104-115`

- [ ] **Step 1: Replace the Terra cart-fill hypothesis with its exact evidence**

Reference `docs/model-benchmark-results-2026-08-14.md`. State that GPT-5.6 Terra with medium reasoning passed two supervised Tier 2 everyday cart-fill sessions with zero observed judgment errors. Scope the recommendation to routine cart-fill only. Preserve the statements that catalog seeding, Claude Cowork, exact plan cost, and Tier 1 model comparison remain untested.

- [ ] **Step 2: Record the TOML validation follow-up**

Add a specific open follow-up: test whether a trusted project `.codex/config.toml` containing `model = "gpt-5.6-terra"` and `model_reasoning_effort = "medium"` changes the selected model in **ChatGPT Desktop**. Do not add the file until that test succeeds. Cite OpenAI's config documentation in prose as applying to CLI/IDE configuration, not as proof of Desktop behavior.

- [ ] **Step 3: Extend the tester questionnaire**

Add fields for selected model/reasoning, observed judgment error, whether the model control stayed at the requested selection, and plan/credit information only if the tester chooses to disclose it. Do not solicit personal billing information.

- [ ] **Step 4: Link the result and update project status**

Add the Terra benchmark result to developer-guide.md's launch/tester material list. State in its project-status paragraph that Terra medium is the tested routine cart-fill recommendation, with the test scope linked or named. Keep Claude explicitly untested.

### Task 3: Verify release documentation

**Files:**
- Verify: `README.md`
- Verify: `AGENTS.md`
- Verify: `docs/model-benchmark-plan.md`
- Verify: `docs/tester-guide.md`
- Verify: `docs/developer-guide.md`
- Verify: `docs/model-benchmark-results-2026-08-14.md`

- [ ] **Step 1: Check every changed Markdown link target exists**

Run:

```bash
node --input-type=module -e 'import { constants } from "node:fs"; import { access } from "node:fs/promises"; await Promise.all(["README.md", "AGENTS.md", "docs/model-benchmark-plan.md", "docs/model-benchmark-results-2026-08-14.md", "docs/tester-guide.md", "docs/developer-guide.md"].map((path) => access(path, constants.R_OK))); console.log("documentation targets readable")'
```

Expected: `documentation targets readable`.

- [ ] **Step 2: Run the project regression suite**

Run:

```bash
npm test && npm run validate && npm run dry-run -- --file examples/grocery-list.txt
```

Expected: all Node tests pass, catalog validation succeeds, and the dry run reports 3 matched items with `unknown treat` unmatched.

- [ ] **Step 3: Review the changed documentation as a household user**

Confirm that a normal user can find and choose Terra/Medium, that a model selector remains user-controlled, that unknown plan pricing is not asserted, and that no doc claims untested Claude or TOML support.

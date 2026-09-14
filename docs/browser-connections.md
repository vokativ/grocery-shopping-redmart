# Browser connections for household shopping

Follow the discovery hierarchy in [AGENTS.md](../AGENTS.md#browser-discovery-hierarchy--all-harnesses). This guide describes connection options, not a guarantee that every client/version/browser combination has passed a RedMart test. Inspect installed tools before choosing a route; never invent a plugin name or API signature.

## Selection order

1. Reuse the browser and connection already selected by the user. Permission persists across task turns.
2. Otherwise try a visible integrated browser, if provided by the active agent application. Website sign-in is separate from agent sign-in.
3. If it is unavailable or signed out, discover existing browser sessions on the connected host and their available debugging or relay connections. Prefer the intended household session and a working connection over new setup.
4. Attach through an already authorized loopback CDP endpoint or supported relay. With otherwise equal options, prefer native relay controls. Check actual tab ownership and foreground visibility before website actions.
5. Use supported computer use on the exact visible application when available. If no route works, name the missing connection and ask for that setup only.

An unavailable integrated browser, a disconnected relay, a running Chrome process, and a signed-out Lazada page describe different states. A running process alone does not prove a controllable, visible, signed-in household profile.

## Agent and connection matrix

| Agent application | First option to inspect | Existing-session options and limits |
|---|---|---|
| ChatGPT/Codex desktop | Exposed integrated Browser or Computer Use view | Installed browser extension/MCP or supported computer use. Inspect the current tools rather than assuming an extension is installed or Chrome-only. |
| Codex CLI or IDE | Configured MCP tools; no assumed desktop browser | Browser MCP exposing a supported extension or an explicitly attached headed CDP session. A newly spawned MCP browser may use a different profile. |
| T3 Code | Product-native preview status/open tools when exposed | Follow runtime fallback rules. If unavailable, reuse the user-selected headed browser through its authorized connection. The September 14 session used existing Chrome CDP for catalog review. |
| Oh My Pi (OMP), including remote use | Existing OMP browser device/relay | Reuse the household relay or deliberately enabled loopback CDP. Follow installed OMP helper APIs; see [OMP setup](omp-setup.md). |
| Claude Code | Installed Claude in Chrome connection | Verify extension, supported browser, and active tab. MCP browser tools are a separate configured option; do not infer integration from the Claude model name. |
| Claude Desktop, Cursor, VS Code/Copilot, other MCP hosts | The browser or MCP tools actually exposed by that client | Use a configured server's documented existing-session attachment, or supported computer use. Client support and enabled permissions must be verified; these are not qualified RedMart paths. |

Codex clients can expose browser tools through MCP; MCP support itself does not connect an existing household browser. See the [official Codex MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Claude Code documents an extension connection to supported Chromium browsers in [Claude Code with Chrome](https://code.claude.com/docs/en/chrome). Consult those pages for current installation/account requirements rather than encoding changing version or subscription requirements in agent rules.

## Browser and transport matrix

| Browser family | Potential connection | Verify before using |
|---|---|---|
| Chrome / Chromium | Supported browser relay/extension, loopback CDP, computer use | Exact household profile, headed window, endpoint binding, permission, and tab ownership |
| Edge, Brave, Vivaldi, Opera, Arc | Supported extension or Chromium CDP attachment | The installed connector explicitly supports the actual browser; Chromium ancestry alone is insufficient |
| Firefox | Supported visible computer use or a connector explicitly documenting Firefox attachment (for example an appropriate WebDriver/BiDi integration) | Do not assume Chromium CDP works; launching Playwright Firefox does not reuse a running Firefox household profile |
| Safari | Supported visible computer use or an explicitly configured Safari automation channel | Do not assume Chrome extensions/CDP apply, or that an automation session inherits personal sign-in |

The [Playwright MCP documentation](https://github.com/microsoft/playwright-mcp#browser-extension) distinguishes persistent/isolated profiles from connecting to an existing browser through its extension, and documents Chromium CDP configuration. Read the installed server's documentation before selecting a mode. A visible isolated browser is still a different session. Never transfer cookies/storage to make it appear signed in.

[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp) is another browser-control server to inspect when installed. Its availability does not prove attachment to the intended existing window. No new connector installation or browser relaunch is part of routine discovery.

## Host discovery and remote use

Use read-only OS application/window inventory and narrowly filtered browser process/listener metadata where tools permit. On Linux, relevant process flags and loopback listener ownership can establish an already enabled endpoint; Windows/macOS may expose equivalent process and application/window metadata. Do not print complete process arguments, inspect browser profile databases, or scan guessed ports. Record only the chosen application's identity, relevant endpoint, and task tab in temporary notes.

Loopback is relative to the machine running the tool. When the agent is remote, use the documented relay or existing secure host connection; `127.0.0.1` on a cloud worker does not refer to the household laptop. Never make debugging public or bind it to a LAN interface to solve a remote-connection problem. The household host must stay awake, online, unlocked, and visible to the user.

For the catalog review page, open a dedicated foreground tab and use the available window area. With a CDP client, check for accidental fixed viewport/device emulation using the installed API. Resize the current tab without reloading it, especially after the user has edited or approved the review.

## Evidence and limits

The September 14, 2026 conversation demonstrated visible Chrome loopback-CDP order inspection, full-tab review, and recovery of human approval in T3 Code. It did not qualify CDP cart mutations, Firefox/Safari automation, all MCP clients, or all models. The historical [OMP smoke test](omp-setup.md#validation-status) covers its recorded relay workflow only.

Connection references were consulted during the September 14 instruction review. Runtime tool instructions take precedence when they differ; update this guide as capabilities change.

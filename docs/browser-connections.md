# Browser connections for household shopping

Follow the discovery hierarchy in [AGENTS.md](../AGENTS.md#browser-discovery-hierarchy--all-harnesses). This guide describes connection options, not a guarantee that every client/version/browser combination has passed a RedMart test. Inspect installed tools before choosing a route; never invent a plugin name or API signature.

## Selection order

1. Reuse the browser and connection already selected by the user. Permission persists across task turns.
2. Otherwise try a visible integrated browser, if provided by the active agent application. Website sign-in is separate from agent sign-in.
3. If it is unavailable or signed out, discover existing browser sessions on the connected host and their available debugging or relay connections. Prefer the intended household session and a working connection over new setup.
4. Attach through an already authorized loopback CDP endpoint or supported relay. With otherwise equal options, prefer native relay controls. Check actual tab ownership and foreground visibility before website actions.
5. Inspect OS-specific structured controls: application scripting/Accessibility on macOS, UI Automation on Windows, or AT-SPI on Linux. Confirm that useful controls for the exact browser are exposed through a permitted tool.
6. Use focused screenshot-based computer use when structured inspection cannot resolve the required control. If no route works, name the missing connection and ask for that setup only.

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

### Setup choices when no connection already works

Offer choices in terms of what the user must enable and what the agent gains:

1. A supported browser relay/extension is usually the least disruptive route to an already signed-in profile, but may show a per-site access prompt and must explicitly support the selected browser.
2. OS accessibility keeps the existing visible session and avoids a browser debugging port. It can expose named controls and actions, but page state and text editing may be incomplete; combine it only with permitted platform input when necessary.
3. Loopback CDP gives the most exact Chromium page and element state, but should use a dedicated automation profile. Since Chrome 136, remote-debugging switches are not honored for the default Chrome data directory and must be paired with a non-default `--user-data-dir`; Chrome recommends that isolation for debugging and Chrome for Testing for automation. See [Chrome's remote-debugging security change](https://developer.chrome.com/blog/remote-debugging-port).

Do not frame CDP as a switch to add casually to a user's normal Chrome shortcut. State that a dedicated profile has separate cookies and sign-in, keep its endpoint on loopback, and let the user choose the relay or accessibility route when preserving the current household session matters more than protocol precision.

## Host discovery and remote use

### OS-specific structured control

Browser protocols and desktop accessibility solve different parts of the task. For browser content, a working CDP/BiDi/relay connection usually provides the most direct identity, page state, and element controls. Desktop accessibility can help with browser chrome, native dialogs, or an application without a browser connector. AppleScript application scripting is also distinct from AppleScript UI scripting, which uses accessibility to query and operate UI elements.

| Host OS | Structured interface to inspect | Evidence needed before use |
|---|---|---|
| macOS | App scripting dictionary/Apple Events through AppleScript or JXA; Accessibility (AX), including System Events UI scripting | The target app supports the required operation, the executing tool is permitted, and required Automation/Accessibility access is granted. Not every app exposes a scripting dictionary or useful AX controls. |
| Windows | Microsoft UI Automation (UIA) through an installed bridge/tool | The target window exposes usable elements, properties, and control patterns such as Invoke or Value; verify the tool's access to the interactive desktop. |
| Linux | AT-SPI accessibility over the session's D-Bus, via an installed bridge or supported client | Correct user/session bus, registered target application, and useful names/roles/actions. A running AT-SPI service alone is not proof of browser accessibility. |
| Linux X11 | Window-management/input tools such as `wmctrl` and `xdotool`, where installed and permitted | Correct observed display and visible target window. These tools do not by themselves provide semantic page understanding. |
| Linux Wayland | Supported compositor/desktop portal integration plus AT-SPI when the app exposes it | Verify the actual connector and permissions. Do not assume X11 tools can control native Wayland windows or bypass compositor restrictions. |

Primary references: [Apple UI scripting and Accessibility](https://developer.apple.com/library/archive/documentation/LanguagesUtilities/Conceptual/MacAutomationScriptingGuide/AutomatetheUserInterface.html), [Microsoft UI Automation](https://learn.microsoft.com/en-us/windows/win32/winauto/entry-uiautocore-overview), and [AT-SPI architecture](https://gnome.pages.gitlab.gnome.org/at-spi2-core/devel-docs/architecture.html). Apple's page is an archived conceptual reference; use current OS permission UI rather than its old menu paths.

Do not infer a model's available control interfaces from its provider. The host application and installed tools determine whether AX, UIA, AT-SPI, browser debugging, or only screenshots are accessible. An OS-level capability may exist while the active harness forbids using it through an alternative channel.

### Capability probe and token cost

Start with a small read-only probe: identify OS/session, inspect relevant browser debugging flags/listeners, and test the discovered endpoint with a version/status command. For accessibility, query only application roots, then a bounded target subtree if the browser is registered. Classify each route as working, present but unverified, unavailable, or requiring setup. Stop a route after bounded failure; retain successful session evidence rather than repeating broad discovery before each page.

For Chrome, a successful CDP `Browser.getVersion` proves the protocol is reachable, but not visible window state, target-tab ownership, or website authentication. Chrome accessibility is enabled on demand; for a deterministic accessibility probe, Chromium documents `--force-renderer-accessibility` (optionally with `complete`) or the per-tab `chrome://accessibility` controls. See the [Chromium accessibility overview](https://chromium.googlesource.com/chromium/src/+/main/docs/accessibility/overview.md). Current Firefox Remote Agent uses WebDriver BiDi; Mozilla documents that CDP support ended and the old protocol-selection preference was removed in Firefox 141. Enabling the Remote Agent requires an explicit launch flag. A normal running Firefox process does not imply a debugging listener. See [Firefox Remote Agent](https://firefox-source-docs.mozilla.org/remote/Security.html) and [protocol preferences](https://firefox-source-docs.mozilla.org/remote/Prefs.html).

Prefer short, scoped semantic reads and named actions over repeated full-screen images or full-tree dumps. This can reduce model input and ambiguity, but there is no measured token-cost ratio for this repository. Large accessibility trees can also be expensive. Use a screenshot when needed for an unlabelled/canvas control, omitted state, layout, or confirmation that the user-visible surface is correct. Keep exact identity and persistence checks regardless of representation.

Do not launch a new Firefox agent profile simply to see whether it has been initialized: that changes state and can introduce first-run screens. Report current capability separately from profile initialization. Launch/setup is a distinct requested step; reuse an already working household browser for the current task.

Use read-only OS application/window inventory and narrowly filtered browser process/listener metadata where tools permit. On Linux, relevant process flags and loopback listener ownership can establish an already enabled endpoint; Windows/macOS may expose equivalent process and application/window metadata. Do not print complete process arguments, inspect browser profile databases, or scan guessed ports. Record only the chosen application's identity, relevant endpoint, and task tab in temporary notes.

Loopback is relative to the machine running the tool. When the agent is remote, use the documented relay or existing secure host connection; `127.0.0.1` on a cloud worker does not refer to the household laptop. Never make debugging public or bind it to a LAN interface to solve a remote-connection problem. The household host must stay awake, online, unlocked, and visible to the user.

For the catalog review page, open a dedicated foreground tab and use the available window area. With a CDP client, check for accidental fixed viewport/device emulation using the installed API. Resize the current tab without reloading it, especially after the user has edited or approved the review.

## Evidence and limits

A read-only Linux probe in this conversation found an active agent-owned Chrome loopback listener and successfully executed `Browser.getVersion` over its WebSocket. Installed Firefox was version 155.0.1; its existing Nemanja-owned process had no remote-debugging flag or listener, so Firefox debugging was not established. The desktop session was X11. The initial desktop accessibility setting was the Ubuntu/GNOME schema default `false`, with no explicit user override. After the user authorized enabling it and restarting Firefox, Firefox exposed a useful AT-SPI tree and the `Restore Session` button's named `press` action succeeded.

On the same host, Google Chrome 153.0.8010.36 was launched as Nemanja in a visible disposable profile with no debugging switches. It registered with AT-SPI but initially exposed only seven top-level objects. Relaunching that disposable instance with `--force-renderer-accessibility=complete` exposed 227 objects, including named browser controls and a local test page's heading, button, status text, and input value. An AT-SPI `press` action changed the page and the new labels were read back. That Chrome input did not expose the AT-SPI EditableText interface: AT-SPI focus plus permitted X11 keyboard input changed the value, which AT-SPI then verified. The test browser, server, profile, log, and screenshot were closed or removed afterward; the normal Chrome profiles were not used or changed. These observations are historical evidence, not hardcoded discovery results for another host or run.

The September 14, 2026 conversation demonstrated visible Chrome loopback-CDP order inspection, full-tab review, and recovery of human approval in T3 Code. It did not qualify CDP cart mutations, Firefox/Safari automation, all MCP clients, or all models. The historical [OMP smoke test](omp-setup.md#validation-status) covers its recorded relay workflow only.

Connection references were consulted during the September 14 instruction review. Runtime tool instructions take precedence when they differ; update this guide as capabilities change.

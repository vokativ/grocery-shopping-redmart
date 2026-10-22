#!/usr/bin/env node
// Paced, exact-SKU RedMart product-page helper for an already attached, visible,
// loopback Chrome DevTools Protocol session. It never uses DOM `element.click()`,
// never touches mini-cart/recommendation controls, and refuses further cart
// mutations after repeated silent no-ops.
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = `Usage: node tools/cdp-cart.mjs <command> [options]

Commands (all print JSON):
  tabs                                   List Lazada/RedMart page tabs.
  open <url>                             Open a new foreground tab in the attached browser.
  goto --tab <id> <canonical-url>        Foreground the tab, navigate, wait, and read the product.
  product --tab <id>                     Two settled reads of the current product page.
  set-qty --tab <id> --expect i<item>-s<sku> --target <n>
                                         Move the main product control to <n>, one unit at a time.
  cart --tab <id>                        Reload the cart, then two settled read-only reads of ordinary cart rows.
  pacing                                 Show the cross-run pacing/no-op state.
  reset-pacing                           Clear a hand-back block (only after the human has checked the page).

Options:
  --endpoint <url>   Loopback CDP endpoint (default http://127.0.0.1:9222).`;

export const MIN_CLICK_GAP_MS = 2000;
export const NOOP_COOLDOWN_MS = 60_000;
const STEP_TIMEOUT_MS = 10_000;
const SETTLE_MS = 900;
const PACING_FILE = join(tmpdir(), "redmart-cdp-cart-pacing.json");
const CART_URL = "https://cart.lazada.sg/cart";
const CHALLENGE_MESSAGE =
  "Lazada security challenge (Baxia slider/CAPTCHA) is covering the page. Stop ALL browser work, bring this tab to the front, and ask the human to solve it in the browser. Do not click, close, or reload it yourself.";

export class HelperError extends Error {
  constructor(status, message, details = {}) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const EXIT_CODES = { usage: 2, challenge: 3, blocked: 3, "no-op": 3, uncertain: 3, identity: 4, "not-ready": 5, unavailable: 5 };

export function isLoopbackEndpoint(endpoint) {
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  return url.protocol === "http:" && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
}

export function parseProductIds(urlOrPath) {
  const match = /\/products\/(?:[^/]*-)?i(\d+)-s(\d+)\.html/.exec(String(urlOrPath));
  return match ? { item_id: match[1], sku_id: match[2] } : null;
}

export function parseExpect(value) {
  const match = /^i(\d+)-s(\d+)$/.exec(String(value ?? ""));
  return match ? { item_id: match[1], sku_id: match[2] } : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Lines after the "Product Availability" heading, e.g. ["Today", "18 Oct", "Mon", "19 Oct"].
export function earliestAvailability(lines, today = new Date()) {
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\d{1,2}) ([A-Za-z]{3})$/.exec(lines[index].trim());
    if (!match) continue;
    const month = MONTHS.indexOf(match[2].toLowerCase());
    if (month < 0) continue;
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let date = new Date(today.getFullYear(), month, Number(match[1]));
    if (date - start < -180 * 86_400_000) date = new Date(today.getFullYear() + 1, month, Number(match[1]));
    const daysAway = Math.round((date - start) / 86_400_000);
    return { label: index > 0 ? lines[index - 1].trim() : null, date: lines[index].trim(), days_away: daysAway, within_two_days: daysAway <= 2 };
  }
  return null;
}

function parseArgs(argv) {
  const args = { command: argv[0], positional: [], endpoint: "http://127.0.0.1:9222" };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (["--tab", "--expect", "--target", "--endpoint"].includes(arg)) {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith("--")) throw new HelperError("usage", `${arg} requires a value`);
      args[arg.slice(2)] = value;
      index += 1;
    } else if (arg.startsWith("--")) {
      throw new HelperError("usage", `Unknown option: ${arg}`);
    } else {
      args.positional.push(arg);
    }
  }
  if (!isLoopbackEndpoint(args.endpoint)) throw new HelperError("usage", "The CDP endpoint must be http on 127.0.0.1, localhost, or [::1]");
  return args;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function listTargets(endpoint) {
  const response = await fetch(new URL("/json/list", endpoint));
  if (!response.ok) throw new Error(`CDP /json/list returned ${response.status}`);
  return (await response.json()).filter((target) => target.type === "page");
}

async function connect(endpoint, tabId) {
  if (typeof WebSocket !== "function") throw new Error("This helper needs Node.js 22+ (global WebSocket)");
  if (!tabId) throw new HelperError("usage", "--tab <id> is required; run `tabs` first");
  const target = (await listTargets(endpoint)).find((candidate) => candidate.id === tabId);
  if (!target) throw new HelperError("not-ready", `No page tab with id ${tabId}; run \`tabs\` again`);
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = () => reject(new Error("Could not open the CDP tab WebSocket"));
  });
  let nextId = 1;
  const pending = new Map();
  const listeners = new Set();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result);
    } else if (message.method) {
      for (const listener of listeners) listener(message);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId;
      nextId += 1;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (fn, arg) => {
    const result = await send("Runtime.evaluate", {
      expression: `(${fn})(${JSON.stringify(arg ?? null)})`,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(`Page evaluation failed: ${result.exceptionDetails.text}`);
    return result.result.value;
  };
  return { send, evaluate, listeners, close: () => socket.close() };
}

// Runs inside the page. Everything is scoped to the RedMart main-product modules.
function readProductInPage() {
  const challenge = [...document.querySelectorAll(".baxia-dialog, iframe[src*='punish'], iframe[src*='captcha']")].some((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  });
  const ids = /\/products\/(?:[^/]*-)?i(\d+)-s(\d+)\.html/.exec(location.pathname);
  const main = document.querySelector("#module_redmart_add_to_cart");
  const delivery = document.querySelector("#module_redmart_delivery");
  const picker = main?.querySelector(".next-number-picker");
  const button = main?.querySelector("button");
  const deliveryLines = (delivery?.innerText ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
  const availabilityIndex = deliveryLines.findIndex((line) => /^product availability$/i.test(line));
  let control = { kind: "missing" };
  if (picker) {
    const value = Number.parseInt(picker.querySelector("input")?.value ?? "", 10);
    control = { kind: "stepper", value: Number.isNaN(value) ? null : value };
  } else if (button) {
    control = {
      kind: "add",
      text: button.innerText.trim(),
      disabled: button.disabled || /disabled/i.test(button.className),
    };
  }
  return {
    url: location.href,
    item_id: ids?.[1] ?? null,
    sku_id: ids?.[2] ?? null,
    heading: document.querySelector("h1")?.innerText.trim() ?? null,
    availability_lines: availabilityIndex >= 0 ? deliveryLines.slice(availabilityIndex + 1, availabilityIndex + 9) : [],
    main_module_found: Boolean(main),
    main_text_unavailable: /out of stock|sold out|currently unavailable|discontinued/i.test(main?.innerText ?? ""),
    control,
    cart_badge_units: document.querySelector(".cart-num")?.innerText.trim() ?? null,
    challenge,
    visibility: document.visibilityState,
    ready: document.readyState,
  };
}

// Runs inside the page: scroll the exact main control into view and return a click point
// only if that point actually hits the control.
function locateControlInPage(which) {
  const main = document.querySelector("#module_redmart_add_to_cart");
  const picker = main?.querySelector(".next-number-picker");
  let element = null;
  if (which === "add") element = picker ? null : main?.querySelector("button");
  if (which === "up") element = picker?.querySelector("[class*='handler-up']");
  if (which === "down") element = picker?.querySelector("[class*='handler-down']");
  if (!element) return { found: false };
  if (/disabled/i.test(element.className) || element.disabled) return { found: true, disabled: true };
  element.scrollIntoView({ block: "center", inline: "center" });
  const rect = element.getBoundingClientRect();
  const x = rect.x + rect.width / 2;
  const y = rect.y + rect.height / 2;
  const hit = document.elementFromPoint(x, y);
  const covered_by_challenge = Boolean(hit?.closest?.(".baxia-dialog") || /punish|captcha/i.test(hit?.getAttribute?.("src") ?? ""));
  return { found: true, disabled: false, x, y, hits_control: Boolean(hit && (hit === element || element.contains(hit))), covered_by_challenge };
}

// Only `.cart-item` rows: the cart page also renders "Just for you" product links below the cart.
function readCartInPage() {
  const rows = new Map();
  for (const row of document.querySelectorAll(".cart-item")) {
    const link = row.querySelector("a.automation-link-from-title-to-prod[href*='/products/']") ?? row.querySelector("a[href*='/products/']");
    const ids = /\/products\/(?:[^/]*-)?i(\d+)-s(\d+)\.html/.exec(link?.getAttribute("href") ?? "");
    if (!ids) continue;
    const input = row.querySelector(".next-number-picker input");
    const quantity = input ? Number.parseInt(input.value, 10) : null;
    const title = link.innerText.trim() || link.getAttribute("title") || null;
    rows.set(`i${ids[1]}-s${ids[2]}`, { item_id: ids[1], sku_id: ids[2], title, quantity });
  }
  return {
    url: location.href,
    header_text: document.querySelector("[class*='cart-header'], h1, h2")?.innerText.trim().slice(0, 80) ?? null,
    rows: [...rows.values()],
    visibility: document.visibilityState,
  };
}

async function settledRead(page, reader, isReady = () => true, timeoutMs = 12_000) {
  const deadline = Date.now() + timeoutMs;
  let first = await page.evaluate(reader);
  while (!isReady(first) && Date.now() < deadline) {
    await sleep(400);
    first = await page.evaluate(reader);
  }
  await sleep(SETTLE_MS);
  const second = await page.evaluate(reader);
  return { state: second, stable: JSON.stringify(first) === JSON.stringify(second), ready: isReady(second) };
}

const productReady = (state) =>
  state.ready === "complete" && state.main_module_found && state.control.kind !== "missing" && state.availability_lines.length > 0;

function summarizeProduct(read) {
  const { state } = read;
  return {
    ...(state.challenge ? { status: "challenge", message: CHALLENGE_MESSAGE } : {}),
    ...state,
    stable: read.stable,
    readiness: read.ready ? "ready" : "incomplete",
    earliest_availability: earliestAvailability(state.availability_lines),
  };
}

async function foreground(page) {
  await page.send("Page.bringToFront");
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const visibility = await page.evaluate(() => document.visibilityState);
    if (visibility === "visible") return;
    await sleep(200);
  }
  throw new HelperError("blocked", "Tab is not visible after bringToFront. Make the browser window visible, then retry.");
}

// Navigates and waits for the new document's load event, so the following read cannot see the previous DOM.
async function navigate(page, url) {
  let onLoad;
  let timer;
  const loaded = new Promise((resolve) => {
    onLoad = (message) => message.method === "Page.loadEventFired" && resolve(true);
    page.listeners.add(onLoad);
    timer = setTimeout(() => resolve(false), 20_000);
  });
  try {
    await page.send("Page.navigate", { url });
    if (!(await loaded)) throw new HelperError("not-ready", `Page did not finish loading: ${url}`);
  } finally {
    clearTimeout(timer);
    page.listeners.delete(onLoad);
  }
}

async function loadPacing() {
  try {
    return JSON.parse(await readFile(PACING_FILE, "utf8"));
  } catch {
    return { last_click_at: 0, blocked_at: null, retried_after_cooldown: false, hand_back: false };
  }
}

const savePacing = (state) => writeFile(PACING_FILE, JSON.stringify(state, null, 2));

export function pacingGate(state, now = Date.now()) {
  if (state.hand_back) {
    return { allowed: false, reason: "Two silent no-op episodes in this run. Stop all cart changes and hand the remaining items back to the human." };
  }
  if (state.blocked_at && now - state.blocked_at < NOOP_COOLDOWN_MS) {
    const seconds = Math.ceil((NOOP_COOLDOWN_MS - (now - state.blocked_at)) / 1000);
    return { allowed: false, reason: `Cooling down after silent no-ops; no cart changes for ${seconds}s. Then reload the product page and try once.` };
  }
  return { allowed: true, wait_ms: Math.max(0, MIN_CLICK_GAP_MS - (now - state.last_click_at)) };
}

async function physicalClick(page, which, pacing) {
  const gate = pacingGate(pacing);
  if (!gate.allowed) throw new HelperError("blocked", gate.reason);
  if (gate.wait_ms) await sleep(gate.wait_ms);
  await foreground(page);
  const point = await page.evaluate(locateControlInPage, which);
  if (!point.found) throw new HelperError("not-ready", `Main-product ${which} control not found`);
  if (point.disabled) throw new HelperError("unavailable", `Main-product ${which} control is disabled`);
  await sleep(250);
  const fresh = await page.evaluate(locateControlInPage, which);
  if (fresh.covered_by_challenge) throw new HelperError("challenge", CHALLENGE_MESSAGE);
  if (!fresh.hits_control) throw new HelperError("not-ready", `Main-product ${which} control is covered or still moving; take a visual look`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: fresh.x, y: fresh.y });
  await sleep(80);
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: fresh.x, y: fresh.y, button: "left", clickCount: 1 });
  await sleep(60);
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: fresh.x, y: fresh.y, button: "left", clickCount: 1 });
  pacing.last_click_at = Date.now();
  await savePacing(pacing);
}

const quantityOf = (state) => (state.control.kind === "stepper" ? state.control.value : state.control.kind === "add" ? 0 : null);

async function stepOnce(page, from, to, pacing) {
  const which = from === 0 ? "add" : to > from ? "up" : "down";
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let requests = 0;
    const onRequest = (message) => {
      if (message.method === "Network.requestWillBeSent" && /cart|mtop/i.test(message.params.request.url)) requests += 1;
    };
    page.listeners.add(onRequest);
    await physicalClick(page, which, pacing);
    const deadline = Date.now() + STEP_TIMEOUT_MS;
    let state = await page.evaluate(readProductInPage);
    while (quantityOf(state) !== to && !state.challenge && Date.now() < deadline) {
      await sleep(300);
      state = await page.evaluate(readProductInPage);
    }
    page.listeners.delete(onRequest);
    if (state.challenge) throw new HelperError("challenge", CHALLENGE_MESSAGE, { from, to, cart_requests: requests });
    if (quantityOf(state) === to) {
      await sleep(SETTLE_MS);
      const reread = await page.evaluate(readProductInPage);
      if (quantityOf(reread) !== to) {
        throw new HelperError("uncertain", `Quantity changed after settling (${to} -> ${quantityOf(reread)}). Reconcile in the cart before any retry.`);
      }
      return { from, to, attempt, cart_requests: requests };
    }
    if (quantityOf(state) !== from) {
      throw new HelperError("uncertain", `Unexpected quantity ${quantityOf(state)} after ${which} (expected ${to}). Reconcile in the cart before any retry.`);
    }
    // True no-op: same value, no change. AGENTS.md allows one fresh retry.
    if (attempt === 1) await sleep(MIN_CLICK_GAP_MS);
    else return { from, to, attempt, cart_requests: requests, no_op: true };
  }
  throw new Error("unreachable");
}

async function setQuantity(page, expect, target) {
  const pacing = await loadPacing();
  const gate = pacingGate(pacing);
  if (!gate.allowed) throw new HelperError("blocked", gate.reason);
  if (pacing.blocked_at) pacing.retried_after_cooldown = true;

  await page.send("Network.enable");
  await foreground(page);
  const read = await settledRead(page, readProductInPage, productReady);
  const before = summarizeProduct(read);
  if (before.challenge) throw new HelperError("challenge", CHALLENGE_MESSAGE, { product: before });
  if (before.item_id !== expect.item_id || before.sku_id !== expect.sku_id) {
    throw new HelperError("identity", `Page shows i${before.item_id}-s${before.sku_id}, expected i${expect.item_id}-s${expect.sku_id}`, { product: before });
  }
  if (!read.ready || !read.stable) throw new HelperError("not-ready", "Main product control or availability did not settle", { product: before });
  if (before.control.kind === "add" && (before.control.disabled || before.main_text_unavailable)) {
    throw new HelperError("unavailable", "Main product control is disabled or marked unavailable", { product: before });
  }

  const steps = [];
  let current = quantityOf(before);
  if (current === null) throw new HelperError("not-ready", "Main product quantity is unreadable", { product: before });
  while (current !== target) {
    const next = current < target ? current + 1 : current - 1;
    const step = await stepOnce(page, current, next, pacing);
    steps.push(step);
    if (step.no_op) {
      if (pacing.blocked_at && pacing.retried_after_cooldown) pacing.hand_back = true;
      pacing.blocked_at = Date.now();
      pacing.retried_after_cooldown = false;
      await savePacing(pacing);
      throw new HelperError(
        "no-op",
        pacing.hand_back
          ? "Silent no-op again after cooldown. Stop all cart changes; hand the remaining items to the human."
          : "Two clicks produced no change. Stop ALL cart changes for 60s, then reload this page and run set-qty once more.",
        { quantity: current, steps, product: before },
      );
    }
    current = next;
  }
  Object.assign(pacing, { blocked_at: null, retried_after_cooldown: false });
  await savePacing(pacing);
  const after = summarizeProduct(await settledRead(page, readProductInPage, productReady));
  return { status: "confirmed", expect: `i${expect.item_id}-s${expect.sku_id}`, baseline: quantityOf(before), quantity: quantityOf(after), steps, product: after };
}

async function main(argv) {
  const args = parseArgs(argv);
  switch (args.command) {
    case "tabs": {
      const tabs = (await listTargets(args.endpoint)).filter((tab) => /lazada\.sg|redmart/i.test(tab.url));
      return tabs.map(({ id, url, title }) => ({ id, url, title }));
    }
    case "open": {
      const url = args.positional[0];
      if (!/^https:\/\/([a-z]+\.)?lazada\.sg\//.test(url ?? "")) throw new HelperError("usage", "open needs an https://*.lazada.sg/ URL");
      const response = await fetch(new URL(`/json/new?${encodeURI(url)}`, args.endpoint), { method: "PUT" });
      const { id, url: opened } = await response.json();
      return { id, url: opened };
    }
    case "goto": {
      const url = args.positional[0];
      if (!parseProductIds(url ?? "")) throw new HelperError("usage", "goto needs a canonical product URL (…/products/i<item>-s<sku>.html)");
      const page = await connect(args.endpoint, args.tab);
      try {
        await page.send("Page.enable");
        await foreground(page);
        await navigate(page, url);
        const wanted = parseProductIds(url);
        const arrived = (state) => state.item_id === wanted.item_id && state.sku_id === wanted.sku_id && productReady(state);
        return summarizeProduct(await settledRead(page, readProductInPage, arrived, 20_000));
      } finally {
        page.close();
      }
    }
    case "product": {
      const page = await connect(args.endpoint, args.tab);
      try {
        return summarizeProduct(await settledRead(page, readProductInPage, productReady));
      } finally {
        page.close();
      }
    }
    case "set-qty": {
      const expect = parseExpect(args.expect);
      const target = Number(args.target);
      if (!expect) throw new HelperError("usage", "--expect must look like i<item_id>-s<sku_id>");
      if (!Number.isInteger(target) || target < 0 || target > 20) throw new HelperError("usage", "--target must be an integer from 0 to 20");
      const page = await connect(args.endpoint, args.tab);
      try {
        return await setQuantity(page, expect, target);
      } finally {
        page.close();
      }
    }
    case "cart": {
      const page = await connect(args.endpoint, args.tab);
      try {
        await page.send("Page.enable");
        await foreground(page);
        await navigate(page, CART_URL);
        const read = await settledRead(page, readCartInPage, (state) => state.rows.length > 0, 8000);
        return {
          ...read.state,
          stable: read.stable,
          note: "Ordinary rows only. Promotion-grouped products may be hidden or partial: inspect each group's EDIT page before calling anything missing.",
        };
      } finally {
        page.close();
      }
    }
    case "pacing":
      return { file: PACING_FILE, ...(await loadPacing()), gate: pacingGate(await loadPacing()) };
    case "reset-pacing":
      await savePacing({ last_click_at: Date.now(), blocked_at: null, retried_after_cooldown: false, hand_back: false });
      return { status: "reset" };
    default:
      throw new HelperError("usage", args.command ? `Unknown command: ${args.command}` : "Missing command");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await main(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
    if (result?.status === "challenge") process.exit(EXIT_CODES.challenge);
  } catch (error) {
    const status = error instanceof HelperError ? error.status : "error";
    console.log(JSON.stringify({ status, message: error.message, ...(error.details ?? {}) }, null, 2));
    if (status === "usage") console.error(`\n${USAGE}`);
    process.exit(EXIT_CODES[status] ?? 1);
  }
}

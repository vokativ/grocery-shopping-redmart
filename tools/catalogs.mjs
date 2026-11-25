#!/usr/bin/env node
// Choose and inspect the active catalog: list | select <path> | current | clear.
// Command logic lives in exported functions returning { code, stdout, stderr } so tests need no subprocess.
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { loadCatalog, validateCatalog } from "./catalog.mjs";
import { platformOf, platformStatus } from "./platforms/index.mjs";
import {
  REPO_ROOT,
  SELECTION_FILE,
  clearSelection,
  describeCatalog,
  displayPath,
  isExampleCatalog,
  readSelection,
  resolveCatalog,
  writeSelection
} from "./resolve-catalog.mjs";

const USAGE = `Usage: node tools/catalogs.mjs list [--json]
       node tools/catalogs.mjs select <path> [--acknowledge-experimental]
       node tools/catalogs.mjs current [--expect-platform <platform>]
       node tools/catalogs.mjs clear`;

const result = (code, stdout = [], stderr = []) => ({ code, stdout: stdout.join("\n"), stderr: stderr.join("\n") });
const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/** Platform, status and validity of one catalog file; never throws. */
async function inspect(path) {
  let catalog;
  try {
    catalog = await loadCatalog(path);
  } catch (error) {
    return { platform: null, status: null, items: 0, store_name: null, valid: false, errors: [`cannot read catalog: ${error.message.split("\n")[0]}`], declared: false };
  }
  const errors = validateCatalog(catalog);
  const platform = platformOf(catalog);
  const info = {
    platform,
    status: platformStatus(platform) ?? null,
    items: Array.isArray(catalog?.items) ? catalog.items.length : 0,
    store_name: typeof catalog?.store?.name === "string" ? catalog.store.name : null,
    valid: errors.length === 0,
    declared: typeof catalog?.store?.platform === "string"
  };
  if (errors.length) info.errors = errors.slice(0, 3);
  return info;
}

function discoverPaths(root) {
  const found = [];
  const local = join(root, "grocery-catalog.local.yaml");
  if (isFile(local)) found.push({ path: local, label: "personal-local", always: true });
  const rootCatalog = join(root, "grocery-catalog.yaml");
  if (isFile(rootCatalog)) found.push({ path: rootCatalog, label: "bundled-root", always: true });

  const shared = join(root, "catalogs");
  if (existsSync(shared)) {
    const files = readdirSync(shared, { recursive: true }).map(String).filter((name) => /\.ya?ml$/i.test(name)).sort();
    for (const name of files) found.push({ path: join(shared, name), label: "shared", always: false });
  }
  const examples = join(root, "examples");
  if (existsSync(examples)) {
    const files = readdirSync(examples).filter((name) => name.endsWith(".catalog.yaml")).sort();
    for (const name of files) found.push({ path: join(examples, name), label: "example", always: true });
  }
  return found;
}

export async function listCatalogs({ root = REPO_ROOT, env = process.env, flag } = {}) {
  const notes = [];
  let selection = null;
  let selectionError = null;
  try {
    selection = readSelection(root);
  } catch (error) {
    selectionError = error;
    notes.push(error.message);
  }

  let resolved = null;
  try {
    resolved = resolveCatalog({ flag, env, root });
  } catch (error) {
    if (error.message !== selectionError?.message) notes.push(error.message);
  }

  const candidates = [];
  for (const entry of discoverPaths(root)) {
    const info = await inspect(entry.path);
    // Shared catalogs must opt in by declaring a platform; other YAML under catalogs/ is not a catalog.
    if (!entry.always && !info.declared) continue;
    const { declared, ...rest } = info;
    candidates.push({
      path: displayPath(entry.path, root),
      label: entry.label,
      ...rest,
      active: resolved !== null && resolve(resolved.path) === resolve(entry.path)
    });
  }

  let active = null;
  if (resolved) {
    const known = candidates.find((candidate) => candidate.active);
    const info = known ?? (await inspect(resolved.path));
    active = { path: displayPath(resolved.path, root), source: resolved.source, platform: info.platform, status: info.status };
  }

  const needsChoice = !flag && !env.GROCERY_CATALOG && selection === null && selectionError === null;
  let reason;
  if (flag) reason = "a --catalog flag was given";
  else if (env.GROCERY_CATALOG) reason = "GROCERY_CATALOG is set";
  else if (selectionError) reason = `${SELECTION_FILE} exists but is unusable`;
  else if (selection) reason = `${SELECTION_FILE} selects ${selection.catalog}`;
  else reason = "no catalog has been selected yet";

  const localPath = join(root, "grocery-catalog.local.yaml");
  if (resolved && resolved.source !== "local" && isFile(localPath) && resolve(resolved.path) !== resolve(localPath)) {
    const overrider = { flag: "the --catalog flag", env: "GROCERY_CATALOG", selection: "the selection" }[resolved.source] ?? resolved.source;
    notes.push(`${overrider} overrides grocery-catalog.local.yaml`);
  }
  if (needsChoice && resolved) notes.push(`until a catalog is selected, ${displayPath(resolved.path, root)} (source: ${resolved.source}) is used by default`);
  if (resolved && isExampleCatalog(resolved.path, root)) notes.push("the active catalog is an example: price tracking refuses it");

  return { active, selection, needs_choice: needsChoice, reason, candidates, notes };
}

function formatList(report) {
  const lines = [];
  lines.push(report.active ? `Active: ${report.active.path} (source: ${report.active.source}, platform: ${report.active.platform}, status: ${report.active.status})` : "Active: none");
  lines.push(`Needs choice: ${report.needs_choice ? "yes" : "no"} (${report.reason})`);
  lines.push("");
  const rows = report.candidates.map((candidate) => [
    candidate.active ? "*" : " ",
    candidate.path,
    candidate.label,
    candidate.platform ?? "?",
    candidate.status ?? "?",
    String(candidate.items),
    candidate.store_name ?? "-",
    candidate.valid ? "valid" : `INVALID: ${(candidate.errors ?? []).join("; ")}`
  ]);
  const header = ["", "path", "label", "platform", "status", "items", "store", "valid"];
  const widths = header.map((_, column) => Math.max(header[column].length, ...rows.map((row) => row[column].length)));
  const format = (row) => row.map((cell, column) => cell.padEnd(widths[column])).join("  ").trimEnd();
  lines.push(format(header), ...rows.map(format));
  if (report.notes.length) {
    lines.push("");
    for (const note of report.notes) lines.push(`Note: ${note}`);
  }
  return lines;
}

export async function listCommand({ json = false, ...options } = {}) {
  const report = await listCatalogs(options);
  return result(0, json ? [JSON.stringify(report, null, 2)] : formatList(report));
}

export async function selectCommand(path, { acknowledgeExperimental = false, root = REPO_ROOT, env = process.env, cwd = process.cwd() } = {}) {
  if (!path) return result(1, [], ["Error: select needs a catalog path", USAGE]);
  const absolute = resolve(cwd, path);
  if (!isFile(absolute)) return result(1, [], [`Error: catalog not found: ${absolute}`]);

  let catalog;
  try {
    catalog = await loadCatalog(absolute);
  } catch (error) {
    return result(1, [], [`Error: cannot read catalog ${absolute}: ${error.message.split("\n")[0]}`]);
  }
  const errors = validateCatalog(catalog);
  if (errors.length) {
    return result(1, [], [`Error: ${displayPath(absolute, root)} is invalid (${errors.length} error(s)); selection not written:`, ...errors.map((error) => `- ${error}`)]);
  }

  const platform = platformOf(catalog);
  writeSelection({ catalog: absolute, platform, acknowledged_experimental: acknowledgeExperimental }, root);
  const current = await currentCommand({ root, env });
  const stderr = env.GROCERY_CATALOG ? [`Warning: GROCERY_CATALOG is set and overrides the selection.`] : [];
  // Exit 3 is for `current`; a successful select of an unconfirmed experimental catalog still succeeded.
  return result(current.code === 3 ? 0 : current.code, [`Selected ${displayPath(absolute, root)}`, current.stdout].filter(Boolean), [...stderr, current.stderr].filter(Boolean));
}

export async function currentCommand({ expectPlatform, root = REPO_ROOT, env = process.env, flag } = {}) {
  let resolved;
  let selection = null;
  try {
    resolved = resolveCatalog({ flag, env, root });
    if (resolved.source === "selection") selection = readSelection(root);
  } catch (error) {
    return result(1, [], [`Error: ${error.message}`]);
  }
  let catalog;
  try {
    catalog = await loadCatalog(resolved.path);
  } catch (error) {
    return result(1, [], [`Error: cannot read catalog ${resolved.path}: ${error.message.split("\n")[0]}`]);
  }
  const platform = platformOf(catalog);
  const status = platformStatus(platform);
  const stdout = [`Catalog: ${describeCatalog(resolved, root)}`, `Platform: ${platform} (${status ?? "unsupported"})`];
  if (!status) return result(1, stdout, [`Error: platform "${platform}" is not supported`]);
  if (expectPlatform && expectPlatform !== platform) {
    return result(2, stdout, [`Platform mismatch: expected ${expectPlatform} but the active catalog is ${platform}. Resolve this with the user before continuing.`]);
  }
  if (status === "experimental" && resolved.source === "selection" && selection?.acknowledged_experimental !== true) {
    return result(3, stdout, [`Platform ${platform} is experimental and has not been confirmed by the user. Confirm, then run: node tools/catalogs.mjs select ${selection?.catalog ?? "<path>"} --acknowledge-experimental`]);
  }
  return result(0, stdout);
}

export function clearCommand({ root = REPO_ROOT } = {}) {
  return result(0, [clearSelection(root) ? `Cleared ${SELECTION_FILE}` : `No ${SELECTION_FILE} to clear`]);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = { command, json: false, acknowledgeExperimental: false, expectPlatform: undefined, positional: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--json" && command === "list") args.json = true;
    else if (arg === "--acknowledge-experimental" && command === "select") args.acknowledgeExperimental = true;
    else if (arg === "--expect-platform" && command === "current") {
      const value = rest[(index += 1)];
      if (!value || value.startsWith("--")) throw new Error("--expect-platform needs a platform name");
      args.expectPlatform = value;
    } else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else args.positional.push(arg);
  }
  if (!["list", "select", "current", "clear"].includes(command)) throw new Error(command ? `Unknown command: ${command}` : "Missing command");
  const expected = command === "select" ? 1 : 0;
  if (args.positional.length !== expected) throw new Error(command === "select" ? "select needs exactly one catalog path" : `${command} takes no positional arguments`);
  return args;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`Error: ${error.message}\n\n${USAGE}`);
    process.exit(1);
  }
  let outcome;
  if (args.command === "list") outcome = await listCommand({ json: args.json });
  else if (args.command === "select") outcome = await selectCommand(args.positional[0], { acknowledgeExperimental: args.acknowledgeExperimental });
  else if (args.command === "current") outcome = await currentCommand({ expectPlatform: args.expectPlatform });
  else outcome = clearCommand();
  if (outcome.stdout) console.log(outcome.stdout);
  if (outcome.stderr) console.error(outcome.stderr);
  process.exitCode = outcome.code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

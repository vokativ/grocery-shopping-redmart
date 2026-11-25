// Single place that decides which catalog a tool operates on, and where its price history lives.
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SELECTION_FILE = ".grocery-selection.local.json";
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ROOT_CATALOG = "grocery-catalog.yaml";
const LOCAL_CATALOG = "grocery-catalog.local.yaml";

const isFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

const selectionPath = (root) => join(root, SELECTION_FILE);

/** Repo-relative POSIX path for files inside `root`, the absolute path otherwise. */
export function displayPath(path, root = REPO_ROOT) {
  const rel = relative(root, path);
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) return path;
  return rel.split(sep).join("/");
}

export function describeCatalog({ path, source }, root = REPO_ROOT) {
  return `${displayPath(path, root)} (source: ${source})`;
}

/** The parsed selection file, or null when there is none. A malformed file throws. */
export function readSelection(root = REPO_ROOT) {
  const path = selectionPath(root);
  if (!existsSync(path)) return null;
  let selection;
  try {
    selection = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${SELECTION_FILE} is not valid JSON (${error.message}); fix it or run "node tools/catalogs.mjs clear"`);
  }
  if (!selection || typeof selection !== "object" || Array.isArray(selection) || typeof selection.catalog !== "string" || !selection.catalog) {
    throw new Error(`${SELECTION_FILE} must be a JSON object with a string "catalog"; fix it or run "node tools/catalogs.mjs clear"`);
  }
  return selection;
}

export function writeSelection({ catalog, platform, acknowledged_experimental = false }, root = REPO_ROOT) {
  const absolute = resolve(root, catalog);
  const selection = {
    catalog: displayPath(absolute, root),
    platform,
    acknowledged_experimental: acknowledged_experimental === true,
    selected_at: new Date().toISOString().slice(0, 10)
  };
  writeFileSync(selectionPath(root), `${JSON.stringify(selection, null, 2)}\n`);
  return selection;
}

export function clearSelection(root = REPO_ROOT) {
  const path = selectionPath(root);
  const existed = existsSync(path);
  rmSync(path, { force: true });
  return existed;
}

/**
 * Order: flag (relative to cwd) > GROCERY_CATALOG env (relative to root) > selection file (relative to root)
 * > <root>/grocery-catalog.local.yaml > <root>/grocery-catalog.yaml.
 * An explicit choice that points at a missing file is an error, never a silent fall-through.
 */
export function resolveCatalog({ flag, env = process.env, root = REPO_ROOT } = {}) {
  const explicit = (source, path) => {
    if (!isFile(path)) throw new Error(`catalog from ${source} not found: ${path}`);
    return { path, source };
  };
  if (flag) return explicit("flag", resolve(flag));
  if (env.GROCERY_CATALOG) return explicit("env", resolve(root, env.GROCERY_CATALOG));
  const selection = readSelection(root);
  if (selection) return explicit("selection", resolve(root, selection.catalog));
  const local = join(root, LOCAL_CATALOG);
  if (isFile(local)) return { path: local, source: "local" };
  return { path: join(root, ROOT_CATALOG), source: "root" };
}

/** The maintainer's catalog keeps `price-history.csv`; every other catalog gets its own local history file. */
export function historyPathFor(catalogPath, root = REPO_ROOT) {
  const absolute = resolve(catalogPath);
  if (absolute === resolve(root, ROOT_CATALOG)) return join(resolve(root), "price-history.csv");
  return `${absolute.replace(/\.ya?ml$/i, "")}.price-history.local.csv`;
}

export function isExampleCatalog(catalogPath, root = REPO_ROOT) {
  const rel = relative(join(resolve(root), "examples"), resolve(catalogPath));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

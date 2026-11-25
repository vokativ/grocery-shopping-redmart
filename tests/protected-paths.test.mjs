import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const SCRIPT = fileURLToPath(new URL("../scripts/check-protected-paths.sh", import.meta.url));
const available = (cmd) => spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0;
const skip = !(available("git") && available("bash")) && "git or bash is unavailable";

const git = (cwd, ...args) => {
  const result = spawnSync("git", ["-c", "user.name=Test", "-c", "user.email=test@example.com", "-c", "commit.gpgsign=false", ...args], { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  return result.stdout;
};

const put = (repo, file, content) => {
  const path = join(repo, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
};

const check = (repo, ...args) => spawnSync("bash", [SCRIPT, ...args], { cwd: repo, encoding: "utf8" });

function makeRepo() {
  const repo = mkdtempSync(join(tmpdir(), "protected-paths-"));
  git(repo, "init", "-q", "-b", "base");
  put(repo, "grocery-catalog.yaml", "catalog_version: 2\n");
  put(repo, "price-history.csv", "date\n");
  put(repo, "experiments/fairprice/backup-catalog.yaml", "status: inactive\n");
  put(repo, "README.md", "readme\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "base");
  return repo;
}

test("protected-paths guard fails on a protected file and names it", { skip }, () => {
  const repo = makeRepo();
  try {
    git(repo, "checkout", "-q", "-b", "head");
    put(repo, "grocery-catalog.yaml", "catalog_version: 3\n");
    put(repo, "catalogs/fairprice/x.yaml", "x: 1\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "touch protected");
    const result = check(repo, "base", "head");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /grocery-catalog\.yaml/);
    assert.doesNotMatch(result.stderr, /catalogs\/fairprice\/x\.yaml/);
    assert.match(result.stderr, /catalogs\/README\.md/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("protected-paths guard names every protected file that changed", { skip }, () => {
  const repo = makeRepo();
  try {
    git(repo, "checkout", "-q", "-b", "head");
    put(repo, "price-history.csv", "date\nmore\n");
    put(repo, "experiments/fairprice/backup-catalog.yaml", "status: inactive\nx: 1\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "touch protected");
    const result = check(repo, "base", "head");
    assert.equal(result.status, 1);
    assert.match(result.stderr, /price-history\.csv/);
    assert.match(result.stderr, /experiments\/fairprice\/backup-catalog\.yaml/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("protected-paths guard passes when only shared catalogs change", { skip }, () => {
  const repo = makeRepo();
  try {
    git(repo, "checkout", "-q", "-b", "head");
    put(repo, "catalogs/fairprice/x.yaml", "x: 1\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "add shared catalog");
    const result = check(repo, "base", "head");
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("protected-paths guard ignores protected changes made on the base side after the fork point", { skip }, () => {
  const repo = makeRepo();
  try {
    git(repo, "checkout", "-q", "-b", "head");
    put(repo, "catalogs/fairprice/x.yaml", "x: 1\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "add shared catalog");
    git(repo, "checkout", "-q", "base");
    put(repo, "grocery-catalog.yaml", "catalog_version: 4\n");
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "maintainer update");
    const result = check(repo, "base", "head");
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("protected-paths guard exits 2 on bad usage", { skip }, () => {
  const repo = makeRepo();
  try {
    assert.equal(check(repo).status, 2);
    assert.equal(check(repo, "base").status, 2);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

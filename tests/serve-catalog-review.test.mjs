import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { startCatalogReviewServer } from "../tools/serve-catalog-review.mjs";

async function reservePort(host, port) {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

test("serves one review page on a loopback-only ephemeral port", async (t) => {
  const tempDir = await mkdtemp(join(tmpdir(), "catalog-review-server-"));
  const filePath = join(tempDir, "review.html");
  const html = "<!doctype html><title>Catalog Review</title><p>Ready</p>";
  await writeFile(filePath, html, "utf8");

  const runningServer = await startCatalogReviewServer({ filePath });
  t.after(() => runningServer.close());

  assert.equal(runningServer.host, "127.0.0.1");
  assert.ok(runningServer.port > 0);
  assert.equal(runningServer.url, `http://127.0.0.1:${runningServer.port}/`);

  const response = await fetch(runningServer.url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(await response.text(), html);

  const headResponse = await fetch(runningServer.url, { method: "HEAD" });
  assert.equal(headResponse.status, 200);
  assert.equal(await headResponse.text(), "");

  const missingResponse = await fetch(`${runningServer.url}anything-else`);
  assert.equal(missingResponse.status, 404);

  const postResponse = await fetch(runningServer.url, { method: "POST" });
  assert.equal(postResponse.status, 405);
  assert.equal(postResponse.headers.get("allow"), "GET, HEAD");

  await runningServer.close();
  await reservePort(runningServer.host, runningServer.port);
});

test("rejects missing files and unsafe port values", async () => {
  await assert.rejects(() => startCatalogReviewServer(), /HTML file is required/);
  await assert.rejects(
    () => startCatalogReviewServer({ filePath: "missing-review.html" }),
    /ENOENT/
  );
  await assert.rejects(
    () => startCatalogReviewServer({ filePath: "missing-review.html", port: 65536 }),
    /integer between 0 and 65535/
  );
  await assert.rejects(
    () => startCatalogReviewServer({ filePath: "missing-review.html", port: "not-a-port" }),
    /integer between 0 and 65535/
  );
});

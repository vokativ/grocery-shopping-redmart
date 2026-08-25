import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";

const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8");
const guide = await readFile(new URL("../docs/omp-setup.md", import.meta.url), "utf8");
const benchmark = await readFile(
  new URL("../docs/model-benchmark-plan.md", import.meta.url),
  "utf8"
);

test("OMP instructions require one visible relay or loopback-CDP surface", () => {
  assert.match(agents, /OMP Browser Relay/);
  assert.match(agents, /OMP CDP/);
  assert.match(agents, /real, headed browser surface that the user can see and interrupt/);
  assert.match(agents, /endpoint must be loopback-only/);
  assert.match(agents, /Do not silently switch among `iab`, OMP relay, OMP CDP/);
  assert.match(guide, /Browser Relay — preferred/);
  assert.match(guide, /Loopback CDP — explicit alternative/);
  assert.match(guide, /Never expose a CDP port on `0\.0\.0\.0`/);
});

test("OMP model reporting does not depend on the Desktop composer", () => {
  assert.match(agents, /missing ChatGPT Desktop composer is not a blocker/);
  assert.match(agents, /Do not claim that the Desktop Terra evidence applies to another model or harness/);
  assert.match(guide, /runtime model and reasoning setting, when exposed/);
});

test("OMP element rules preserve exact identity and rerender handling", () => {
  assert.match(guide, /final product URL's item ID and SKU ID as authoritative identity/);
  assert.match(guide, /reacquire the page and element references/);
  assert.match(guide, /exact main product control or exact cart row identified by item ID and SKU ID/);
  assert.match(guide, /Perform quantity changes one unit at a time/);
  assert.match(guide, /Use header counts only as checksums/);
  assert.match(guide, /Never activate checkout/);
  assert.match(guide, /Prefer OMP `tab` helpers/);
  assert.match(guide, /Do not mutate the cart with `page\.evaluate/);
  assert.match(guide, /If an action times out or errors, reread the exact SKU and quantity/);
});

test("OMP live tests require exact baseline restoration", () => {
  assert.match(guide, /Record every pre-existing cart row by exact item ID, SKU ID, title, pack size, and quantity/);
  assert.match(guide, /Restore only the recorded test SKUs to their original quantities/);
  assert.match(guide, /Both reads must match the complete pre-test manifest/);
  assert.match(agents, /After all test SKUs reach their recorded baseline/);
});

test("OMP guide records the reversible live validation evidence", () => {
  assert.match(guide, /On 2026-08-25, the OMP Browser Relay path completed a reversible live RedMart smoke test/);
  assert.match(guide, /The final cart checksum was eight units/);
  assert.match(guide, /Two final settled cart reads showed only the original out-of-stock item/);
  assert.match(guide, /direct DOM `element\.click\(\)` then changed the local stepper to 0 but did not persist/);
});

test("benchmark accepts only qualifying visible OMP control channels", () => {
  assert.match(benchmark, /OMP Browser Relay/);
  assert.match(benchmark, /loopback-only CDP can qualify/);
  assert.match(benchmark, /generic\s+.*headless Puppeteer browser/s);
  assert.match(benchmark, /does \*\*not\*\* qualify/);
});

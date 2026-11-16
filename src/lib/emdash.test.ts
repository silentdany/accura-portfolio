import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "../..");
const self = relative(root, fileURLToPath(import.meta.url));

const EM_DASH = String.fromCodePoint(0x2014);
const ESCAPED = "\\" + "u2014";
const ENTITY = "&" + "mdash;";

const SRC_EXT = new Set([".ts", ".tsx", ".json", ".css"]);
const PUBLIC_EXT = new Set([".txt", ".xml", ".json", ".webmanifest", ".svg", ".html"]);
const SCRIPT_EXT = new Set([".mjs", ".js", ".cjs", ".ts", ".tsx"]);

function walk(dir: string, exts: Set<string>): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && exts.has(extname(entry.name).toLowerCase()))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .sort();
}

function readmeFiles(): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toUpperCase().startsWith("README"))
    .map((entry) => entry.name)
    .sort();
}

const sources = [
  ...walk(join(root, "src"), SRC_EXT),
  ...readmeFiles(),
  ...walk(join(root, "public"), PUBLIC_EXT),
  ...walk(join(root, "scripts"), SCRIPT_EXT),
].filter((file) => file !== self);

function bannedIn(text: string): string[] {
  const hits: string[] = [];
  if (text.includes(EM_DASH)) hits.push("U+2014");
  if (text.includes(ESCAPED)) hits.push(ESCAPED);
  if (text.includes(ENTITY)) hits.push(ENTITY);
  return hits;
}

describe("em dashes", () => {
  it("scans source, README, public text and scripts", () => {
    assert.ok(sources.includes("src/app/layout.tsx"));
    assert.ok(sources.includes("src/app/llms.txt/route.ts"));
    assert.ok(sources.includes("src/lib/format.ts"));
    assert.ok(sources.includes("README.md"));
    assert.ok(sources.includes("scripts/reset-admin.ts"));
    assert.equal(sources.includes(self), false);
  });

  for (const file of sources) {
    it(`are absent from ${file}`, () => {
      const text = readFileSync(join(root, file), "utf8");
      const hits = bannedIn(text);
      assert.deepEqual(hits, [], `${file} contains ${hits.join(", ")}`);
    });
  }
});

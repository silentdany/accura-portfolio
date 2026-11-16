import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildSitemap } from "./sitemap";

const base = "https://portfolio.accura.dev";
const visible = {
  slug: "wow-lite",
  updatedAt: new Date("2026-11-09T22:02:30.324Z"),
  lastUpdatedAt: new Date("2026-11-09T22:02:30.324Z"),
  pinned: true,
};

describe("buildSitemap", () => {
  it("omits hidden or unpublished project slugs such as cachet and jeu-mode", () => {
    const urls = buildSitemap(base, [visible], [], [{ slug: "jeux" }]).map((entry) => entry.url);
    assert.deepEqual(urls, [
      `${base}`,
      `${base}/now`,
      `${base}/stories`,
      `${base}/?c=jeux`,
      `${base}/projects/wow-lite`,
    ]);
    assert.equal(urls.some((url) => url.endsWith("/projects/cachet")), false);
    assert.equal(urls.some((url) => url.endsWith("/projects/jeu-mode")), false);
  });

  it("only lists projects it is given, so a hidden catalogue row cannot appear", () => {
    const urls = buildSitemap(base, [visible], [], []).map((entry) => entry.url);
    assert.equal(urls.includes(`${base}/projects/cachet`), false);
    assert.equal(urls.includes(`${base}/projects/jeu-mode`), false);
    assert.ok(urls.includes(`${base}/projects/wow-lite`));
  });
});

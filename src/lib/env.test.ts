import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRODUCTION_BUILD_PHASE, resolveAuthSecret } from "./env";

describe("resolveAuthSecret", () => {
  it("returns a trimmed secret when the variable is set", () => {
    assert.equal(resolveAuthSecret("  super-secret  ", undefined), "super-secret");
  });

  it("throws a clear error at runtime when the secret is missing", () => {
    assert.throws(() => resolveAuthSecret(undefined, undefined), /BETTER_AUTH_SECRET is required at runtime/);
    assert.throws(() => resolveAuthSecret("   ", "phase-production-server"), /BETTER_AUTH_SECRET is required at runtime/);
    assert.throws(() => resolveAuthSecret(undefined, "phase-development-server"), /BETTER_AUTH_SECRET is required at runtime/);
  });

  it("allows next build to finish without a secret", () => {
    const placeholder = resolveAuthSecret(undefined, PRODUCTION_BUILD_PHASE);
    assert.equal(placeholder, "build-placeholder-not-used-at-runtime");
    assert.notEqual(placeholder, "dev-only-insecure-secret-change-me");
  });

  it("prefers the real secret during a production build", () => {
    assert.equal(resolveAuthSecret("from-env", PRODUCTION_BUILD_PHASE), "from-env");
  });
});

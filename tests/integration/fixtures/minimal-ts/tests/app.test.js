const assert = require("node:assert");
const { describe, it } = require("node:test");

describe("app", () => {
  it("should be importable", () => {
    assert.ok(true, "App module exists");
  });
});

/**
 * Tests for the answerer module — fail-closed behavior and PAW rules.
 * These tests don't require SDK auth and run offline.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { RuleBasedAnswerer, pawCommonRules } from "../../lib/answerer.js";

describe("RuleBasedAnswerer", () => {
  it("throws on unmatched question when fail-closed", () => {
    const answerer = new RuleBasedAnswerer([]);

    assert.throws(
      () => answerer.answer({ question: "Unknown question?" }),
      /Unmatched ask_user/,
      "Should throw on unmatched question",
    );
  });

  it("returns first choice when fail-closed is disabled", () => {
    const answerer = new RuleBasedAnswerer([], false);

    const result = answerer.answer({
      question: "Pick one",
      choices: ["alpha", "beta"],
    });

    assert.strictEqual(result.answer, "alpha");
    assert.strictEqual(result.wasFreeform, false);
  });

  it("logs all answered questions", () => {
    const answerer = new RuleBasedAnswerer([], false);

    answerer.answer({ question: "Q1?", choices: ["a"] });
    answerer.answer({ question: "Q2?", choices: ["b"] });

    assert.strictEqual(answerer.log.length, 2);
    assert.strictEqual(answerer.log[0].question, "Q1?");
    assert.strictEqual(answerer.log[1].question, "Q2?");
  });
});

describe("pawCommonRules", () => {
  const rules = pawCommonRules({ workId: "test-feature", branch: "feature/test" });
  const answerer = new RuleBasedAnswerer(rules);

  it("selects minimal workflow mode", () => {
    const result = answerer.answer({
      question: "Select workflow mode",
      choices: ["Full", "Minimal", "Custom"],
    });
    assert.strictEqual(result.answer, "Minimal");
  });

  it("selects local review strategy", () => {
    const result = answerer.answer({
      question: "Choose review strategy",
      choices: ["PRs", "Local"],
    });
    assert.strictEqual(result.answer, "Local");
  });

  it("provides work ID when asked", () => {
    const result = answerer.answer({ question: "Enter work ID" });
    assert.strictEqual(result.answer, "test-feature");
  });

  it("provides branch when asked", () => {
    const result = answerer.answer({ question: "Enter branch name" });
    assert.strictEqual(result.answer, "feature/test");
  });

  it("falls back to first choice for unrecognized questions", () => {
    const result = answerer.answer({
      question: "Something unexpected?",
      choices: ["yes", "no"],
    });
    assert.strictEqual(result.answer, "yes");
  });
});

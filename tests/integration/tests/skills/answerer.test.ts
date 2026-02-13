/**
 * Tests for the answerer module — fail-closed behavior and PAW rules.
 * These tests don't require SDK auth and run offline.
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import { RuleBasedAnswerer, HybridAnswerer, pawCommonRules } from "../../lib/answerer.js";

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

describe("HybridAnswerer", () => {
  it("uses rules when they match (no LLM needed)", async () => {
    const hybrid = new HybridAnswerer(
      [(req) => /color/i.test(req.question) ? "blue" : null],
      "Test context: pick colors",
    );
    // No start() needed — rules don't need the LLM session

    const result = await hybrid.answer({ question: "What color?" });
    assert.strictEqual(result.answer, "blue");
    assert.strictEqual(hybrid.log[0].source, "rule");
  });

  it("throws if LLM fallback needed but not started", async () => {
    const hybrid = new HybridAnswerer([], "Test context");

    await assert.rejects(
      () => hybrid.answer({ question: "Unmatched question?" }),
      /HybridAnswerer not started/,
    );
  });

  it("logs source as rule for rule-matched answers", async () => {
    const hybrid = new HybridAnswerer(
      [(req) => req.choices?.[0] ?? null],
      "Test context",
    );

    await hybrid.answer({ question: "Pick", choices: ["alpha", "beta"] });
    assert.strictEqual(hybrid.log[0].source, "rule");
    assert.strictEqual(hybrid.log[0].answer, "alpha");
  });
});

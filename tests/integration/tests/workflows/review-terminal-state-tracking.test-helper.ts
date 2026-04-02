import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

export async function seedReviewArtifacts(workDir: string, identifier: string, hardened: boolean): Promise<void> {
  const dir = join(workDir, ".paw/reviews", identifier);
  await mkdir(dir, { recursive: true });

  const reviewContextLines = [
    "# ReviewContext",
    "",
    "**Branch**: feature/review-state-test",
    "**Remote**: origin",
    "**Base Branch**: main",
    "**Head Branch**: feature/review-state-test",
    "**Base Commit**: abc123",
    "**Base Commit Source**: local",
    "**Head Commit**: def456",
    "**Repository**: Local repository",
    "**Author**: Test Reviewer",
    "**Title**: Review State Test",
    "**State**: active",
    "**CI Status**: Not available",
    "**Labels**: N/A",
    "**Reviewers**: N/A",
    "**Linked Issues**: Inferred from commits",
    "**Changed Files**: 1 files, +10 -0",
    `**Artifact Paths**: .paw/reviews/${identifier}/`,
    "",
    "## Review Configuration",
    "",
    "**Review Mode**: single-model",
    "**Review Specialists**: all",
    "**Review Interaction Mode**: parallel",
    "**Review Interactive**: false",
    "**Review Specialist Models**: none",
    "**Review Perspectives**: none",
    "**Review Perspective Cap**: 2",
    "",
  ];

  if (hardened) {
    reviewContextLines.push(
      "## Hardened State",
      "",
      "TODO Mirror: active-required-items",
      "Reconciliation: current",
      "",
      "### Review Stage Items",
      "- `understanding` | `resolved` | `stage`",
      "- `evaluation` | `resolved` | `stage`",
      "- `output:feedback` | `resolved` | `stage`",
      "- `output:critic` | `resolved` | `stage`",
      "- `output:critique-response` | `resolved` | `stage`",
      "- `output:github` | `pending` | `stage`",
      "- `procedure:review-mode` | `resolved` | `procedure`",
      "",
      "### Terminal External Review State",
      "- `none`",
      "",
      "Pending Review ID: `none`",
      "Pending Review URL: `none`",
      "",
    );
  }

  await writeFile(join(dir, "ReviewContext.md"), reviewContextLines.join("\n"));

  await writeFile(join(dir, "ReviewComments.md"), [
    "---",
    "status: finalized",
    "---",
    "",
    "# Review Comments for feature-review-state-test",
    "",
    "**Status**: finalized",
    "",
    "## Inline Comments",
    "",
    "### File: `src/example.ts` | Lines: 10-12",
    "",
    "**Type**: Should",
    "**Category**: Maintainability",
    "",
    "Extract the duplicated branch logic into a small helper.",
    "",
    "**Suggestion:**",
    "```typescript",
    "const normalized = normalizeBranchName(branch);",
    "```",
    "",
    "**Rationale:**",
    "- **Evidence**: `src/example.ts:10-12` duplicates normalization logic",
    "- **Baseline Pattern**: `src/other.ts:4-8` uses a shared helper",
    "- **Impact**: Duplicate logic risks drift",
    "- **Best Practice**: Reuse shared normalization helpers",
    "",
    "**Final**: ✓ Ready for GitHub posting",
    "",
  ].join("\n"));
}

/**
 * Matchers for shell commands the tests inspect or reroute. Kept in one place so every
 * check sees the same spellings of a command (`git -C <dir> commit`, `"gh" api`).
 */

const WORD = String.raw`(?:"[^"]*"|'[^']*'|[^\s"']+)+`;

/**
 * `git` and any global options before the subcommand, as regex source: `-C <dir>`,
 * `-c k=v`, `--git-dir=<dir>`, `--no-pager` and the like. Worktree mode runs every git
 * command as `git -C <checkout> …`, so a matcher that expects the subcommand right
 * after `git` misses it.
 */
export const GIT =
  String.raw`\bgit(?:\s+(?:(?:-C|-c|--git-dir|--work-tree|--namespace|--exec-path)(?:\s+|=)${WORD}|--?[A-Za-z][\w-]*(?:=${WORD})?))*\s+`;

/** A regex for `git <rest>`, where `rest` is regex source starting at the subcommand. */
export function gitCmd(rest: string, flags = ""): RegExp {
  return new RegExp(GIT + rest, flags);
}

/** Commands that rewrite history (G12). */
export const REWRITE_COMMAND = new RegExp(
  [
    String.raw`${GIT}(?:commit-tree|update-ref|rebase|filter-branch)\b`,
    String.raw`${GIT}commit\b[^\n]*--amend`,
    String.raw`${GIT}reset\s+--hard`,
    String.raw`${GIT}push\b[^\n]*(?:--force|\s-f\b)`,
  ].join("|"),
);

/** Staging that is not a list of explicit paths (G1). */
export const BROAD_STAGING = new RegExp(
  [String.raw`${GIT}add\s+(?:-A\b|--all\b|\.(?:\s|$)|-u\b)`, String.raw`${GIT}commit\s+[^\n]*-a\b`].join("|"),
);

const SEPARATORS = "\\s;&|()`";

/**
 * Point every `gh` invocation in a shell command at a stub executable. Covers the bare
 * word and the quoted words `"gh"` and `'gh'`; other spellings are caught by `evasiveGh`.
 */
export function rewriteGhCommand(command: string, stubPath: string): string {
  const word = new RegExp(`(^|[${SEPARATORS}])(?:"gh"|'gh'|gh)(?=$|[${SEPARATORS}])`, "g");
  return command.replace(word, (_m, lead: string) => `${lead}"${stubPath}"`);
}

/**
 * Words that the shell resolves to `gh` but `rewriteGhCommand` does not reroute, such as
 * `\gh` or `g"h"`. They would run the real `gh` on PATH, so the tool policy denies them.
 */
export function evasiveGh(command: string): string[] {
  return command
    .split(new RegExp(`[${SEPARATORS}]+`))
    .filter((word) => !["gh", '"gh"', "'gh'"].includes(word) && word.replace(/["'\\]/g, "") === "gh");
}

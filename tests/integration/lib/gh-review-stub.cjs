#!/usr/bin/env node
/**
 * Offline stand-in for `gh` in PAW Review scenarios. Never put it on PATH; the harness
 * routes the agent's shell commands to it (see TestFixture.installReviewGhStub).
 *
 * Every call is appended to gh-calls.log. Reads return fixed data for one pull request
 * (gh-review-pr.json) with its diff computed by git in the working directory. Writes
 * (pending reviews, review comments, submissions) are recorded in gh-review-state.json
 * and answered with plausible ids; nothing leaves the machine.
 */
const { execFileSync } = require("child_process");
const { appendFileSync, existsSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const dir = process.env.PAW_GH_STUB_DIR;
const args = process.argv.slice(2);
appendFileSync(join(dir, "gh-calls.log"), args.join(" ") + "\n");

const pr = JSON.parse(readFileSync(join(dir, "gh-review-pr.json"), "utf-8"));
const statePath = join(dir, "gh-review-state.json");
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf-8")) : { nextId: 9001, reviews: [], comments: [], writes: [] };
const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2));
const [owner, repo] = pr.repository.split("/");

function git(...gitArgs) {
  try {
    return execFileSync("git", gitArgs, { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

function flag(names) {
  for (let i = 0; i < args.length; i++) {
    for (const n of names) {
      if (args[i] === n) return args[i + 1];
      if (args[i].startsWith(`${n}=`)) return args[i].slice(n.length + 1);
    }
  }
  return undefined;
}

function out(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const jq = flag(["--jq", "-q"]);
  if (jq && typeof value !== "string" && existsSync("/usr/bin/jq")) {
    try {
      process.stdout.write(execFileSync("/usr/bin/jq", ["-r", jq], { input: text, encoding: "utf-8" }));
      return;
    } catch {
      // fall through to raw output
    }
  }
  process.stdout.write(text + "\n");
}

function files() {
  const numstat = git("diff", "--numstat", `${pr.baseRefOid}...${pr.headRefOid}`).trim().split("\n").filter(Boolean);
  return numstat.map((line) => {
    const [additions, deletions, path] = line.split("\t");
    return { path, additions: Number(additions), deletions: Number(deletions) };
  });
}

function restPr() {
  const f = files();
  return {
    number: pr.number,
    state: "open",
    draft: false,
    title: pr.title,
    body: pr.body,
    html_url: pr.url,
    user: { login: pr.author },
    base: { ref: pr.baseRefName, sha: pr.baseRefOid, repo: { full_name: pr.repository } },
    head: { ref: pr.headRefName, sha: pr.headRefOid, repo: { full_name: pr.repository } },
    additions: f.reduce((n, x) => n + x.additions, 0),
    deletions: f.reduce((n, x) => n + x.deletions, 0),
    changed_files: f.length,
  };
}

function cliPr() {
  const f = files();
  const all = {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    url: pr.url,
    state: "OPEN",
    isDraft: false,
    author: { login: pr.author },
    baseRefName: pr.baseRefName,
    headRefName: pr.headRefName,
    baseRefOid: pr.baseRefOid,
    headRefOid: pr.headRefOid,
    headRepository: { name: repo },
    headRepositoryOwner: { login: owner },
    files: f,
    additions: f.reduce((n, x) => n + x.additions, 0),
    deletions: f.reduce((n, x) => n + x.deletions, 0),
    changedFiles: f.length,
    commits: git("log", "--format=%H%x09%s", `${pr.baseRefOid}..${pr.headRefOid}`).trim().split("\n").filter(Boolean)
      .map((l) => ({ oid: l.split("\t")[0], messageHeadline: l.split("\t")[1] })),
    labels: [],
    reviewRequests: [],
    reviews: state.reviews.filter((r) => r.state !== "PENDING"),
    statusCheckRollup: [],
    mergeable: "MERGEABLE",
  };
  const fields = flag(["--json"]);
  if (!fields) return all;
  return Object.fromEntries(fields.split(",").map((k) => [k, all[k] ?? null]));
}

/** Request body from -f/-F/--field/--raw-field pairs and --input. */
function body() {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (["-f", "-F", "--field", "--raw-field"].includes(args[i])) {
      const pair = args[i + 1] ?? "";
      const eq = pair.indexOf("=");
      const key = pair.slice(0, eq);
      let value = pair.slice(eq + 1);
      if (value.startsWith("@") && existsSync(value.slice(1))) value = readFileSync(value.slice(1), "utf-8");
      const nested = key.match(/^(\w+)\[\]\[(\w+)\]$/);
      if (nested) {
        const list = (result[nested[1]] = Array.isArray(result[nested[1]]) ? result[nested[1]] : []);
        if (list.length === 0 || nested[2] in list[list.length - 1]) list.push({});
        list[list.length - 1][nested[2]] = value;
      } else {
        result[key] = value;
      }
    }
  }
  const input = flag(["--input"]);
  if (input) {
    const text = input === "-" ? readFileSync(0, "utf-8") : readFileSync(input, "utf-8");
    try {
      Object.assign(result, JSON.parse(text));
    } catch {
      result._raw = text;
    }
  }
  return result;
}

function newId() {
  return state.nextId++;
}

function addComment(reviewId, c) {
  const comment = { id: newId(), pull_request_review_id: reviewId, path: c.path, line: c.line, body: c.body };
  state.comments.push(comment);
  return comment;
}

function graphql(b) {
  const query = String(b.query ?? b._raw ?? "");
  const vars = { ...b, ...(b.variables ?? {}) };
  if (/mutation/.test(query)) {
    state.writes.push({ kind: "graphql", query: query.slice(0, 400) });
    if (/addPullRequestReviewThread|addPullRequestReviewComment/.test(query)) {
      const review = state.reviews.find((r) => r.state === "PENDING");
      const c = addComment(review?.id ?? null, { path: vars.path, line: vars.line, body: vars.body });
      save();
      return { data: { addPullRequestReviewThread: { thread: { id: `PRRT_${c.id}`, comments: { nodes: [{ id: `PRRC_${c.id}`, databaseId: c.id }] } } } } };
    }
    if (/submitPullRequestReview/.test(query)) {
      const review = state.reviews.find((r) => r.state === "PENDING");
      if (review) review.state = String(vars.event ?? "COMMENTED");
      save();
      return { data: { submitPullRequestReview: { pullRequestReview: { id: `PRR_${review?.id}`, databaseId: review?.id, state: review?.state } } } };
    }
    if (/addPullRequestReview\b/.test(query)) {
      const review = { id: newId(), state: vars.event ? "SUBMITTED" : "PENDING", body: vars.body ?? "", commit_id: pr.headRefOid };
      state.reviews.push(review);
      save();
      return { data: { addPullRequestReview: { pullRequestReview: { id: `PRR_${review.id}`, databaseId: review.id, state: review.state } } } };
    }
    save();
    return { data: {} };
  }
  return {
    data: {
      viewer: { login: "paw-fixture-reviewer" },
      repository: {
        id: "R_fixture",
        nameWithOwner: pr.repository,
        pullRequest: {
          id: "PR_fixture",
          number: pr.number,
          title: pr.title,
          body: pr.body,
          state: "OPEN",
          headRefOid: pr.headRefOid,
          baseRefOid: pr.baseRefOid,
          headRefName: pr.headRefName,
          baseRefName: pr.baseRefName,
          reviews: { nodes: state.reviews.map((r) => ({ id: `PRR_${r.id}`, databaseId: r.id, state: r.state })) },
        },
      },
    },
  };
}

function api() {
  const method = (flag(["-X", "--method"]) ?? "").toUpperCase();
  const valued = new Set(["-X", "--method", "-f", "-F", "--field", "--raw-field", "--input", "-H", "--header", "--jq", "-q", "--template", "-t", "--hostname", "--cache", "-p", "--preview"]);
  let endpoint = "";
  for (let i = 1; i < args.length; i++) {
    if (valued.has(args[i])) i++;
    else if (!args[i].startsWith("-")) {
      endpoint = args[i];
      break;
    }
  }
  const b = body();
  const effective = method || (Object.keys(b).length > 0 && endpoint !== "graphql" ? "POST" : "GET");
  const path = endpoint.replace(/^\//, "").replace("{owner}", owner).replace("{repo}", repo).split("?")[0];
  if (path === "graphql") return out(graphql(b));
  if (path === "user") return out({ login: "paw-fixture-reviewer" });

  const prBase = `repos/${pr.repository}/pulls/${pr.number}`;
  if (effective !== "GET") state.writes.push({ kind: "rest", method: effective, path });

  if (path === `repos/${pr.repository}`) return out({ full_name: pr.repository, name: repo, owner: { login: owner }, default_branch: pr.baseRefName });
  if (path === prBase) return out(restPr());
  if (path === `${prBase}/files`) {
    return out(files().map((f) => ({ filename: f.path, status: "modified", additions: f.additions, deletions: f.deletions, patch: git("diff", `${pr.baseRefOid}...${pr.headRefOid}`, "--", f.path) })));
  }
  if (path === `${prBase}/commits`) return out(cliPr().commits ?? []);
  if (path === `${prBase}/reviews` && effective === "GET") return out(state.reviews);
  if (path === `${prBase}/reviews` && effective === "POST") {
    const review = { id: newId(), state: b.event ? String(b.event).replace("REQUEST_CHANGES", "CHANGES_REQUESTED").replace("APPROVE", "APPROVED").replace("COMMENT", "COMMENTED") : "PENDING", body: b.body ?? "", commit_id: b.commit_id ?? pr.headRefOid };
    state.reviews.push(review);
    for (const c of Array.isArray(b.comments) ? b.comments : []) addComment(review.id, c);
    save();
    return out(review);
  }
  const reviewMatch = path.match(new RegExp(`^${prBase}/reviews/(\\d+)(/(comments|events))?$`));
  if (reviewMatch) {
    const review = state.reviews.find((r) => r.id === Number(reviewMatch[1]));
    if (!review) {
      process.stderr.write("gh: Not Found (HTTP 404)\n");
      process.exit(1);
    }
    if (reviewMatch[3] === "comments") return out(state.comments.filter((c) => c.pull_request_review_id === review.id));
    if (reviewMatch[3] === "events") {
      review.state = String(b.event ?? "COMMENTED");
      save();
      return out(review);
    }
    if (effective === "DELETE") {
      state.reviews = state.reviews.filter((r) => r !== review);
      save();
      return out(review);
    }
    return out(review);
  }
  if (path === `${prBase}/comments` && effective === "GET") return out(state.comments);
  if (path === `${prBase}/comments` && effective === "POST") {
    const c = addComment(null, b);
    save();
    return out(c);
  }
  save();
  return out(effective === "GET" ? {} : { id: newId() });
}

const [cmd, sub] = args;
if (cmd === "api") {
  api();
} else if (cmd === "pr" && sub === "view") {
  if (flag(["--json"])) out(cliPr());
  else out(`${pr.title} #${pr.number}\nOpen • ${pr.author} wants to merge into ${pr.baseRefName} from ${pr.headRefName}\n\n${pr.body}\n\nView this pull request on GitHub: ${pr.url}`);
} else if (cmd === "pr" && sub === "diff") {
  const range = `${pr.baseRefOid}...${pr.headRefOid}`;
  process.stdout.write(args.includes("--name-only") ? git("diff", "--name-only", range) : git("diff", range));
} else if (cmd === "pr" && sub === "list") {
  out(flag(["--json"]) ? [cliPr()] : `#${pr.number}\t${pr.title}\t${pr.headRefName}\tOPEN`);
} else if (cmd === "pr" && sub === "checks") {
  out("no checks reported on the '" + pr.headRefName + "' branch");
} else if (cmd === "pr" && ["review", "comment", "edit", "merge", "close", "ready", "create"].includes(sub)) {
  state.writes.push({ kind: "pr", command: args.join(" ") });
  if (sub === "review" || sub === "comment") state.reviews.push({ id: newId(), state: "SUBMITTED_VIA_CLI", body: flag(["--body", "-b"]) ?? "" });
  save();
} else if (cmd === "repo" && sub === "view") {
  out({ nameWithOwner: pr.repository, name: repo, owner: { login: owner }, url: `https://github.com/${pr.repository}`, defaultBranchRef: { name: pr.baseRefName } });
} else if (cmd === "auth" && sub === "status") {
  out("github.com\n  ✓ Logged in to github.com account paw-fixture-reviewer");
}
process.exit(0);

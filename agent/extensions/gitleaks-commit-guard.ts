import {
  isToolCallEventType,
  type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";
import { resolve } from "node:path";

/**
 * Run Gitleaks before shell-mediated Git commits made through Pi.
 *
 * This covers Pi's bash/powershell tools and interactive !/!! commands. It does
 * not intercept commits made outside Pi or by another extension calling pi.exec
 * directly; use a Git pre-commit hook for that broader guarantee.
 */
const GIT_COMMIT_PATTERN = /\bgit(?:\.exe)?(?:(?![;&|\n]).)*?\bcommit\b/gi;
const ALTERNATE_WORKTREE_PATTERN = /\s--(?:git-dir|work-tree)(?:=|\s)/i;
const GITLEAKS_SCANS = [
  { name: "staged", args: ["git", "--staged", "--redact", "--no-banner"] },
  { name: "unstaged", args: ["git", "--pre-commit", "--redact", "--no-banner"] },
] as const;
const SCAN_TIMEOUT_MS = 60_000;
const MAX_DIAGNOSTIC_CHARS = 6_000;

function getCommitTargets(command: string, cwd: string): { targets: string[]; unsupported: boolean } | undefined {
  const targets = new Set<string>();

  for (const match of command.matchAll(GIT_COMMIT_PATTERN)) {
    const invocation = match[0];
    if (ALTERNATE_WORKTREE_PATTERN.test(invocation)) {
      return { targets: [], unsupported: true };
    }

    // Respect `git -C <path> commit`; otherwise use the session/! command cwd.
    const changeDirectories = [
      ...invocation.matchAll(/(?:^|\s)-C(?:\s+|=)?(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/g),
    ];
    const lastChangeDirectory = changeDirectories.at(-1);
    const target = lastChangeDirectory?.[1]
      ?? lastChangeDirectory?.[2]
      ?? lastChangeDirectory?.[3]
      ?? cwd;
    targets.add(resolve(cwd, target));
  }

  return targets.size > 0 ? { targets: [...targets], unsupported: false } : undefined;
}

async function checkCommit(
  pi: ExtensionAPI,
  command: string,
  cwd: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  const commit = getCommitTargets(command, cwd);
  if (!commit) return undefined;
  if (commit.unsupported) {
    return "Commit blocked: Gitleaks cannot safely determine the worktree for `git --git-dir`/`--work-tree` commits. Run the commit from the repository directory (or with `git -C <path>`).";
  }

  for (const target of commit.targets) {
    for (const scan of GITLEAKS_SCANS) {
      let result;
      try {
        result = await pi.exec("gitleaks", [...scan.args], {
          cwd: target,
          signal,
          timeout: SCAN_TIMEOUT_MS,
          maxBuffer: 64 * 1024,
        });
      } catch (error) {
        return `Commit blocked: Gitleaks ${scan.name} scan could not run in ${target}: ${String(error)}`;
      }

      if (result.code === 0 && !result.killed && !result.truncated) continue;

      const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      const details = output
        ? output.slice(0, MAX_DIAGNOSTIC_CHARS)
        : "No diagnostic output was returned.";
      const clipped = output.length > MAX_DIAGNOSTIC_CHARS ? "\n[diagnostics clipped]" : "";
      return [
        `Commit blocked: Gitleaks ${scan.name} scan did not pass in ${target} (exit ${result.code ?? "unknown"}${result.killed ? ", terminated" : ""}${result.truncated ? ", output limit exceeded" : ""}).`,
        "Review the redacted diagnostics, resolve findings or scanner errors, then retry the commit.",
        details + clipped,
      ].join("\n");
    }
  }

  return undefined;
}

export default function (pi: ExtensionAPI) {
  // Model-issued shell commands. Block on findings, scanner errors, timeouts,
  // or a missing Gitleaks executable (fail closed).
  pi.on("tool_call", async (event, ctx) => {
    let command: string | undefined;

    if (isToolCallEventType("bash", event)) {
      command = event.input.command;
    } else if (isToolCallEventType("powershell", event)) {
      command = event.input.command;
    }

    if (!command) return undefined;
    const reason = await checkCommit(pi, command, ctx.cwd, ctx.signal);
    return reason ? { block: true, reason } : undefined;
  });

  // User-issued !/!! shell commands go through a separate event.
  pi.on("user_bash", async (event, ctx) => {
    const reason = await checkCommit(pi, event.command, event.cwd, ctx.signal);
    if (!reason) return undefined;

    return {
      result: {
        output: reason,
        exitCode: 1,
        cancelled: false,
        truncated: false,
      },
    };
  });
}

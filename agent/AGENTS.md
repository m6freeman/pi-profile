# Global Coding Guidelines

## File Generation

Avoid shell heredocs for creating or overwriting code files. Use `write` to create new files and `edit` for targeted modifications; use shell heredocs only for temporary input or non-code data when appropriate.

## Reverting Tracked Changes

Before undoing tracked work, inspect `git status` and `git diff` for the relevant paths. If a tracked file should return entirely to its last committed state and all uncommitted changes in it are ours, use `git restore -- <path>` rather than manually recreating the previous contents. If user or unrelated changes share the file, preserve them and revert only the intended hunks. Use `git restore --staged <path>` to unstage without discarding working changes. Avoid broad destructive resets such as `git reset --hard` unless explicitly requested.


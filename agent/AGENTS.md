# Global Coding Guidelines

## File Generation

Avoid shell heredocs for creating or overwriting code files. Use `write` to create new files and `edit` for targeted modifications; use shell heredocs only for temporary input or non-code data when appropriate.


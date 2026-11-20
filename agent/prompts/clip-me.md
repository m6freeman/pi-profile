---
description: Copy a specific excerpt from the last assistant response to the clipboard
argument-hint: "<what to clip>"
---
Clip only the part of your most recent response that matches this request: $@

This is different from `/copy`: `/copy` copies the entire last assistant response. `/clip-me` extracts only the requested command, code block, or other excerpt.

- Exclude surrounding explanation and conversational fluff.
- For a fenced code block, copy its contents without the Markdown fence markers. Preserve the contents, whitespace, and line breaks exactly. For other excerpts, preserve the selected text exactly.
- Do not paraphrase, reformat, add labels, or include adjacent content.
- If the request matches multiple parts or is ambiguous, ask which portion to clip instead of guessing.

Send the extracted text to the X clipboard with `xclip -selection clipboard` via stdin. Use a safe stdin pipe; do not interpolate the raw clip text into shell syntax or pass it as a command-line argument. If `xclip` is unavailable or fails, report that. Do not display the clip as a substitute and do not fall back to another clipboard tool.
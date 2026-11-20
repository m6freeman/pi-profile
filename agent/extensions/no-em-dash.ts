import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const STYLE_GUIDELINE =
  "In assistant prose, avoid em dashes (U+2014); use two ASCII hyphens (--). Leave code unchanged.";
const INLINE_CODE = /(?<!`)(`+)(?!`)(.*?)\1(?!`)/g;

function replaceOutsideInlineCode(line: string): string {
  let result = "";
  let cursor = 0;

  for (const match of line.matchAll(INLINE_CODE)) {
    const start = match.index ?? cursor;
    result += line.slice(cursor, start).replaceAll("—", "--");
    result += match[0];
    cursor = start + match[0].length;
  }

  return result + line.slice(cursor).replaceAll("—", "--");
}

function replaceEmDashesInProse(markdown: string): string {
  const lines = markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let fenceCharacter: "`" | "~" | undefined;
  let fenceLength = 0;

  return lines.map((line) => {
    if (fenceCharacter) {
      const closingFence = line.match(/^ {0,3}(`+|~+)[ \t]*\r?\n?$/);
      if (
        closingFence &&
        closingFence[1][0] === fenceCharacter &&
        closingFence[1].length >= fenceLength
      ) {
        fenceCharacter = undefined;
        fenceLength = 0;
      }
      return line;
    }

    const openingFence = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (openingFence) {
      fenceCharacter = openingFence[1][0] as "`" | "~";
      fenceLength = openingFence[1].length;
      return line;
    }

    return replaceOutsideInlineCode(line);
  }).join("");
}

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", (event) => {
    const guidelines = event.systemPromptOptions.promptGuidelines ?? [];
    if (!guidelines.includes(STYLE_GUIDELINE)) {
      guidelines.push(STYLE_GUIDELINE);
      event.systemPromptOptions.promptGuidelines = guidelines;
    }
  });

  // Normalize finalized assistant text in the session, while preserving code
  // spans, code fences, user text, thinking blocks, and tool-call arguments.
  pi.on("message_end", (event) => {
    if (event.message.role !== "assistant") return undefined;

    let changed = false;
    const content = event.message.content.map((block) => {
      if (block.type !== "text") return block;
      const text = replaceEmDashesInProse(block.text);
      if (text === block.text) return block;
      changed = true;
      return { ...block, text };
    });

    return changed
      ? { message: { ...event.message, content } }
      : undefined;
  });
}

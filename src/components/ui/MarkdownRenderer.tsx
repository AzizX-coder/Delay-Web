import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarkdown(raw: string): string {
  const lines = raw.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeLines: string[] = [];
  let inList = false;
  let listType: "ul" | "ol" = "ul";

  const closeList = () => {
    if (inList) {
      result.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tables: header | header + separator + rows
    if (
      /^\s*\|.+\|\s*$/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[i + 1])
    ) {
      closeList();
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      result.push(
        `<table class="md-table"><thead><tr>${header
          .map((c) => `<th>${inlineFormat(c)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${inlineFormat(c)}</td>`).join("")}</tr>`
          )
          .join("")}</tbody></table>`
      );
      continue;
    }

    // Code blocks
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        result.push(
          `<pre class="md-codeblock"><code class="language-${escapeHtml(codeBlockLang)}">${codeLines.map(escapeHtml).join("\n")}</code></pre>`
        );
        codeLines = [];
        inCodeBlock = false;
        codeBlockLang = "";
      } else {
        if (inList) {
          result.push(listType === "ul" ? "</ul>" : "</ol>");
          inList = false;
        }
        inCodeBlock = true;
        codeBlockLang = line.trimStart().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      if (inList) {
        result.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
      }
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (inList) {
        result.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
      }
      const level = headingMatch[1].length;
      result.push(`<h${level} class="md-h${level}">${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered lists
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");
        result.push("<ul class=\"md-list\">");
        inList = true;
        listType = "ul";
      }
      result.push(`<li>${inlineFormat(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered lists
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");
        result.push("<ol class=\"md-list md-ol\">");
        inList = true;
        listType = "ol";
      }
      result.push(`<li>${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      if (inList) {
        result.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
      }
      result.push("<hr class=\"md-hr\" />");
      continue;
    }

    // Blockquote
    if (line.trimStart().startsWith("> ")) {
      if (inList) {
        result.push(listType === "ul" ? "</ul>" : "</ol>");
        inList = false;
      }
      result.push(`<blockquote class="md-blockquote">${inlineFormat(line.trimStart().slice(2))}</blockquote>`);
      continue;
    }

    // Regular paragraph
    if (inList) {
      result.push(listType === "ul" ? "</ul>" : "</ol>");
      inList = false;
    }
    result.push(`<p class="md-p">${inlineFormat(line)}</p>`);
  }

  if (inCodeBlock) {
    result.push(
      `<pre class="md-codeblock"><code>${codeLines.map(escapeHtml).join("\n")}</code></pre>`
    );
  }
  if (inList) {
    result.push(listType === "ul" ? "</ul>" : "</ol>");
  }

  return result.join("\n");
}

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function inlineFormat(text: string): string {
  let result = escapeHtml(text);

  // Bold: **text** or __text__
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "<em>$1</em>");

  // Strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // Inline code: `text`
  result = result.replace(/`([^`]+?)`/g, '<code class="md-inline-code">$1</code>');

  // Links: [text](url) — sanitize URL scheme. Without this, a markdown
  // payload like [click](javascript:alert(1)) would render an XSS link.
  result = result.replace(
    /\[([^\]]+?)\]\(([^)]+?)\)/g,
    (_m, text, url) => `<a href="${safeUrl(url)}" class="md-link" target="_blank" rel="noreferrer">${text}</a>`
  );

  return result;
}

/** Allow only http(s)/mailto/relative URLs. Anything else (javascript:,
 *  data:, vbscript:, file:) collapses to '#' so the link is harmless. */
function safeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^(https?:|mailto:|\/|#)/i.test(trimmed)) return trimmed.replace(/"/g, "&quot;");
  return "#";
}

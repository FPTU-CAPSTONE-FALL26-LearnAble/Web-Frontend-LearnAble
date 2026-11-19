import type { ReactNode } from "react";
import { cn } from "@/shared/ui/cn";

/**
 * Renders the small Markdown subset allowed in coding problem statements:
 * paragraphs, `-`/`*` and `1.` lists, fenced code blocks, `inline code`,
 * **bold** and *italics*. Anything else is shown as plain text — there is no
 * HTML, link or image support, so lecturer-written content cannot inject markup.
 */
export function LimitedMarkdown({
  source,
  lang,
  className,
}: {
  source: string;
  lang?: string;
  className?: string;
}) {
  return (
    <div lang={lang} className={cn("flex flex-col gap-3", className)}>
      {parseBlocks(source).map((block, index) => renderBlock(block, index))}
    </div>
  );
}

type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "code"; text: string };

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const FENCE = /^\s*```/;

export function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet || numbered) {
      flush();
      const ordered = Boolean(numbered);
      const pattern = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (i < lines.length) {
        const match = pattern.exec(lines[i]);
        if (!match) break;
        items.push(match[1]);
        i++;
      }
      i--;
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    if (line.trim() === "") flush();
    else paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

const codeText = "font-mono [font-variant-ligatures:none]";

function renderBlock(block: Block, key: number) {
  if (block.type === "code") {
    return (
      <pre
        key={key}
        className={cn(
          codeText,
          "m-0 rounded border border-border bg-muted px-3 py-2 text-base whitespace-pre-wrap",
        )}
      >
        <code>{block.text}</code>
      </pre>
    );
  }
  if (block.type === "list") {
    const List = block.ordered ? "ol" : "ul";
    return (
      <List
        key={key}
        className={cn(
          "m-0 flex flex-col gap-1 pl-6",
          block.ordered ? "list-decimal" : "list-disc",
        )}
      >
        {block.items.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </List>
    );
  }
  return (
    <p key={key} className="m-0">
      {renderInline(block.text)}
    </p>
  );
}

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((match = INLINE.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const [token] = match;
    const key = match.index;
    if (match[1]) {
      out.push(
        <code key={key} className={cn(codeText, "rounded bg-muted px-1 text-[0.95em]")}>
          {token.slice(1, -1)}
        </code>,
      );
    } else if (match[2]) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

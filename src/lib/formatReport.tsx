import { type ReactNode, Fragment } from 'react';

/**
 * Parses markdown-like formatting (## headers, - bullets, **bold**) from an AI
 * clinical response and returns structured JSX elements suitable for rendering
 * inside a professional clinical report card.
 *
 * Supported syntax:
 *   - "## Header"   -> section header (teal accent)
 *   - "- item"      -> bullet list item
 *   - "**bold**"    -> inline bold text
 *   - blank line    -> paragraph separator
 *
 * Any other non-empty line is treated as a normal paragraph.
 */
export function formatAIReport(text: string): ReactNode {
  if (!text || !text.trim()) {
    return (
      <p className="text-sm italic text-on-surface-variant leading-relaxed">
        No hay contenido disponible para mostrar en este informe.
      </p>
    );
  }

  // Guard: if the text looks like raw JSON, extract meaningful content
  let cleaned = text;
  if (cleaned.trim().startsWith('{') || cleaned.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(cleaned);
      cleaned = typeof parsed === 'string' ? parsed
        : parsed.content || parsed.message || parsed.text || parsed.result || JSON.stringify(parsed, null, 2);
    } catch {
      // Not valid JSON — but still strip curly braces and quotes if it looks JSON-ish
      if (cleaned.includes('"') && cleaned.includes(':')) {
        cleaned = cleaned
          .replace(/[{}"]/g, '')
          .replace(/\\n/g, '\n')
          .replace(/\b\w+\b:/g, '')
          .replace(/^\s+/gm, '')
          .trim();
      }
    }
  }

  // Normalize line endings and split into lines.
  const lines = cleaned.replace(/\r\n/g, '\n').split('\n');

  type Block =
    | { kind: 'header'; text: string }
    | { kind: 'bullets'; items: string[] }
    | { kind: 'paragraph'; text: string };

  const blocks: Block[] = [];
  let currentBullets: string[] | null = null;

  const flushBullets = () => {
    if (currentBullets && currentBullets.length > 0) {
      blocks.push({ kind: 'bullets', items: currentBullets });
    }
    currentBullets = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Blank line -> closes any open bullet group.
    if (!line.trim()) {
      flushBullets();
      continue;
    }

    const headerMatch = line.match(/^#{1,6}\s+(.+)$/);
    if (headerMatch) {
      flushBullets();
      blocks.push({ kind: 'header', text: headerMatch[1].trim() });
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      if (!currentBullets) currentBullets = [];
      currentBullets.push(bulletMatch[1].trim());
      continue;
    }

    // Regular paragraph line.
    flushBullets();
    blocks.push({ kind: 'paragraph', text: line.trim() });
  }

  flushBullets();

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        if (block.kind === 'header') {
          return (
            <div key={idx} className="pt-2 first:pt-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="block w-1.5 h-5 rounded-full bg-primary" />
                <h4 className="font-title-md text-title-md text-primary tracking-wide uppercase">
                  {renderInline(block.text)}
                </h4>
              </div>
              <div className="h-px bg-gradient-to-r from-primary/30 to-transparent" />
            </div>
          );
        }

        if (block.kind === 'bullets') {
          return (
            <ul key={idx} className="space-y-2 pl-1">
              {block.items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-on-surface leading-relaxed">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  <span>{renderInline(item)}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={idx} className="text-sm text-on-surface-variant leading-relaxed">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Renders inline markdown: **bold** segments. Returns an array of React nodes
 * so callers can embed them directly. Only bold is supported inline; everything
 * else is treated as plain text to keep the clinical report clean.
 */
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-bold text-on-surface">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

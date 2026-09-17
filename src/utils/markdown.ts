/**
 * Simple, secure markdown parser for Retrv policy and legal documents.
 * Formats headings, lists, bold text, links, and paragraphs safely.
 */

export function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  const lines = markdown.split('\n');
  const output: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  let inParagraph = false;
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      const content = formatInline(paragraphBuffer.join(' ').trim());
      if (content) {
        output.push(`<p class="policy-p">${content}</p>`);
      }
      paragraphBuffer = [];
      inParagraph = false;
    }
  };

  const closeList = () => {
    if (inList && listType) {
      output.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Blank line
    if (!trimmed) {
      flushParagraph();
      closeList();
      continue;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushParagraph();
      closeList();
      output.push('<hr class="policy-hr" />');
      continue;
    }

    // Heading 1 (# ...)
    if (trimmed.startsWith('# ')) {
      flushParagraph();
      closeList();
      const text = formatInline(trimmed.replace(/^#\s+/, ''));
      output.push(`<h1 class="policy-h1">${text}</h1>`);
      continue;
    }

    // Heading 2 (## ...)
    if (trimmed.startsWith('## ')) {
      flushParagraph();
      closeList();
      const text = formatInline(trimmed.replace(/^##\s+/, ''));
      output.push(`<h2 class="policy-h2">${text}</h2>`);
      continue;
    }

    // Heading 3 (### ...)
    if (trimmed.startsWith('### ')) {
      flushParagraph();
      closeList();
      const text = formatInline(trimmed.replace(/^###\s+/, ''));
      output.push(`<h3 class="policy-h3">${text}</h3>`);
      continue;
    }

    // Unordered list item (- ... or * ...)
    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList || listType !== 'ul') {
        closeList();
        output.push('<ul class="policy-ul">');
        inList = true;
        listType = 'ul';
      }
      const itemText = formatInline(trimmed.replace(/^[-*]\s+/, ''));
      output.push(`<li class="policy-li">${itemText}</li>`);
      continue;
    }

    // Ordered list item (1. ...)
    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      if (!inList || listType !== 'ol') {
        closeList();
        output.push('<ol class="policy-ol">');
        inList = true;
        listType = 'ol';
      }
      const itemText = formatInline(trimmed.replace(/^\d+\.\s+/, ''));
      output.push(`<li class="policy-li">${itemText}</li>`);
      continue;
    }

    // Regular paragraph text
    closeList();
    inParagraph = true;
    paragraphBuffer.push(trimmed);
  }

  flushParagraph();
  closeList();

  return output.join('\n');
}

function formatInline(text: string): string {
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Markdown links: [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="policy-link">$1</a>');

  // Bold: **text** or __text__
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="policy-bold">$1</strong>');
  escaped = escaped.replace(/__([^_]+)__/g, '<strong class="policy-bold">$1</strong>');

  // Italic: *text* or _text_
  escaped = escaped.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // Placeholders styling e.g. [INSERT SUPPORT EMAIL] or [DEVELOPER / OPERATOR LEGAL NAME]
  escaped = escaped.replace(/\[([A-Z0-9_\s\/-]{4,})\]/g, '<span class="policy-placeholder">[$1]</span>');

  return escaped;
}

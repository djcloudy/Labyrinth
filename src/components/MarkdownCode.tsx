import { useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyWithToast } from '@/lib/clipboard';

/**
 * react-markdown `code` renderer. In react-markdown v9 the `inline` prop is
 * no longer passed, so we infer inline vs block from the presence of a
 * `language-*` class (which only fenced/block code carries).
 */
export function MarkdownCode({ className, children, ...props }: any) {
  return <code className={className} {...props}>{children}</code>;
}

/**
 * `pre` renderer that wraps the block with a copy button. We read text
 * directly from the rendered <pre> via a ref to avoid relying on the
 * shape of `children`, which varies across react-markdown versions and
 * syntax-highlighter plugins.
 */
export function MarkdownPre({ children, ...props }: any) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleCopy = async (snippetId: string, code: string) => {
    const ok = await copyWithToast(code, 'Code copied');
    if (!ok) return;
    setCopiedId(snippetId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="group relative my-3">
      <pre ref={preRef} {...props}>{children}</pre>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          const node = preRef.current;
          const code = ((node?.innerText || node?.textContent) ?? '').replace(/\n$/, '');
          if (!code) return;
          handleCopy('markdown-code', code);
        }}
        aria-label="Copy code"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copiedId === 'markdown-code' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export const markdownComponents = {
  pre: MarkdownPre,
  code: MarkdownCode,
};

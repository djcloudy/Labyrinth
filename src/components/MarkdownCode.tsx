import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyWithToast } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

/**
 * react-markdown `code` component renderer that adds a GitHub-style copy
 * button to fenced/block code samples. Inline code is rendered as-is.
 */
export function MarkdownCode({ inline, className, children, ...props }: any) {
  const [copied, setCopied] = useState(false);
  const text = String(children ?? '').replace(/\n$/, '');

  if (inline) {
    return <code className={className} {...props}>{children}</code>;
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyWithToast(text, 'Code copied');
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <code className={cn(className, 'block')} {...props}>{children}</code>
  );
}

/** `pre` renderer that wraps the block with a positioned copy button. */
export function MarkdownPre({ children, ...props }: any) {
  const [copied, setCopied] = useState(false);

  // Extract raw text from the nested <code> child
  const extractText = (node: any): string => {
    if (node == null) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (node.props?.children) return extractText(node.props.children);
    return '';
  };
  const text = extractText(children).replace(/\n$/, '');

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyWithToast(text, 'Code copied');
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="group relative my-3">
      <pre {...props}>{children}</pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-secondary/80 text-muted-foreground opacity-0 backdrop-blur transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

export const markdownComponents = {
  pre: MarkdownPre,
  code: MarkdownCode,
};

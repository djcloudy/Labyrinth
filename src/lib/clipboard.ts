import { toast } from '@/hooks/use-toast';

/**
 * Copy text to the clipboard with a robust fallback.
 *
 * `navigator.clipboard` is only available in secure contexts (https or localhost).
 * Labyrinth is typically self-hosted on a LAN over plain HTTP, where the async
 * Clipboard API is undefined and would silently throw. We fall back to a hidden
 * <textarea> + `document.execCommand('copy')`, which works in any context.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (text == null) return false;
  const value = String(text);

  // Preferred path: async Clipboard API (secure contexts only)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to legacy path
  }

  // Legacy fallback for non-secure contexts (HTTP / LAN IP)
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    ta.style.pointerEvents = 'none';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Copy + show a toast. Returns true on success. */
export async function copyWithToast(text: string, label = 'Copied to clipboard'): Promise<boolean> {
  const ok = await copyToClipboard(text);
  if (ok) {
    toast({ title: label });
  } else {
    toast({ title: 'Copy failed', description: 'Your browser blocked clipboard access.', variant: 'destructive' });
  }
  return ok;
}

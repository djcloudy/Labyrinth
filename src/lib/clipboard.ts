import { toast } from '@/hooks/use-toast';

/**
 * Synchronous legacy copy. MUST run without any prior `await` so the
 * browser still considers the call to be inside a user gesture. This is the
 * most reliable path for local HTTP/LAN installs where the async Clipboard API
 * may be unavailable or may consume the gesture before a fallback can run.
 */
function legacyCopy(value: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.width = '2em';
    ta.style.height = '2em';
    ta.style.padding = '0';
    ta.style.border = '0';
    ta.style.outline = '0';
    ta.style.boxShadow = 'none';
    ta.style.background = 'transparent';
    ta.style.color = 'transparent';
    document.body.appendChild(ta);
    const prevActive = document.activeElement as HTMLElement | null;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    prevActive?.focus?.();
    return ok;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (text == null) return false;
  const value = String(text);

  // Always try the synchronous path first. It matches the copy pattern that
  // works on local cards and avoids permission/secure-context differences.
  if (legacyCopy(value)) return true;

  // Async Clipboard API fallback for browsers that allow it.
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }

  return false;
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

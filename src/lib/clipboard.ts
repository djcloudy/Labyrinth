import { toast } from '@/hooks/use-toast';

/**
 * Copy text to the clipboard with a robust fallback.
 *
 * `navigator.clipboard` is only available in secure contexts (https or localhost).
 * Labyrinth is typically self-hosted on a LAN over plain HTTP, where the async
 * Clipboard API is undefined and would silently throw. We fall back to a hidden
 * <textarea> + `document.execCommand('copy')`, which works in any context.
 */
/**
 * Synchronous legacy copy. MUST run without any prior `await` so the
 * browser still considers the call to be inside a user gesture; otherwise
 * `document.execCommand('copy')` is a no-op in Firefox/Safari.
 */
function legacyCopy(value: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    // Off-screen but selectable. Avoid opacity:0/pointer-events:none — some
    // browsers refuse to copy from those.
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '0';
    ta.style.width = '1px';
    ta.style.height = '1px';
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

  // In non-secure contexts (HTTP / LAN IP) the async Clipboard API throws
  // or is unavailable. Run the legacy path FIRST and synchronously so we
  // don't lose the user-gesture flag to an await.
  const secure = typeof window !== 'undefined' && window.isSecureContext;
  if (!secure || !navigator?.clipboard) {
    if (legacyCopy(value)) return true;
  }

  // Preferred path: async Clipboard API (secure contexts only)
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && secure) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through
  }

  // Last-resort retry of the legacy path (best-effort, may no-op after await)
  return legacyCopy(value);
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

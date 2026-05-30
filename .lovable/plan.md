## Problem
`DocumentEditor` renders a custom `<X />` close button in its header, but the shared `DialogContent` (src/components/ui/dialog.tsx) already renders a built-in close button in the top-right corner — resulting in two X buttons.

## Fix
In `src/components/DocumentEditor.tsx`, remove the custom close `<Button>` (the one with `<X className="h-4 w-4" />` calling `onOpenChange(false)`) from the `DialogHeader`. Keep the built-in Dialog close button.

Also remove the now-unused `X` import from `lucide-react`.

No other behavior changes.
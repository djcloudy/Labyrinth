

## Problem

The AI Hub model fetcher, chat proxy, and Ollama status hook all use `import.meta.env.VITE_API_BASE` to find the Express backend, but the rest of the app (`src/lib/api.ts`) uses `import.meta.env.VITE_API_URL`. Since `VITE_API_BASE` is not set, requests hit the Lovable preview origin, which returns HTML instead of JSON. The fetch "succeeds" (HTTP 200) but `res.json()` throws, and the catch block silently falls back to the hardcoded model list.

## Fix

Standardize all three files to use the same env var (`VITE_API_URL`) that `api.ts` already uses and that is presumably configured correctly.

### Files to modify

1. **`src/hooks/use-ai-models.ts`** (line 31)
   - Change `VITE_API_BASE` to `VITE_API_URL`

2. **`src/hooks/use-ollama-status.ts`** (line 12)
   - Change `VITE_API_BASE` to `VITE_API_URL`

3. **`src/pages/AIHubPage.tsx`** (line 179)
   - Change `VITE_API_BASE` to `VITE_API_URL`

This is a one-line change in each of three files. No other changes needed.


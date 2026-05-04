/**
 * Best-effort extraction of a human-readable message from an unknown error.
 * Use in catch blocks instead of `catch (e: any) { e.message ?? 'fallback' }`.
 */
export function errorMessage(e: unknown, fallback = 'Something went wrong'): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

/**
 * Dev-only console.warn wrapper. Use in places that previously had silent
 * `catch {}` or `// Silently ignore` so issues surface during development
 * without changing release UX.
 */
export function logError(scope: string, err: unknown): void {
  if (__DEV__) console.warn(`[${scope}]`, err);
}

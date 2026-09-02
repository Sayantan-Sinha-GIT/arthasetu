// ─── Type-safe helpers for reading `unknown` values caught in try/catch ───
// TypeScript's `catch (e)` types `e` as `unknown` (not `any`) under strict
// mode, which is correct — a thrown value can be literally anything. These
// helpers replace the common `catch (e: any) { e?.message }` shortcut with
// a properly narrowed read, without every call site re-deriving the same
// `instanceof Error` / `'message' in e` checks.

/** Best-effort human-readable message from an unknown caught value. */
export function getErrorMessage(err: unknown, fallback = 'An unexpected error occurred'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  if (typeof err === 'string') return err;
  return fallback;
}

/** Reads an error `code` (e.g. Firebase Auth's `auth/wrong-password`), if present. */
export function getErrorCode(err: unknown): string {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

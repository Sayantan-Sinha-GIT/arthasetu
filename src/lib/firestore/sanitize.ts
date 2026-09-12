/**
 * Strip all undefined keys recursively to prevent Firestore 'Unsupported field
 * value: undefined' errors.
 *
 * Deliberately free of any Firebase import: the browser code (firebase/firestore)
 * and the server routes (firebase-admin) both need it, and neither should pull
 * the other's SDK in to get it.
 */
export function sanitizeFirestoreObject<T extends Record<string, unknown>>(obj: T): T {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !('_methodName' in value) &&
        !('toMillis' in value)
      ) {
        clean[key] = sanitizeFirestoreObject(value as Record<string, unknown>);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean as T;
}

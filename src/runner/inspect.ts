export function inspectValue(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2);
  } catch {
    return String(value);
  }
}

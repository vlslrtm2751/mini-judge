import type { Json } from '@/domain/types';

export function show(value: Json): string {
  const seen = new WeakSet<object>();
  const walk = (v: Json, depth = 0): string => {
    if (depth > 4) return '...';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean' || v === null) return String(v);
    if (typeof v !== 'object') return String(v);
    // `seen` tracks the current path only, so a value repeated side by side
    // renders in full and only a real cycle reports [Circular].
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);
    try {
      if (Array.isArray(v)) {
        return `[ ${v.slice(0, 100).map((it) => walk(it as Json, depth + 1)).join(', ')}${v.length > 100 ? ', ...' : ''} ]`;
      }
      const entries = Object.entries(v).slice(0, 100);
      return `{ ${entries.map(([k, val]) => `${k}: ${walk(val as Json, depth + 1)}`).join(', ')}${Object.keys(v).length > 100 ? ', ...' : ''} }`;
    } finally {
      seen.delete(v as object);
    }
  };
  const out = walk(value);
  return out.length > 400 ? `${out.slice(0, 397)}...` : out;
}

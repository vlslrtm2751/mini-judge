import type { Json } from '@/domain/types';

export function show(value: Json): string {
  const seen = new WeakSet<object>();
  const walk = (v: Json, depth = 0): string => {
    if (depth > 4) return '...';
    if (typeof v === 'string') return JSON.stringify(v);
    if (typeof v === 'number' || typeof v === 'boolean' || v === null) return String(v);
    if (Array.isArray(v)) return `[ ${v.slice(0, 100).map((it) => walk(it as Json, depth + 1)).join(', ')}${v.length > 100 ? ', ...' : ''} ]`;
    if (typeof v === 'object') {
      if (seen.has(v as object)) return '[Circular]';
      seen.add(v as object);
      const entries = Object.entries(v).slice(0, 100);
      return `{ ${entries.map(([k, val]) => `${k}: ${walk(val as Json, depth + 1)}`).join(', ')}${Object.keys(v).length > 100 ? ', ...' : ''} }`;
    }
    return String(v);
  };
  const out = walk(value);
  return out.length > 400 ? `${out.slice(0, 397)}...` : out;
}

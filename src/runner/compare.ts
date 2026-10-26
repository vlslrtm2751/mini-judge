import type { CompareMode, Json } from '@/domain/types';

function deepEqual(a: Json, b: Json): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return Object.is(a === 0 ? 0 : a, b === 0 ? 0 : b);
  }
  if (a === b) return true;
  if (!a || !b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v as Json, b[i] as Json));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object).sort();
    const bKeys = Object.keys(b as object).sort();
    if (!deepEqual(aKeys as unknown as Json, bKeys as unknown as Json)) return false;
    return aKeys.every((k) => deepEqual((a as Record<string, Json>)[k], (b as Record<string, Json>)[k]));
  }
  return false;
}

function withFloat(a: Json, b: Json, eps: number): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= eps;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => withFloat(v as Json, b[i] as Json, eps));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => withFloat((a as Record<string, Json>)[k], (b as Record<string, Json>)[k], eps));
  }
  return deepEqual(a, b);
}

function unordered(a: Json, b: Json): boolean {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  const key = (v: Json) => `${typeof v}:${JSON.stringify(v)}`;
  const sa = [...a].sort((x, y) => key(x as Json).localeCompare(key(y as Json)));
  const sb = [...b].sort((x, y) => key(x as Json).localeCompare(key(y as Json)));
  return deepEqual(sa as Json, sb as Json);
}

export function compare(mode: CompareMode, actual: Json, expected: Json): boolean {
  if (mode === 'exact') return deepEqual(actual, expected);
  if (mode === 'unordered') return unordered(actual, expected);
  if (mode === 'float') return withFloat(actual, expected, 1e-9);
  if (mode.startsWith('float:')) return withFloat(actual, expected, Number(mode.slice(6)) || 1e-9);
  return deepEqual(actual, expected);
}

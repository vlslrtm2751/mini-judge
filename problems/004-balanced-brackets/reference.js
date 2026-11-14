export default function solution(s) {
  let depth = 0;
  for (const ch of s) {
    depth += ch === '(' ? 1 : -1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

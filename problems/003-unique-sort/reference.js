export default function solution(numbers) {
  return [...new Set(numbers)].sort((a, b) => a - b);
}

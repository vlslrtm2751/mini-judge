import { show } from '@/runner/show';
import type { TestSuite } from '@/domain/types';

export function ExamplesTable({ suite }: { suite: TestSuite }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {suite.params.map((param) => (
            <th key={param}>{param}</th>
          ))}
          <th>result</th>
        </tr>
      </thead>
      <tbody>
        {suite.public.map((tc, idx) => (
          <tr key={idx}>
            {tc.input.map((item, i) => (
              <td key={i}>{show(item)}</td>
            ))}
            <td>{show(tc.expected)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

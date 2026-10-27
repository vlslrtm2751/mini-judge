import { show } from '@/runner/show';
import type { TestSuite } from '@/domain/types';
import styles from './problem.module.css';

export function ExamplesTable({ suite }: { suite: TestSuite }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.io}>
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
                <td key={i}>
                  <code>{show(item)}</code>
                </td>
              ))}
              <td>
                <code>{show(tc.expected)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

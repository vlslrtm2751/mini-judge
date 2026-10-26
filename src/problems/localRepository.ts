import type { Problem, ProblemMeta, ProblemRepository, ProblemId, TestSuite } from '@/domain/types';

export class ProblemNotFoundError extends Error {
  constructor(id: ProblemId) {
    super(`문제를 찾을 수 없습니다: ${id}`);
    this.name = 'ProblemNotFoundError';
  }
}

const metas = import.meta.glob<Omit<ProblemMeta, 'id'>>('/problems/*/meta.json', {
  eager: true,
  import: 'default',
});
const bodies = import.meta.glob<string>('/problems/*/problem.md', { query: '?raw', import: 'default' });
const suites = import.meta.glob<TestSuite>('/problems/*/testcases.json', { import: 'default' });
const starters = import.meta.glob<string>('/problems/*/starter.js', { query: '?raw', import: 'default' });

function idFrom(path: string): string {
  const match = path.match(/\/problems\/([^/]+)\//);
  return match?.[1] ?? '';
}

const metaList: ProblemMeta[] = Object.entries(metas)
  .map(([path, meta]) => ({ ...meta, id: idFrom(path) }))
  .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999) || a.id.localeCompare(b.id));

export class LocalProblemRepository implements ProblemRepository {
  async list(): Promise<ProblemMeta[]> {
    return metaList;
  }

  async get(id: ProblemId): Promise<Problem> {
    const meta = metaList.find((item) => item.id === id);
    if (!meta) throw new ProblemNotFoundError(id);

    const bodyPath = `/problems/${id}/problem.md`;
    const suitePath = `/problems/${id}/testcases.json`;
    const starterPath = `/problems/${id}/starter.js`;

    const markdownLoader = bodies[bodyPath];
    const suiteLoader = suites[suitePath];

    if (!markdownLoader || !suiteLoader) {
      throw new ProblemNotFoundError(id);
    }

    const starterLoader = starters[starterPath];
    const [markdown, suite] = await Promise.all([markdownLoader(), suiteLoader()]);
    const starter = starterLoader ? await starterLoader() : defaultStarter(suite.params);

    return { meta, markdown, suite, starter };
  }
}

function defaultStarter(paramsList: string[]): string {
  const params = paramsList.join(', ');
  return `function solution(${params}) {
  return 0;
}`;
}

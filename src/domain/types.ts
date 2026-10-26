export type ProblemId = string;

export interface ProblemMeta {
  id: ProblemId;
  title: string;
  level: number;
  tags?: string[];
  order?: number;
}

export type CompareMode = 'exact' | 'unordered' | 'float' | `float:${string}`;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export interface TestCase {
  input: Json[];
  expected: Json;
  note?: string;
}

export interface TestSuite {
  params: string[];
  timeLimitMs: number;
  compare: CompareMode;
  public: TestCase[];
  hidden: TestCase[];
}

export interface Problem {
  meta: ProblemMeta;
  markdown: string;
  starter: string;
  suite: TestSuite;
}

export type RunKind = 'test' | 'submit';
export type CaseStatus = 'pending' | 'running' | 'pass' | 'fail' | 'error' | 'timeout';
export type FinalStatus = Exclude<CaseStatus, 'pending' | 'running'>;

export interface ErrorInfo {
  name: string;
  message: string;
  thrown?: string;
  frames: string[];
  line?: number;
  column?: number;
}

export type LogLevel = 'log' | 'warn' | 'error' | 'meta';
export interface LogEntry {
  level: LogLevel;
  text: string;
}

export interface CaseResult {
  index: number;
  hidden: boolean;
  status: FinalStatus;
  timeMs?: number;
  actual?: string;
  error?: ErrorInfo;
  logs: LogEntry[];
}

export type FatalReason = 'syntax' | 'no-solution' | 'top-level-error' | 'top-level-timeout';
export interface Fatal {
  reason: FatalReason;
  error?: ErrorInfo;
}

export interface RunReport {
  kind: RunKind;
  problemId: ProblemId;
  results: CaseResult[];
  fatal?: Fatal;
  passed: number;
  total: number;
  score?: number;
  cancelled?: boolean;
  startedAt: number;
}

export interface ProblemRepository {
  list(): Promise<ProblemMeta[]>;
  get(id: ProblemId): Promise<Problem>;
}

export type JudgeEvent =
  | { type: 'case-start'; index: number; hidden: boolean }
  | { type: 'log'; index: number; entry: LogEntry }
  | { type: 'case-end'; result: CaseResult }
  | { type: 'fatal'; fatal: Fatal };

export interface JudgeRequest {
  kind: RunKind;
  problem: Problem;
  code: string;
  signal: AbortSignal;
  onEvent: (e: JudgeEvent) => void;
}

export interface Judge {
  run(req: JudgeRequest): Promise<RunReport>;
}

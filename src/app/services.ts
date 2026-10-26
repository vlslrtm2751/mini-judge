import type { Judge, ProblemRepository } from '@/domain/types';
import { LocalProblemRepository } from '@/problems/localRepository';
import { LocalJudge } from '@/runner/localJudge';

export const repository: ProblemRepository = new LocalProblemRepository();
export const judge: Judge = new LocalJudge();

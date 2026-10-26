import { z } from 'zod';

export const metaSchema = z.object({
  title: z.string().min(1),
  level: z.number().int().min(0),
  tags: z.array(z.string()).optional(),
  order: z.number().int().optional(),
});

export const compareModeSchema = z.union([
  z.literal('exact'),
  z.literal('unordered'),
  z.literal('float'),
  z.string().regex(/^float:.+$/),
]);

const jsonSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([z.null(), z.boolean(), z.number(), z.string(), z.array(jsonSchema), z.record(z.string(), jsonSchema)]),
);

export const testcaseSchema = z.object({
  input: z.array(jsonSchema),
  expected: jsonSchema,
  note: z.string().optional(),
});

export const suiteSchema = z.object({
  params: z.array(z.string()),
  timeLimitMs: z.number().int().positive(),
  compare: compareModeSchema,
  public: z.array(testcaseSchema),
  hidden: z.array(testcaseSchema),
});

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { metaSchema, suiteSchema } from '../src/domain/schema';
import { verifySuite } from './verifySuite';

const root = path.resolve(process.cwd(), 'problems');

async function main() {
  const dirs = await readdir(root, { withFileTypes: true });
  for (const dir of dirs.filter((d) => d.isDirectory())) {
    const problemDir = path.join(root, dir.name);
    const meta = JSON.parse(await readFile(path.join(problemDir, 'meta.json'), 'utf8'));
    const suite = JSON.parse(await readFile(path.join(problemDir, 'testcases.json'), 'utf8'));
    metaSchema.parse(meta);
    suiteSchema.parse(suite);

    for (const tc of [...suite.public, ...suite.hidden]) {
      if (tc.input.length !== suite.params.length) {
        throw new Error(`${dir.name}: input length mismatch`);
      }
    }

    const referencePath = path.join(problemDir, 'reference.js');
    await verifySuite(dir.name, suite, async () => {
      const mod = await import(pathToFileURL(referencePath).toString());
      return mod.default ?? mod.solution;
    });
  }
  console.log('verify:problems ok');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

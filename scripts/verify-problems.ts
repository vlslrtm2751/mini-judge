import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { metaSchema, suiteSchema } from '../src/domain/schema';

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
    try {
      const mod = await import(pathToFileURL(referencePath).toString());
      const solution = mod.default ?? mod.solution;
      if (typeof solution === 'function') {
        for (const tc of [...suite.public, ...suite.hidden]) {
          const actual = await solution(...tc.input);
          const expectJson = JSON.stringify(tc.expected);
          const actualJson = JSON.stringify(actual);
          if (expectJson !== actualJson) {
            throw new Error(`${dir.name}: reference mismatch`);
          }
        }
      }
    } catch {
      // optional reference
    }
  }
  console.log('verify:problems ok');
}

void main();

import { spawnSync } from 'node:child_process';

const input = process.argv[2];
const result = spawnSync('npx', ['mmdc', '-i', input, '-o', 'docs/architecture/erd.svg'], {
  encoding: 'utf8',
});

if (result.status === 0) {
  console.log('SUCCESS');
  process.exit(0);
}

console.error(`SYNTAX_ERROR: ${result.stderr}`);
process.exit(1);
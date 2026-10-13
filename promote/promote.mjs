#!/usr/bin/env node
// Usage: node promote/promote.mjs <main-repo-dir> <prod-repo-checkout-dir>
//
// Replaces the production checkout's content with the main tree transformed by
// promote/production.json. The production .git directory is kept. The script
// checks everything before it touches the production directory.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const MAIN_ONLY = /^<!-- main-only:start -->\n[\s\S]*?^<!-- main-only:end -->\n\n?/gm;

const fail = (message) => {
  console.error(`promote: ${message}`);
  process.exit(1);
};

const [mainArg, prodArg] = process.argv.slice(2);
if (!mainArg || !prodArg) fail('usage: promote.mjs <main-repo-dir> <prod-repo-checkout-dir>');
const mainDir = resolve(mainArg);
const prodDir = resolve(prodArg);
if (!existsSync(join(prodDir, '.git'))) fail(`${prodDir} is not a git checkout`);

const config = JSON.parse(readFileSync(join(mainDir, 'promote/production.json'), 'utf8'));
const replacements = [...config.replacements].sort((a, b) => b.from.length - a.from.length);
const isExcluded = (path) =>
  config.exclude.some((rule) => (rule.endsWith('/') ? path.startsWith(rule) : path === rule));

const files = execFileSync(
  'git',
  ['-C', mainDir, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'buffer', maxBuffer: 1 << 28 },
)
  .toString('utf8')
  .split('\0')
  .filter((path) => path && existsSync(join(mainDir, path)) && !isExcluded(path));

const isText = (buffer) => !buffer.includes(0);
const output = new Map(); // path -> Buffer
const swapPattern = new RegExp(
  replacements.map((r) => r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'g',
);
const swapTo = new Map(replacements.map((r) => [r.from, r.to]));
const seen = new Set();

for (const path of files) {
  const buffer = readFileSync(join(mainDir, path));
  if (!isText(buffer)) {
    output.set(path, buffer);
    continue;
  }
  const kept = buffer.toString('utf8').replace(MAIN_ONLY, '');
  for (const { from } of replacements) if (kept.includes(from)) seen.add(from);
  output.set(path, Buffer.from(kept.replace(swapPattern, (match) => swapTo.get(match)), 'utf8'));
}

const stale = replacements.filter(({ from }) => !seen.has(from));
if (stale.length) {
  fail(
    `stale mapping: these "from" strings appear in no promoted file:\n${stale
      .map(({ from }) => `  ${from}`)
      .join('\n')}`,
  );
}

// Leak check runs before the notice is added: the notice names the main repo on purpose.
const leaks = [];
for (const [path, buffer] of output) {
  if (!isText(buffer)) continue;
  const text = buffer.toString('utf8');
  for (const { from } of replacements) if (text.includes(from)) leaks.push(`  ${path}: ${from}`);
  // Catches a main-style value that has no mapping entry.
  for (const pattern of config.forbid ?? []) if (text.includes(pattern)) leaks.push(`  ${path}: forbidden "${pattern}"`);
}
if (leaks.length) fail(`main values survive in the output:\n${leaks.join('\n')}`);

if (config.notice) {
  const notice = readFileSync(join(mainDir, config.notice.file), 'utf8');
  for (const path of config.notice.prependTo) {
    if (!output.has(path)) fail(`notice target ${path} is not in the output`);
    output.set(path, Buffer.concat([Buffer.from(notice, 'utf8'), output.get(path)]));
  }
}

for (const entry of readdirSync(prodDir)) {
  if (entry !== '.git') rmSync(join(prodDir, entry), { recursive: true, force: true });
}
for (const [path, buffer] of output) {
  mkdirSync(dirname(join(prodDir, path)), { recursive: true });
  writeFileSync(join(prodDir, path), buffer);
}
console.log(`promote: wrote ${output.size} files to ${prodDir}`);

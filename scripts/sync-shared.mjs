#!/usr/bin/env node
// Usage: node scripts/sync-shared.mjs [--check]
//
// shared/<plugin>/** is the canonical source for files that both the Claude plugin
// (plugins/<plugin>/) and the ChatGPT plugin (chatgpt/<plugin>/) ship. Without a flag,
// the script copies each shared file into both plugin folders. With --check, it copies
// nothing, lists every missing or drifted file, and exits 1 if there is any.
// The copies are real files, never symlinks: the plugin folders must be self-contained.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sharedRoot = join(root, 'shared');
const targetRoots = ['plugins', 'chatgpt'];
const check = process.argv.includes('--check');

const listFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)],
  );

const problems = [];
let copied = 0;

for (const plugin of readdirSync(sharedRoot, { withFileTypes: true }).filter((e) => e.isDirectory())) {
  const pluginShared = join(sharedRoot, plugin.name);
  for (const source of listFiles(pluginShared)) {
    const rel = relative(pluginShared, source);
    const content = readFileSync(source);
    for (const targetRoot of targetRoots) {
      const target = join(root, targetRoot, plugin.name, rel);
      const label = relative(root, target);
      const current = existsSync(target) ? readFileSync(target) : null;
      if (current?.equals(content)) continue;
      if (check) {
        problems.push(`${label}: ${current ? 'differs from' : 'is missing; source is'} ${relative(root, source)}`);
        continue;
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, content);
      copied += 1;
      console.log(`sync-shared: wrote ${label}`);
    }
  }
}

if (problems.length) {
  console.error(`sync-shared: shared files are out of sync. Run "node scripts/sync-shared.mjs" and commit the result.\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(check ? 'sync-shared: all copies match shared/' : `sync-shared: ${copied} file(s) written`);

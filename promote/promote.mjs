#!/usr/bin/env node
// Usage: node promote/promote.mjs <source-dir> <target-name> <target-checkout-dir>
//
// Replaces a target checkout's content with the source tree, filtered and transformed by
// one entry of "targets" in promote/production.json. The checkout's .git and .github directories are kept, and nothing under .github/ is promoted.
// The script checks everything before it touches the checkout directory. Run it once per target.
//
// The engine fails closed: a missing "internal" list, or a target without "visibility" or "stripBlocks", stops the run.
// A public target never receives an internal plugin: its folders are excluded, and the leak guard fails the run
// when a path, a marketplace entry, or a text file still names one.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LIST_KEYS = ['replacements', 'forbid', 'include', 'exclude'];
const MARKETPLACES = ['.claude-plugin/marketplace.json', '.agents/plugins/marketplace.json'];
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const fail = (message) => {
  console.error(`promote: ${message}`);
  process.exit(1);
};

const [mainArg, targetName, prodArg] = process.argv.slice(2);
if (!mainArg || !targetName || !prodArg) {
  fail('usage: promote.mjs <source-dir> <target-name> <target-checkout-dir>');
}
const mainDir = resolve(mainArg);
const prodDir = resolve(prodArg);
if (!existsSync(join(prodDir, '.git'))) fail(`${prodDir} is not a git checkout`);

let config;
try {
  config = JSON.parse(readFileSync(join(mainDir, 'promote/production.json'), 'utf8'));
} catch (error) {
  fail(`can't read promote/production.json: ${error.message}`);
}
const targets = config.targets ?? [];
if (!Array.isArray(config.internal)) fail('promote/production.json needs a top-level "internal" list (use [] for none)');
const internal = config.internal.map((entry, index) => {
  if (!entry || typeof entry !== 'object' || typeof entry.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.name)) {
    fail(`"internal"[${index}] must be an object with a plugin "name"`);
  }
  if (entry.markers !== undefined && !(Array.isArray(entry.markers) && entry.markers.every((m) => typeof m === 'string' && m))) {
    fail(`"internal" entry "${entry.name}": "markers" must be a list of non-empty strings`);
  }
  return { name: entry.name, markers: entry.markers ?? [] };
});

const validate = (entry) => {
  if (entry.visibility !== 'public' && entry.visibility !== 'private') {
    fail(`target "${entry.name}": "visibility" must be "public" or "private" (got ${JSON.stringify(entry.visibility)})`);
  }
  if (!Array.isArray(entry.stripBlocks) || !entry.stripBlocks.every((tag) => typeof tag === 'string' && /^[A-Za-z0-9-]+$/.test(tag))) {
    fail(`target "${entry.name}": "stripBlocks" must be a list of tags such as "main-only"`);
  }
};
targets.forEach(validate);

const own = targets.find((entry) => entry.name === targetName);
if (!own) {
  fail(`no target "${targetName}" in promote/production.json (have: ${targets.map((t) => t.name).join(', ')})`);
}

// "extends" resolves one level: list keys concatenate parent then child, and other keys inherit unless the child sets them.
const resolveTarget = (entry) => {
  if (entry.extends === undefined) return entry;
  const parent = targets.find((candidate) => candidate.name === entry.extends);
  if (!parent) fail(`target "${entry.name}" extends unknown target "${entry.extends}"`);
  if (parent.extends !== undefined) fail(`target "${entry.name}" extends "${parent.name}", which extends "${parent.extends}": extends resolves one level only`);
  const merged = { ...parent, ...entry };
  delete merged.extends;
  for (const key of LIST_KEYS) {
    if (parent[key] !== undefined || entry[key] !== undefined) merged[key] = [...(parent[key] ?? []), ...(entry[key] ?? [])];
  }
  return merged;
};
const target = resolveTarget(own);
const isPublic = target.visibility === 'public';

const replacements = [...(target.replacements ?? [])].sort((a, b) => b.from.length - a.from.length);
const matchesRule = (path, rule) => (rule.endsWith('/') ? path.startsWith(rule) : path === rule);
// Production workflows are edited by hand: a deploy key can't push a change under .github/workflows.
const KEPT_ENTRIES = new Set(['.git', '.github']);
// Folders owned by an internal plugin. A public target never receives them.
const internalPaths = isPublic
  ? internal.flatMap(({ name }) => [`plugins/${name}/`, `chatgpt/${name}/`, `chatgpt/${name}-upload/`, `shared/${name}/`])
  : [];
const isIncluded = (path) => !target.include || target.include.some((rule) => matchesRule(path, rule));
const isExcluded = (path) => [...(target.exclude ?? []), ...internalPaths].some((rule) => matchesRule(path, rule));

const sourceFiles = execFileSync(
  'git',
  ['-C', mainDir, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  { encoding: 'buffer', maxBuffer: 1 << 28 },
)
  .toString('utf8')
  .split('\0')
  .filter((path) => path && existsSync(join(mainDir, path)) && !path.startsWith('.github/'));
const files = sourceFiles.filter((path) => isIncluded(path) && !isExcluded(path));

const isText = (buffer) => !buffer.includes(0);
const output = new Map(); // path -> Buffer
const swapPattern = replacements.length ? new RegExp(replacements.map((r) => escapeRegExp(r.from)).join('|'), 'g') : null;
const swapTo = new Map(replacements.map((r) => [r.from, r.to]));
const seen = new Set();

// Text between "<!-- tag:start -->" and "<!-- tag:end -->" lines is removed for each tag in "stripBlocks".
const stripPatterns = target.stripBlocks.map((tag) => ({
  tag,
  block: new RegExp(`^<!-- ${escapeRegExp(tag)}:start -->\\n[\\s\\S]*?^<!-- ${escapeRegExp(tag)}:end -->\\n\\n?`, 'gm'),
  marker: new RegExp(`^<!-- ${escapeRegExp(tag)}:(start|end) -->`, 'm'),
}));
const stripBlocks = (path, text) => {
  let kept = text;
  for (const { tag, block, marker } of stripPatterns) {
    kept = kept.replace(block, '');
    if (marker.test(kept)) fail(`[${targetName}] ${path} has an unmatched "${tag}" start or end marker`);
  }
  return kept;
};

for (const path of files) {
  const buffer = readFileSync(join(mainDir, path));
  if (!isText(buffer)) {
    output.set(path, buffer);
    continue;
  }
  const kept = stripBlocks(path, buffer.toString('utf8'));
  for (const { from } of replacements) if (kept.includes(from)) seen.add(from);
  output.set(path, Buffer.from(swapPattern ? kept.replace(swapPattern, (match) => swapTo.get(match)) : kept, 'utf8'));
}

for (const { from, to } of target.move ?? []) {
  if (!output.has(from)) fail(`[${targetName}] move source ${from} is not in the output`);
  output.set(to, output.get(from));
  output.delete(from);
}

const stale = replacements.filter(({ from }) => !seen.has(from));
if (stale.length) {
  fail(
    `[${targetName}] stale mapping: these "from" strings appear in no promoted file:\n${stale
      .map(({ from }) => `  ${from}`)
      .join('\n')}`,
  );
}

// A marketplace lists only what the target ships. An entry whose local folder the target leaves out is dropped.
// An entry whose folder exists nowhere in the source is a broken entry, so the run fails.
// A marketplace file is rewritten only when an entry is dropped, so an unchanged target stays byte-identical.
const localFolder = (source) => {
  const path = typeof source === 'string' ? source : source && source.source === 'local' ? source.path : undefined;
  if (typeof path !== 'string' || !path.startsWith('./')) return undefined;
  return path.slice(2).replace(/\/+$/, '');
};
const hasFolder = (paths, folder) => paths.some((path) => path.startsWith(`${folder}/`));
for (const marketplace of MARKETPLACES) {
  if (!output.has(marketplace)) continue;
  let parsed;
  try {
    parsed = JSON.parse(output.get(marketplace).toString('utf8'));
  } catch (error) {
    fail(`[${targetName}] ${marketplace} is not valid JSON: ${error.message}`);
  }
  if (!Array.isArray(parsed.plugins)) continue;
  const outputPaths = [...output.keys()];
  const kept = [];
  for (const plugin of parsed.plugins) {
    const folder = localFolder(plugin.source);
    if (folder === undefined || hasFolder(outputPaths, folder)) {
      kept.push(plugin);
    } else if (!hasFolder(sourceFiles, folder)) {
      fail(`[${targetName}] ${marketplace} lists "${plugin.name}" from ${folder}/, which is not in the source`);
    }
  }
  if (kept.length !== parsed.plugins.length) {
    parsed.plugins = kept;
    output.set(marketplace, Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`, 'utf8'));
  }
}

// Leak check runs before the notice is added: the notice names the source repository on purpose.
const leaks = [];
for (const [path, buffer] of output) {
  if (!isText(buffer)) continue;
  const text = buffer.toString('utf8');
  for (const { from } of replacements) if (text.includes(from)) leaks.push(`  ${path}: ${from}`);
  // Catches a source-style value that has no mapping entry.
  for (const pattern of target.forbid ?? []) if (text.includes(pattern)) leaks.push(`  ${path}: forbidden "${pattern}"`);
}
if (leaks.length) fail(`[${targetName}] source values survive in the output:\n${leaks.join('\n')}`);

// Internal leak guard for public targets. There is no allowlist: move the text into an "internal-only" block instead.
if (isPublic && internal.length) {
  const internalLeaks = [];
  for (const { name, markers } of internal) {
    // Whole-token match: "intake" doesn't match "int", but "int-main" and "int-upload" do.
    const token = new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(name)}(?:-main)?(?:-upload)?(?![A-Za-z0-9_-])`);
    const entryNames = new Set([name, `${name}-main`]);
    for (const [path, buffer] of output) {
      if (internalPaths.some((rule) => path.startsWith(rule))) internalLeaks.push(`  ${path}: plugin "${name}" has an internal path`);
      else if (token.test(path)) internalLeaks.push(`  ${path}: plugin "${name}" is named in the path`);
      if (!isText(buffer)) continue;
      const text = buffer.toString('utf8');
      const match = token.exec(text);
      if (match) internalLeaks.push(`  ${path}: plugin "${name}" matched "${match[0]}"`);
      for (const marker of markers) if (text.includes(marker)) internalLeaks.push(`  ${path}: plugin "${name}" marker "${marker}"`);
      if (MARKETPLACES.includes(path)) {
        for (const plugin of JSON.parse(text).plugins ?? []) {
          if (entryNames.has(plugin.name)) internalLeaks.push(`  ${path}: plugin "${name}" has a marketplace entry named "${plugin.name}"`);
        }
      }
    }
  }
  if (internalLeaks.length) fail(`[${targetName}] internal plugin leaks into a public target:\n${internalLeaks.join('\n')}`);
}

if (target.notice) {
  const notice = readFileSync(join(mainDir, target.notice.file), 'utf8');
  for (const path of target.notice.prependTo) {
    if (!output.has(path)) fail(`[${targetName}] notice target ${path} is not in the output`);
    output.set(path, Buffer.concat([Buffer.from(notice, 'utf8'), output.get(path)]));
  }
}

// The production repository builds and releases the ZIP itself. This check builds it once in a temporary
// directory and discards it, so a plugin that can't be zipped fails here, before the checkout is touched.
if (target.zipCheck) {
  const { source } = target.zipCheck;
  // The portal manifests live in the sibling <source>-upload folder, outside the plugin folder.
  for (const manifest of [`${source}-upload/plugin.json`, `${source}/.codex-plugin/plugin.json`]) {
    if (!output.has(manifest)) fail(`[${targetName}] zip source ${source} has no ${manifest} in the output`);
  }
  if (!output.has('scripts/build-chatgpt-zip.mjs')) fail(`[${targetName}] scripts/build-chatgpt-zip.mjs is not in the output`);
  const scratch = mkdtempSync(join(tmpdir(), 'promote-zip-'));
  try {
    for (const [path, buffer] of output) {
      if (!path.startsWith(`${source}/`) && !path.startsWith(`${source}-upload/`)) continue;
      mkdirSync(dirname(join(scratch, 'plugin', path)), { recursive: true });
      writeFileSync(join(scratch, 'plugin', path), buffer);
    }
    const { buildChatgptZips } = await import(pathToFileURL(join(mainDir, 'scripts/build-chatgpt-zip.mjs')).href);
    const zips = buildChatgptZips(join(scratch, 'plugin', source), join(scratch, 'zips'));
    console.log(
      `promote: [${targetName}] ZIP check built ${zips.upload.length} upload files and ${zips.desktop.length} desktop files`,
    );
  } catch (error) {
    fail(`[${targetName}] the plugin can't be zipped: ${error.message}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

for (const entry of readdirSync(prodDir)) {
  if (!KEPT_ENTRIES.has(entry)) rmSync(join(prodDir, entry), { recursive: true, force: true });
}
for (const [path, buffer] of output) {
  mkdirSync(dirname(join(prodDir, path)), { recursive: true });
  writeFileSync(join(prodDir, path), buffer);
}
console.log(`promote: [${targetName}] wrote ${output.size} files to ${prodDir}`);

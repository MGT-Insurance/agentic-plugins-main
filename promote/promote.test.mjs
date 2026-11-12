// Run with: node --test promote/
//
// Each case builds a temporary source repository and target repository, then runs promote.mjs
// as a child process. Nothing is committed; the fixtures live in os.tmpdir() and are removed afterwards.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const PROMOTE = join(dirname(fileURLToPath(import.meta.url)), 'promote.mjs');
const scratchDirs = [];
after(() => scratchDirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const git = (dir) => spawnSync('git', ['init', '-q', dir], { encoding: 'utf8' });

// Compact JSON proves that a marketplace file is not re-serialized when no entry is dropped.
const CLAUDE_MARKETPLACE = '{"name":"mkt","plugins":[{"name":"ext","source":"./plugins/ext"},{"name":"int","source":"./plugins/int"}]}\n';
const AGENTS_MARKETPLACE =
  '{"name":"mkt-chatgpt","plugins":[{"name":"ext","source":{"source":"local","path":"./chatgpt/ext"}},{"name":"int","source":{"source":"local","path":"./chatgpt/int"}}]}\n';

const baseFiles = () => ({
  '.claude-plugin/marketplace.json': CLAUDE_MARKETPLACE,
  '.agents/plugins/marketplace.json': AGENTS_MARKETPLACE,
  'plugins/ext/.claude-plugin/plugin.json': json({ name: 'ext', version: '1.0.0' }),
  'plugins/int/.claude-plugin/plugin.json': json({ name: 'int', version: '1.0.0' }),
  'chatgpt/ext/.codex-plugin/plugin.json': json({ name: 'ext' }),
  'chatgpt/ext-upload/plugin.json': json({ name: 'ext' }),
  'chatgpt/int/.codex-plugin/plugin.json': json({ name: 'int' }),
  'chatgpt/int-upload/plugin.json': json({ name: 'int' }),
  'README.md': '# Marketplace\n\nInstall ext from here.\n',
  'promote/notice.md': '> Generated. Do not commit here.\n\n',
});

const target = (name, extra = {}) => ({ name, visibility: 'public', stripBlocks: ['internal-only'], exclude: ['promote/'], ...extra });

const defaultConfig = () => ({
  source: 'example/source',
  internal: [{ name: 'int' }],
  targets: [target('pub'), target('priv', { visibility: 'private', stripBlocks: [] })],
});

/** Builds a source repository and an empty target repository, and returns a runner for one target. */
const fixture = ({ config = defaultConfig(), files = {}, targetFiles = {} } = {}) => {
  const root = mkdtempSync(join(tmpdir(), 'promote-test-'));
  scratchDirs.push(root);
  const source = join(root, 'source');
  const out = join(root, 'out');
  const all = { ...baseFiles(), ...files };
  if (config !== null) all['promote/production.json'] = typeof config === 'string' ? config : json(config);
  for (const [path, content] of Object.entries(all)) {
    if (content === null) continue;
    mkdirSync(dirname(join(source, path)), { recursive: true });
    writeFileSync(join(source, path), content);
  }
  mkdirSync(out);
  git(source);
  git(out);
  for (const [path, content] of Object.entries(targetFiles)) {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), content);
  }
  const run = (name) => {
    const result = spawnSync('node', [PROMOTE, source, name, out], { encoding: 'utf8' });
    return { status: result.status, stdout: result.stdout, stderr: result.stderr };
  };
  const read = (path) => readFileSync(join(out, path), 'utf8');
  const has = (path) => existsSync(join(out, path));
  const plugins = (marketplace) => JSON.parse(read(marketplace)).plugins.map((plugin) => plugin.name);
  return { source, out, run, read, has, plugins };
};

const blocks = [
  'Intro.',
  '<!-- main-only:start -->',
  'MAIN ONLY TEXT',
  '<!-- main-only:end -->',
  '<!-- internal-only:start -->',
  'Private source guidance for int.',
  '<!-- internal-only:end -->',
  'Outro.',
  '',
].join('\n');

describe('internal plugin filtering', () => {
  it('omits the internal plugin from a public target', () => {
    const f = fixture();
    const result = f.run('pub');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.has('plugins/int'), false);
    assert.equal(f.has('chatgpt/int'), false);
    assert.equal(f.has('chatgpt/int-upload'), false);
    assert.deepEqual(f.plugins('.claude-plugin/marketplace.json'), ['ext']);
    assert.deepEqual(f.plugins('.agents/plugins/marketplace.json'), ['ext']);
    assert.equal(f.has('plugins/ext/.claude-plugin/plugin.json'), true);
  });

  it('ships the internal plugin unchanged to a private target', () => {
    const f = fixture();
    const result = f.run('priv');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.has('plugins/int/.claude-plugin/plugin.json'), true);
    assert.equal(f.has('chatgpt/int-upload/plugin.json'), true);
    assert.deepEqual(f.plugins('.claude-plugin/marketplace.json'), ['ext', 'int']);
    assert.deepEqual(f.plugins('.agents/plugins/marketplace.json'), ['ext', 'int']);
  });

  it('leaves marketplace bytes unchanged when no entry is dropped', () => {
    const f = fixture();
    assert.equal(f.run('priv').status, 0);
    assert.equal(f.read('.claude-plugin/marketplace.json'), CLAUDE_MARKETPLACE);
    assert.equal(f.read('.agents/plugins/marketplace.json'), AGENTS_MARKETPLACE);
  });

  it('drops the marketplace entry of a plugin folder that a target excludes', () => {
    const config = defaultConfig();
    config.targets[1].exclude = ['plugins/ext/'];
    const f = fixture({ config });
    const result = f.run('priv');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(f.has('plugins/ext'), false);
    assert.deepEqual(f.plugins('.claude-plugin/marketplace.json'), ['int']);
    assert.deepEqual(f.plugins('.agents/plugins/marketplace.json'), ['ext', 'int']);
  });

  it('fails when a marketplace entry points at a folder that is not in the source', () => {
    const missing = '{"name":"mkt","plugins":[{"name":"ghost","source":"./plugins/ghost"}]}\n';
    const f = fixture({ files: { '.claude-plugin/marketplace.json': missing } });
    const result = f.run('priv');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ghost/);
  });
});

describe('leak guard', () => {
  it('fails closed when a public target mentions the internal plugin outside an internal-only block', () => {
    const f = fixture({ files: { 'README.md': '# Marketplace\n\nTry the int plugin.\n' } });
    const result = f.run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /README\.md/);
    assert.match(result.stderr, /"int"/);
    assert.equal(f.has('README.md'), false, 'the checkout stays untouched');
  });

  it('matches whole tokens only', () => {
    const intake = fixture({ files: { 'README.md': 'Policy intake is open.\n' } });
    assert.equal(intake.run('pub').status, 0);

    const suffixed = fixture({ files: { 'README.md': 'Install int-main today.\n' } });
    const result = suffixed.run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /int-main/);

    const upload = fixture({ files: { 'README.md': 'See chatgpt/int-upload/ for details.\n' } });
    assert.equal(upload.run('pub').status, 1);
  });

  it('fails on a marker as a plain substring', () => {
    const config = defaultConfig();
    config.internal = [{ name: 'int', markers: ['int_secret_endpoint'] }];
    const f = fixture({ config, files: { 'README.md': 'Call int_secret_endpoint here.\n' } });
    const result = f.run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /int_secret_endpoint/);
  });

  it('fails when a marketplace entry named like the internal plugin survives', () => {
    const renamed = '{"name":"mkt","plugins":[{"name":"int-main","source":"./plugins/ext"}]}\n';
    const f = fixture({ files: { '.claude-plugin/marketplace.json': renamed } });
    const result = f.run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /marketplace entry/);
  });

  it('does not run the guard for a private target', () => {
    const f = fixture({ files: { 'README.md': 'Try the int plugin.\n' } });
    assert.equal(f.run('priv').status, 0);
  });
});

describe('block stripping', () => {
  it('strips each target tag and keeps the rest', () => {
    const config = defaultConfig();
    config.targets.push(target('prod', { stripBlocks: ['main-only', 'internal-only'] }));
    config.targets.push(target('priv-main', { visibility: 'private', stripBlocks: ['main-only'] }));
    const f = fixture({ config, files: { 'README.md': blocks } });

    assert.equal(f.run('pub').status, 0);
    assert.ok(f.read('README.md').includes('MAIN ONLY TEXT'), 'pub keeps main-only');
    assert.ok(!f.read('README.md').includes('Private source guidance'), 'pub strips internal-only');

    assert.equal(f.run('prod').status, 0);
    assert.ok(!f.read('README.md').includes('MAIN ONLY TEXT'));
    assert.ok(!f.read('README.md').includes('Private source guidance'));

    assert.equal(f.run('priv-main').status, 0);
    assert.ok(!f.read('README.md').includes('MAIN ONLY TEXT'));
    assert.ok(f.read('README.md').includes('Private source guidance'), 'private keeps internal-only');

    assert.equal(f.run('priv').status, 0);
    assert.equal(f.read('README.md'), blocks, 'a private target with no tags changes nothing');
  });

  it('fails on an unbalanced marker of a stripped tag', () => {
    const start = fixture({ files: { 'README.md': 'a\n<!-- internal-only:start -->\nb\n' } });
    assert.equal(start.run('pub').status, 1);
    const end = fixture({ files: { 'README.md': 'a\n<!-- internal-only:end -->\nb\n' } });
    assert.equal(end.run('pub').status, 1);
  });
});

describe('fail-closed configuration', () => {
  it('fails when a target has no visibility', () => {
    const config = defaultConfig();
    delete config.targets[0].visibility;
    const result = fixture({ config }).run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /visibility/);
  });

  it('fails when visibility is neither public nor private', () => {
    const config = defaultConfig();
    config.targets[0].visibility = 'internal';
    assert.equal(fixture({ config }).run('pub').status, 1);
  });

  it('fails when a target has no stripBlocks', () => {
    const config = defaultConfig();
    delete config.targets[0].stripBlocks;
    const result = fixture({ config }).run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /stripBlocks/);
  });

  it('fails when the internal list is missing or holds a string', () => {
    const missing = defaultConfig();
    delete missing.internal;
    assert.equal(fixture({ config: missing }).run('pub').status, 1);

    const strings = defaultConfig();
    strings.internal = ['int'];
    assert.equal(fixture({ config: strings }).run('pub').status, 1);
  });

  it('fails on an unknown target and on a stale mapping', () => {
    assert.equal(fixture().run('nope').status, 1);

    const config = defaultConfig();
    config.targets[0].replacements = [{ from: 'nowhere-in-the-tree', to: 'x' }];
    const result = fixture({ config }).run('pub');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /stale mapping/);
  });
});

describe('extends', () => {
  const extendsConfig = () => ({
    source: 'example/source',
    internal: [{ name: 'int' }],
    targets: [
      target('base', {
        replacements: [{ from: 'alpha', to: 'beta' }],
        exclude: ['promote/', 'docs/'],
        notice: { file: 'promote/notice.md', prependTo: ['README.md'] },
      }),
      {
        name: 'child',
        visibility: 'private',
        extends: 'base',
        stripBlocks: [],
        replacements: [{ from: 'int-main', to: 'int' }],
        exclude: ['notes/'],
        notice: { file: 'promote/child-notice.md', prependTo: ['README.md'] },
      },
    ],
  });
  const files = {
    'README.md': 'Say alpha.\n',
    'docs/page.md': 'docs\n',
    'notes/page.md': 'notes\n',
    'plugins/int/.claude-plugin/plugin.json': json({ name: 'int-main' }),
    'promote/child-notice.md': '> Child notice.\n\n',
  };

  it('concatenates lists and lets a child-only mapping skip the parent stale check', () => {
    const f = fixture({ config: extendsConfig(), files });
    const parent = f.run('base');
    assert.equal(parent.status, 0, parent.stderr);
    assert.equal(f.read('README.md'), '> Generated. Do not commit here.\n\nSay beta.\n');
    assert.equal(f.has('docs/page.md'), false);
    assert.equal(f.has('notes/page.md'), true);
    assert.equal(f.has('plugins/int'), false);

    const child = f.run('child');
    assert.equal(child.status, 0, child.stderr);
    assert.equal(f.has('docs/page.md'), false, 'the parent exclude applies');
    assert.equal(f.has('notes/page.md'), false, 'the child exclude applies');
    assert.equal(JSON.parse(f.read('plugins/int/.claude-plugin/plugin.json')).name, 'int');
    assert.equal(f.read('README.md'), '> Child notice.\n\nSay beta.\n', 'the child notice overrides');
  });

  it('fails on an unknown parent and on a chain of parents', () => {
    const unknown = extendsConfig();
    unknown.targets[1].extends = 'missing';
    assert.equal(fixture({ config: unknown, files }).run('child').status, 1);

    const chain = extendsConfig();
    chain.targets[0].extends = 'child';
    assert.equal(fixture({ config: chain, files }).run('child').status, 1);
  });
});

describe('checkout handling', () => {
  it('keeps the target .github and writes nothing from the source .github', () => {
    const f = fixture({
      files: { '.github/workflows/source.yml': 'name: source\n' },
      targetFiles: { '.github/workflows/keep.yml': 'name: keep\n', 'stale.txt': 'old\n' },
    });
    assert.equal(f.run('priv').status, 0);
    assert.equal(f.read('.github/workflows/keep.yml'), 'name: keep\n');
    assert.equal(f.has('.github/workflows/source.yml'), false);
    assert.equal(f.has('stale.txt'), false);
  });
});

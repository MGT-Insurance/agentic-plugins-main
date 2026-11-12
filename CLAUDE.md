# MGT Insurance plugin marketplace

This repository is a Claude Code marketplace (`.claude-plugin/marketplace.json`). Each plugin lives in `plugins/<name>/` with its own `.claude-plugin/plugin.json`.

<!-- main-only:start -->
## Where to commit

`MGT-Insurance/agentic-plugins-main-internal` is private and is the source of truth. It points at MGT's main environment, and it is the only repository where you open pull requests. It holds two plugins: the Claude plugin in `plugins/mgt-quoting/` and the ChatGPT plugin in `chatgpt/mgt-quoting/`.

Four repositories are generated from it by `promote/promote.mjs`. Never commit to them: the next publish or promote overwrites a direct commit.

| Repository | Visibility | Holds | What writes it |
|---|---|---|---|
| `MGT-Insurance/agentic-plugins-main` | public | Main values, no internal plugins | The `publish-dev` workflow, on every push to `main` |
| `MGT-Insurance/claude-plugins` | public | Production values, Claude plugins | The `promote` workflow, run by hand |
| `MGT-Insurance/claude-plugins-internal` | private | Production values, all Claude plugins | The `promote` workflow, run by hand |
| `MGT-Insurance/chatgpt-plugins` | public | Production values, ChatGPT plugins | The `promote` workflow, run by hand |

`claude plugin marketplace add MGT-Insurance/agentic-plugins-main` and the ChatGPT desktop marketplace source `MGT-Insurance/agentic-plugins-main` keep working because the public repository keeps the main values, `.claude-plugin/`, `plugins/`, `.agents/`, and `chatgpt/`.

The ChatGPT plugin has four manifests in two folders that build two ZIPs. `chatgpt/<plugin>-upload/` holds `plugin.json` and `mcp.json` (Agent Plugins format), which make the portal upload ZIP. `chatgpt/<plugin>/` holds `.codex-plugin/plugin.json` and `.mcp.json`, which make the ChatGPT desktop ZIP, plus the `skills/` and `assets/` that both ZIPs ship. Never put a root `plugin.json` or `mcp.json` in `chatgpt/<plugin>/`: it stops ChatGPT desktop and Codex from registering the MCP server on a marketplace install, and the build fails if either exists. `node scripts/build-chatgpt-zip.mjs chatgpt/<plugin> dist` reads the sibling `chatgpt/<plugin>-upload/`, writes both ZIPs, and fails when `name`, `version`, `description`, `author`, the interface text, the server URL, or the scopes differ between the pairs, so edit both pairs in the same commit. The build also fails, naming the field, its length, and the limit, when the upload manifest's `interface` or `review.test_cases` break OpenAI's listing limits (`displayName` and `shortDescription` 30 characters, `longDescription` 4000, `developerName` 80, at most 3 `defaultPrompt` entries of 128, https `*URL` fields of 1024, exactly 5 positive and 3 negative test cases). The two pairs use different Auth0 clients: the upload ZIP uses the "ChatGPT directory" client, and the desktop ZIP uses the public "external testers" client with the loopback callback `http://127.0.0.1:14551/callback`. The production client secret is entered in OpenAI's plugin portal, never in this repository.

## Shared files

`shared/<plugin>/` holds only the logo (`assets/icon.png`), which both plugins ship. Each plugin owns its own skill (`plugins/<plugin>/skills/...` and `chatgpt/<plugin>/skills/...`); edit each in place. Edit the logo in `shared/`, never in the plugin folders. Then run:

```bash
node scripts/sync-shared.mjs
```

The script copies each shared file into `plugins/<plugin>/` and `chatgpt/<plugin>/`. The copies are real files, not symlinks, because each plugin folder must be self-contained. CI runs `node scripts/sync-shared.mjs --check` and names each missing or drifted file.

A change to the logo changes both plugins, so raise the `version` in `plugins/<plugin>/.claude-plugin/plugin.json`, `chatgpt/<plugin>/.codex-plugin/plugin.json`, and `chatgpt/<plugin>-upload/plugin.json`, using the version bump rule below. The ChatGPT plugin has its own version, and each ZIP upload to OpenAI is a new version.

## Publish and promote

Every push to `main` runs the **publish-dev** workflow, which writes `MGT-Insurance/agentic-plugins-main`. The workflow validates the output and commits only when the tree changed. A commit in any generated repository reads "Publish from agentic-plugins-main-internal@<sha7>".

Promote after the MCP server release that matches your plugin change reaches production. The plugin's skill describes MCP tools, and the main server gets new tools first.

1. Run the **promote** workflow (**Actions** > **promote**) with `dry_run` on, and read the diffs.
2. If the diffs are what you expect, run it again with `dry_run` off.

The workflow runs once per target: `claude-plugins`, `claude-plugins-internal`, and `chatgpt-plugins`. The ChatGPT target needs the `CHATGPT_PROMOTE_DEPLOY_KEY` secret and is skipped with a message when the secret is absent. The other workflows fail with an error that names a missing secret.

Both workflows skip in every repository except `MGT-Insurance/agentic-plugins-main-internal`. They read these repository secrets, each the private half of a write deploy key on the repository in the second column:

| Secret | Deploy key on |
|---|---|
| `DEV_PUBLISH_DEPLOY_KEY` | `MGT-Insurance/agentic-plugins-main` |
| `PROMOTE_DEPLOY_KEY` | `MGT-Insurance/claude-plugins` |
| `PROD_INTERNAL_DEPLOY_KEY` | `MGT-Insurance/claude-plugins-internal` |
| `CHATGPT_PROMOTE_DEPLOY_KEY` | `MGT-Insurance/chatgpt-plugins` |

To preview locally, check out the target repository and run the script with the target name:

```bash
node promote/promote.mjs . agentic-plugins-main ../agentic-plugins-main
node promote/promote.mjs . claude-plugins ../claude-plugins
node promote/promote.mjs . claude-plugins-internal ../claude-plugins-internal
node promote/promote.mjs . chatgpt-plugins ../chatgpt-plugins
```

Promote never touches `.github/` in the generated repositories: it keeps what is there and publishes nothing under `.github/` from this repository. Edit their workflows by hand.

Run the engine tests before you change `promote/`:

```bash
node --test promote/promote.test.mjs
```

### production.json

`promote/production.json` is the only place that lists differences between the source and the generated repositories. It has these top-level keys:

- `source`: the source repository.
- `internal`: a list of internal plugins. Each element is an object with a `name` (the plugin's base name, for example `mgt-waldo`) and an optional `markers` list of extra strings that must not reach a public target. The list is empty until the first internal plugin lands. If the key is missing, promote fails.
- `targets`: one entry per generated repository.

Each target has these keys:

- `visibility` (required): `public` or `private`. Promote fails when the key is missing or has another value.
- `stripBlocks` (required): a list of tags. Promote removes the text between the lines `<!-- <tag>:start -->` and `<!-- <tag>:end -->` for each listed tag, and fails when a start or end marker has no match. The tags in use are `main-only` (production targets strip it) and `internal-only` (public targets strip it).
- `extends` (optional): the name of another target. List keys (`replacements`, `forbid`, `include`, `exclude`) concatenate parent then child. Other keys inherit unless the child sets them. A parent can't extend another target. `claude-plugins-internal` extends `claude-plugins`, so a value that belongs only to an internal plugin stays out of the public targets' checks.
- `replacements`: plain string replacements applied to every text file. The script applies the longest `from` first, so list a value once and don't worry about prefixes.
- `forbid`: substrings that must not appear in the output, to catch a main value that has no `replacements` entry.
- `include` (optional): the only paths the target receives.
- `exclude`: paths that stay out of the target. When an excluded folder has a marketplace entry, promote drops that entry from both `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`. Use this to keep a plugin main-only: add its folder to the production targets' `exclude`.
- `move` (optional): renames a promoted file. The `chatgpt-plugins` target moves `chatgpt/README.md` to the repository root.
- `notice` (optional): the generated-file notice that the script prepends to the listed files. Public targets get a notice with no link, because the source is private. `claude-plugins-internal` links the source.
- `zipCheck` (optional): builds both ChatGPT plugin ZIPs from the promoted `source` folder into a temporary directory and discards them, so promote fails before it writes anything if the plugin can't be zipped. Promote doesn't write a ZIP. `MGT-Insurance/chatgpt-plugins` builds and releases `mgt-quoting-upload.zip` and `mgt-quoting-desktop.zip` with its own `.github/workflows/release.yml`, which you edit by hand there.

The script fails if a `from` string appears nowhere in the target's files (stale mapping) or still appears in the output (a main value would leak into a generated repository). When you add a main-only value to a plugin, add its production value to the matching target's `replacements` in the same pull request.

### Internal plugins

An internal plugin is for MGT employees. It reaches the private `claude-plugins-internal` marketplace and never a public repository. To add one, list it in `internal` and add its folders. For a plugin named `n`, the internal paths are `plugins/n/`, `chatgpt/n/`, `chatgpt/n-upload/`, and `shared/n/`, and the marketplace entry names are `n` and `n-main`. Internal plugins are Claude-only: no private ChatGPT target exists.

For each public target, promote excludes the internal paths and drops the matching marketplace entries. Then the leak guard fails the run, with no allowlist, when any of these remain in the output:

- A path that starts with an internal path or contains the plugin name as a whole token.
- A marketplace entry named `n` or `n-main`.
- A text file that contains `n`, `n-main`, or `n-upload` as a whole token. A token isn't preceded or followed by a letter, digit, underscore, or hyphen, so `intake` doesn't match a plugin named `int`.
- A text file that contains any of the plugin's `markers` as a substring.

When the guard fails, move the text into an `internal-only` block or remove it. Put the internal plugin's production mapping, for example `mgt-waldo-main` to `mgt-waldo`, only in the `claude-plugins-internal` target, so the public targets' stale-mapping check never sees it.

Edits to `promote/`, `scripts/`, and `.github/` need no version bump.

<!-- main-only:end -->
## Version bump rule

Every change to a plugin's content raises the `version` in that plugin's own `plugins/<name>/.claude-plugin/plugin.json`. Use semver:

- **patch:** wording or typo fixes in the plugin's skill or README, with no behavior change.
- **minor:** new or changed skill guidance, new MCP tools the skill references, or new components (skill, command, agent).
- **major:** a renamed or removed component, or an MCP URL or sign-in change that breaks existing installs.
- **no bump:** edits only to the root `CLAUDE.md`, the root `README.md`, `.github/`, or `.claude-plugin/marketplace.json`.

Why: Claude Code uses the manifest version to detect an update. A manifest that pins a version keeps every user on the cached copy until the version string changes, however many commits you push ([versions and updates](https://code.claude.com/docs/en/plugins/loading#versions-and-updates)). The Claude directory also instructs you to raise the version with every release ([update a published plugin](https://claude.com/docs/plugins/submit#update-a-published-plugin)).

Don't put a `version` in the marketplace entry. When both files set one, `plugin.json` wins and `claude plugin validate --strict` fails on the warning.

## Checks

The `plugin-checks` workflow runs on every pull request to `main`:

1. `claude plugin validate --strict` at the repository root and in each `plugins/*/` folder.
2. For each plugin folder a pull request touches, the plugin's version must be greater than the version on `main`. A plugin folder that doesn't exist on `main` is new and passes.

Run the validation locally before you push:

```bash
claude plugin validate --strict .
claude plugin validate --strict plugins/mgt-quoting
```

<!-- main-only:start -->
In the private source repository, `plugin-checks` also runs `node --test promote/promote.test.mjs`. It then generates every target in `promote/production.json` into a scratch directory and strict-validates the Claude marketplaces, so a leak or a stale mapping fails the pull request instead of the next publish or promote run.

<!-- main-only:end -->
## Plugin folder constraints

The directory submission requires each plugin folder to be self-contained. Keep the plugin's `README.md` and `LICENSE` inside its folder, and don't use paths that escape it. Don't add symlinks, submodules, Git LFS files, `bin/`, `package.json`, lockfiles, or `.DS_Store`.

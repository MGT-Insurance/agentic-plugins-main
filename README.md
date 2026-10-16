# MGT Insurance plugins for Claude

This repository is the MGT Insurance plugin marketplace for Claude Code and Claude. Each plugin lives in its own folder under `plugins/`.

<!-- main-only:start -->
## This is the main marketplace

This repository is the source of truth for MGT's Claude plugins, and it points at MGT's **main** environment (`mcp-main.mgtinsurance.ai`). Plugin changes land here first, so the plugin can use new MCP tools as soon as the main server has them.

Install this marketplace if you test MGT changes before they reach production: MGT engineers, and agencies that MGT has asked to test pre-release behavior. If you quote real business, install the production marketplace, [`MGT-Insurance/claude-plugins`](https://github.com/MGT-Insurance/claude-plugins), instead.

### Install for testing

```bash
claude plugin marketplace add MGT-Insurance/agentic-plugins-main
claude plugin install mgt-quoting@mgt-insurance-main
```

Both marketplaces publish a plugin named `mgt-quoting`. Enable only one at a time, and uninstall the other first:

```bash
claude plugin uninstall mgt-quoting@mgt-insurance
```

### How promotion works

Nobody commits to `MGT-Insurance/claude-plugins`. A maintainer runs the **promote** workflow here (**Actions** > **promote**) after the matching MCP server release reaches production. The workflow:

1. Generates one production tree per target from this repository by swapping main values for production values, as listed in [`promote/production.json`](promote/production.json). The `claude-plugins` target publishes the Claude plugin. The `chatgpt-plugins` target publishes the ChatGPT plugin. That repository's release workflow builds both ChatGPT ZIPs and publishes them as a GitHub release when the plugin version changes.
2. Validates the result and checks that each changed plugin has a higher version than production.
3. Commits each result to its production repository, unless you ran it with `dry_run` on. The ChatGPT target is skipped with a message when its deploy key isn't configured.

Promote never touches `.github/` in the production repositories, so edit production workflows by hand.

To promote locally, see [`CLAUDE.md`](CLAUDE.md).

## ChatGPT plugin

`chatgpt/mgt-quoting/` is the ChatGPT version of the MGT Quoting plugin (`mgt-quoting-main`, shown as **MGT Quoting (main)**). It points at the main MCP server and ships in two formats from one folder:

| Format | Manifests | Auth0 client in main |
|---|---|---|
| Portal upload | `plugin.json` and `mcp.json` | Dev "ChatGPT directory" app. You enter its client secret in OpenAI's plugin portal. |
| ChatGPT desktop | `.codex-plugin/plugin.json` and `.mcp.json` | Dev "Mithril MCP (external testers)" app, a public client with no secret. The sign-in callback is `http://127.0.0.1:14551/callback`. |

The `.mcp.json` oauth block holds the Auth0 `client_id` and the loopback callback, and `mcp.json` holds the `clientId`. No client secret is stored in this repository.

The skill and logo that both plugins ship live once in `shared/mgt-quoting/`. After you change a file there, run `node scripts/sync-shared.mjs` and commit the copies. CI runs `node scripts/sync-shared.mjs --check` and fails when a copy drifts.

The **plugin-checks** workflow builds `mgt-quoting-main-upload.zip` and `mgt-quoting-main-desktop.zip` from `chatgpt/mgt-quoting/` and uploads both as workflow artifacts. The upload ZIP has `plugin.json` and `mcp.json` at its root, and the desktop ZIP has `.codex-plugin/plugin.json` and `.mcp.json` at its root. The build fails when the two manifest sets drift, and the workflow validates `plugin.json` against the Agent Plugins schema in `scripts/schemas/`. To build both ZIPs locally:

```bash
node scripts/build-chatgpt-zip.mjs chatgpt/mgt-quoting dist
```

To test the upload ZIP, upload it in OpenAI's plugin portal (**Plugins** > **Upload new or existing plugin**). To test the desktop ZIP, install it in ChatGPT desktop.

<!-- main-only:end -->
## Add the marketplace

```bash
claude plugin marketplace add MGT-Insurance/agentic-plugins-main
```

## Plugins

| Plugin | Install | Description |
|---|---|---|
| [`mgt-quoting`](plugins/mgt-quoting) | `claude plugin install mgt-quoting@mgt-insurance-main` | For insurance agents: quote MGT small-business commercial insurance from Claude. |

Each plugin's README covers its install, update, and data-handling details.

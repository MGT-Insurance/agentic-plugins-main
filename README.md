# MGT Insurance plugins for Claude

This repository is the MGT Insurance plugin marketplace for Claude Code and Claude. Each plugin lives in its own folder under `plugins/`.

<!-- main-only:start -->
## This is the main marketplace

This marketplace points at MGT's **main** environment (`mcp-main.mgtinsurance.ai`). Plugin changes land here first, so the plugin can use new MCP tools as soon as the main server has them.

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

<!-- internal-only:start -->
### How publishing works

`MGT-Insurance/agentic-plugins-main-internal` is the private source. Open pull requests there, and never commit to a generated repository. Four repositories are generated from the source, as [`CLAUDE.md`](CLAUDE.md) describes:

- `MGT-Insurance/agentic-plugins-main` (public, main values) is written by the **publish-dev** workflow on every push to `main`.
- `MGT-Insurance/claude-plugins` (public), `MGT-Insurance/claude-plugins-internal` (private), and `MGT-Insurance/chatgpt-plugins` (public) are written by the **promote** workflow, which a maintainer runs (**Actions** > **promote**) after the matching MCP server release reaches production.

The promote workflow:

1. Generates one tree per target from the source by swapping main values for production values, as listed in [`promote/production.json`](promote/production.json). That repository's release workflow builds both ChatGPT ZIPs and publishes them as a GitHub release when the plugin version changes.
2. Validates the result and checks that each changed plugin has a higher version than production.
3. Commits each result to its repository, unless you ran it with `dry_run` on. The ChatGPT target is skipped with a message when its deploy key isn't configured.

Promote never touches `.github/` in the generated repositories, so edit their workflows by hand. To promote locally, see [`CLAUDE.md`](CLAUDE.md).

<!-- internal-only:end -->
## ChatGPT plugin

`chatgpt/mgt-quoting/` is the ChatGPT version of the MGT Quoting plugin (`mgt-quoting-main`, shown as **MGT Quoting (main)**). It points at the main MCP server and ships in two formats:

| Format | Manifests | Where they live | Auth0 client in main |
|---|---|---|---|
| Portal upload | `plugin.json` and `mcp.json` | `chatgpt/mgt-quoting-upload/` | Dev "ChatGPT directory" app. You enter its client secret in OpenAI's plugin portal. |
| ChatGPT desktop | `.codex-plugin/plugin.json` and `.mcp.json` | `chatgpt/mgt-quoting/` | Dev "Mithril MCP (external testers)" app, a public client with no secret. The sign-in callback is `http://127.0.0.1:14551/callback`. |

The portal manifests live outside the plugin folder because a root `plugin.json` or `mcp.json` in `chatgpt/mgt-quoting/` stops ChatGPT desktop and Codex from registering the MCP server when you install the plugin from a marketplace.

The `.mcp.json` oauth block holds the Auth0 `client_id` and the loopback callback, and `mcp.json` holds the `clientId`. No client secret is stored in this repository.

To test the desktop plugin, add this repository as a marketplace in ChatGPT desktop with the source `MGT-Insurance/agentic-plugins-main` and install **MGT Quoting (main)**.

<!-- internal-only:start -->
The logo that both plugins ship lives once in `shared/mgt-quoting/`. Each plugin owns its own skill. After you change the logo, run `node scripts/sync-shared.mjs` and commit the copies. CI runs `node scripts/sync-shared.mjs --check` and fails when a copy drifts.

The **plugin-checks** workflow builds `mgt-quoting-main-upload.zip` and `mgt-quoting-main-desktop.zip` from `chatgpt/mgt-quoting/` and `chatgpt/mgt-quoting-upload/` and uploads both as workflow artifacts. The upload ZIP has `plugin.json` and `mcp.json` at its root, and the desktop ZIP has `.codex-plugin/plugin.json` and `.mcp.json` at its root. The build fails when the two manifest sets drift, and the workflow validates `plugin.json` against the Agent Plugins schema in `scripts/schemas/`. To build both ZIPs locally:

```bash
node scripts/build-chatgpt-zip.mjs chatgpt/mgt-quoting dist
```

To test the upload ZIP, upload it in OpenAI's plugin portal (**Plugins** > **Upload new or existing plugin**). The workflow artifacts live in this private repository, so only people with access to it can download them.

<!-- internal-only:end -->
<!-- internal-only:start -->
## Add the marketplaces to a claude.ai organization

claude.ai organization marketplaces accept only private or internal repositories, so an organization can't add a public repository. Add the private repositories instead. Each environment has one:

| Environment | Repository to add | Marketplace name |
|---|---|---|
| Main | `MGT-Insurance/agentic-plugins-main-internal` | `mgt-insurance-main` |
| Production | `MGT-Insurance/claude-plugins-internal` | `mgt-insurance` |

`MGT-Insurance/agentic-plugins-main` and its `-internal` source both declare the marketplace name `mgt-insurance-main`. `MGT-Insurance/claude-plugins` and its `-internal` repository both declare `mgt-insurance`. Staff add only the `-internal` marketplace for each environment, so each name resolves to one marketplace.

To add a marketplace, install the Claude GitHub App on the repository. Then, in claude.ai, go to **Organization settings** > **Plugins & skills** > **Marketplaces** > **Add** and enter the repository. The marketplace syncs from the repository's default branch.

`claude-plugins-internal` carries every Claude plugin, including internal plugins that no public repository receives. Internal plugins are Claude-only: no private ChatGPT target exists. To keep a plugin on the main marketplace only, add its folder to the production targets' `exclude` list in `promote/production.json`. After a plugin first reaches a claude.ai organization marketplace, an Owner adds its connector once (**Organization settings** > **Connectors**).

<!-- internal-only:end -->
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

> **This repository is generated. Don't commit here.** A publish workflow overwrites this repository on every update, so a direct commit is lost.

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

## ChatGPT plugin

`chatgpt/mgt-quoting/` is the ChatGPT version of the MGT Quoting plugin (`mgt-quoting-main`, shown as **MGT Quoting (main)**). It points at the main MCP server and ships in two formats:

| Format | Manifests | Where they live | Auth0 client in main |
|---|---|---|---|
| Portal upload | `plugin.json` and `mcp.json` | `chatgpt/mgt-quoting-upload/` | Dev "ChatGPT directory" app. You enter its client secret in OpenAI's plugin portal. |
| ChatGPT desktop | `.codex-plugin/plugin.json` and `.mcp.json` | `chatgpt/mgt-quoting/` | Dev "Mithril MCP (external testers)" app, a public client with no secret. The sign-in callback is `http://127.0.0.1:14551/callback`. |

The portal manifests live outside the plugin folder because a root `plugin.json` or `mcp.json` in `chatgpt/mgt-quoting/` stops ChatGPT desktop and Codex from registering the MCP server when you install the plugin from a marketplace.

The `.mcp.json` oauth block holds the Auth0 `client_id` and the loopback callback, and `mcp.json` holds the `clientId`. No client secret is stored in this repository.

To test the desktop plugin, add this repository as a marketplace in ChatGPT desktop with the source `MGT-Insurance/agentic-plugins-main` and install **MGT Quoting (main)**.

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

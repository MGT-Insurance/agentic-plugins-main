# MGT Insurance plugins for Claude

This repository is the MGT Insurance plugin marketplace for Claude Code and Claude. Each plugin lives in its own folder under `plugins/`.

<!-- main-only:start -->
## This is the main marketplace

This repository is the source of truth for MGT's Claude plugins, and it points at MGT's **main** environment (`mcp-main.mgtinsurance.ai`). Plugin changes land here first, so the plugin can use new MCP tools as soon as the main server has them.

Install this marketplace if you test MGT changes before they reach production: MGT engineers, and agencies that MGT has asked to test pre-release behavior. If you quote real business, install the production marketplace, [`MGT-Insurance/claude-plugins`](https://github.com/MGT-Insurance/claude-plugins), instead.

### Install for testing

```bash
claude plugin marketplace add MGT-Insurance/claude-plugins-main
claude plugin install mgt-quoting@mgt-insurance-main
```

Both marketplaces publish a plugin named `mgt-quoting`. Enable only one at a time, and uninstall the other first:

```bash
claude plugin uninstall mgt-quoting@mgt-insurance
```

### How promotion works

Nobody commits to `MGT-Insurance/claude-plugins`. A maintainer runs the **promote** workflow here (**Actions** > **promote**) after the matching MCP server release reaches production. The workflow:

1. Generates the production tree from this repository by swapping main values for production values, as listed in [`promote/production.json`](promote/production.json).
2. Validates the result and checks that each changed plugin has a higher version than production.
3. Commits the result to `MGT-Insurance/claude-plugins`, unless you ran it with `dry_run` on.

To promote locally, see [`CLAUDE.md`](CLAUDE.md).

<!-- main-only:end -->
## Add the marketplace

```bash
claude plugin marketplace add MGT-Insurance/claude-plugins-main
```

## Plugins

| Plugin | Install | Description |
|---|---|---|
| [`mgt-quoting`](plugins/mgt-quoting) | `claude plugin install mgt-quoting@mgt-insurance-main` | Draft MGT commercial insurance quotes from Claude. |

Each plugin's README covers its install, update, and data-handling details.

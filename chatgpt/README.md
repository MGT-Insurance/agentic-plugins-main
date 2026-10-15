# MGT Insurance plugins for ChatGPT

This repository publishes MGT Insurance's ChatGPT plugins. Each plugin lives in its own folder under `chatgpt/`.

| Plugin | Description |
|---|---|
| [`mgt-quoting`](chatgpt/mgt-quoting) | For insurance agents: quote MGT small-business commercial insurance from ChatGPT. |

## The ZIP

Each [release](https://github.com/MGT-Insurance/chatgpt-plugins/releases) publishes `mgt-quoting.zip`, the upload package for `chatgpt/mgt-quoting`. It holds the contents of that folder, with `.codex-plugin/plugin.json` (the manifest) and `.mcp.json` (the MCP server and sign-in settings) at the ZIP root. A workflow in this repository builds the ZIP and creates a release for each new plugin `version`, so don't edit the ZIP by hand.

## Upload the plugin

1. Download the [latest `mgt-quoting.zip`](https://github.com/MGT-Insurance/chatgpt-plugins/releases/latest/download/mgt-quoting.zip).
2. In OpenAI's plugin portal, choose **Plugins** > **Upload new or existing plugin**.
3. Upload the ZIP and follow the portal's checks.

## Sign-in

The plugin signs in with an MGT Auth0 app through a loopback callback, `http://127.0.0.1:14551/callback`, which is set in `.mcp.json` (`callback_port` and `callback_url`). The Auth0 client in `.mcp.json` must list that URL in its allowed callback URLs, or sign-in fails. The client secret is not in this repository: enter it in OpenAI's plugin portal when you upload the ZIP.

<!-- main-only:start -->
The main plugin signs in with the dev "Mithril MCP (external testers)" Auth0 client, a public client that has no secret, so leave the portal's client secret empty for the main ZIP. The main ZIP isn't released: download `mgt-quoting-main.zip` from the **plugin-checks** workflow run's artifacts instead of the production release above.
<!-- main-only:end -->

## Important limits

- Results can be wrong.
- A licensed person reviews every quote.
- Binding happens in Shadowfax, MGT's agent portal, never in ChatGPT.

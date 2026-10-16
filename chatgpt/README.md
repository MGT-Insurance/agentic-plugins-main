# MGT Insurance plugins for ChatGPT

This repository publishes MGT Insurance's ChatGPT plugins. Each plugin lives in its own folder under `chatgpt/`.

| Plugin | Description |
|---|---|
| [`mgt-quoting`](chatgpt/mgt-quoting) | For insurance agents: quote MGT small-business commercial insurance from ChatGPT. |

## The two ZIPs

OpenAI expects a different manifest layout for each way you add a plugin, so each [release](https://github.com/MGT-Insurance/chatgpt-plugins/releases) publishes two ZIPs built from the same `chatgpt/mgt-quoting` folder:

| ZIP | Use it for | Manifests at the ZIP root |
|---|---|---|
| `mgt-quoting-upload.zip` | OpenAI's plugin portal | `plugin.json` and `mcp.json` |
| `mgt-quoting-desktop.zip` | ChatGPT desktop | `.codex-plugin/plugin.json` and `.mcp.json` |

Both ZIPs also contain the same `skills/` and `assets/` folders. A workflow in this repository builds the ZIPs and creates a release for each new plugin `version`, so don't edit a ZIP by hand. The build fails if the two manifest sets disagree on the plugin name, version, description, author, display text, MCP server URL, or scopes, so the ZIPs can't drift apart.

## Upload the plugin to the portal

1. Download the [latest `mgt-quoting-upload.zip`](https://github.com/MGT-Insurance/chatgpt-plugins/releases/latest/download/mgt-quoting-upload.zip).
2. In OpenAI's plugin portal, choose **Plugins** > **Upload new or existing plugin**.
3. Upload the ZIP and follow the portal's checks.
4. When the portal asks for the OAuth client secret, enter the secret for the MGT "ChatGPT directory" Auth0 app.

The upload ZIP signs in with the Auth0 app whose `clientId` is set in `mcp.json`. The client secret is not in this repository.

## Install the plugin in ChatGPT desktop

The desktop ZIP is for MGT internal testers only for now.

1. Download the [latest `mgt-quoting-desktop.zip`](https://github.com/MGT-Insurance/chatgpt-plugins/releases/latest/download/mgt-quoting-desktop.zip).
2. Install the ZIP in ChatGPT desktop.
3. Sign in when ChatGPT prompts you.

The desktop ZIP signs in with the MGT external-testers Auth0 app, a public client that has no secret, so you don't enter a secret. The sign-in redirects to the loopback address `http://127.0.0.1:14551/callback`, so keep port 14551 free on your machine during sign-in.

<!-- main-only:start -->
## Main environment notes

The main ZIPs are not released. Download `mgt-quoting-main-upload.zip` and `mgt-quoting-main-desktop.zip` from the **plugin-checks** workflow run's artifacts instead of the production release above.

- The main desktop ZIP signs in with the dev "Mithril MCP (external testers)" Auth0 client. That client is public, so there is no secret.
- The main upload ZIP signs in with the dev "ChatGPT directory" Auth0 client. Enter that client's secret in the portal when you upload it.
<!-- main-only:end -->

## Important limits

- Results can be wrong.
- A licensed person reviews every quote.
- Binding happens in Shadowfax, MGT's agent portal, never in ChatGPT.

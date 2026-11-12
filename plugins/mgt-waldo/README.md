# MGT Waldo

MGT Waldo is for MGT employees. With it, Claude remembers things for you across conversations, searches and reads the documents in your own Waldo library, and answers questions from MGT's shared knowledge.

## What Claude can do

- **Answer from MGT knowledge** (`ask_waldo`): questions about MGT guidance, products and how we work, answered from the knowledge your team and the company can read.
- **Remember for you** (`memory_save`, `memory_update`, `memory_forget`, `memory_verify`): short facts about your work that Claude keeps between conversations.
- **Search and read your documents** (`memory_search`, `memory_fetch`): the GitHub repositories, Google Drive folder and files you connected to your library at `https://main.mgtinsurance.ai/waldo/memory/documents/connections`. Memories and documents share one search.
- **Keep pages for you** (`memory_page_write`, `memory_page_remove`): Markdown pages Claude writes in your library. A change to a page synced from GitHub or Drive becomes a proposal, and Claude never edits your repository or Drive.
- **Teach Waldo** (`add_knowledge`, `get_knowledge_drop`, `withdraw_knowledge_drop`): submit something MGT should know for review, check on it, or withdraw it.

You don't need to name a tool. Ask about "my notes", "my documents" or "what do we know about…", and Claude picks the right one. If a tool isn't listed after you sign in, it isn't turned on for your account yet.

## Who can use it

MGT employees signed in with their MGT account. Your library has one reader, you: a teammate who signs in reaches only their own memories and documents. Accounts outside MGT can't use it.

## Install in Claude on the web or Claude Desktop

1. Go to **Customize** > **Plugins**.
2. Click **Add** > **Add marketplace** and enter `MGT-Insurance/agentic-plugins-main`, or find **MGT Waldo** under your organization's plugins.
3. Install **MGT Waldo**.
4. Open the plugin's **Connectors** tab, connect `mgt-waldo-main`, and sign in with your MGT account.

Installing the plugin doesn't sign you in. You sign in once, on the **Connectors** tab. On a Team or Enterprise plan, an Owner might need to add the connector for your organization before you can connect.

Start a new chat after you connect, so Claude sees the tools.

## Install in Claude Code

In Claude Code, run:

```text
/plugin install mgt-waldo --marketplace MGT-Insurance/agentic-plugins-main
```

Or run these two commands:

```bash
claude plugin marketplace add MGT-Insurance/agentic-plugins-main
claude plugin install mgt-waldo@mgt-insurance-main
```

When you first use a Waldo tool, Claude opens a browser window so you can sign in with your MGT account.

## Update in Claude Code

Auto-update is off by default for third-party marketplaces. To get a new version, run:

```bash
claude plugin update mgt-waldo@mgt-insurance-main
```

You can also turn on auto-update in `/plugin` under **Marketplaces**.

## Where your data goes

When you use this plugin, what you ask Claude to remember, the pages it writes for you and your questions go to MGT Insurance's Waldo service through the MGT MCP server at `https://mcp-main.mgtinsurance.ai`. Waldo stores your memories and library in MGT's systems, readable only by you. To search and answer, Waldo sends question and document text to the AI model providers MGT uses. Don't ask Claude to remember passwords, keys or customer data your work doesn't need.

## Support and license

This plugin is released under the [MIT License](LICENSE).

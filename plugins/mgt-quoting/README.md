# MGT Quoting

MGT Quoting is for insurance agents who quote small-business commercial insurance with MGT Insurance. Claude checks whether MGT writes a business, picks the right classification, and creates and edits quotes for MGT products such as Business Owner Policy, specialty general liability, specialty property, and farm.

## Important limits

- **Results can be wrong.** Claude is an AI model. Classifications, field values, and summaries can contain mistakes.
- **Binding happens in MGT's portal, not in Claude.** This plugin never binds coverage.
- **All information is reviewed by licensed MGT underwriters.**

## Who can use it

Accounts that can quote on the MGT platform. If you can't see the quoting tools after you sign in, ask your MGT contact to check your access.

## Install in Claude on the web or Claude Desktop

1. Go to **Customize** > **Plugins**.
2. Find **MGT Quoting** under **Discover**. To install from this repository instead, click **Add** > **Add marketplace** and enter `MGT-Insurance/agentic-plugins-main`.
3. Install **MGT Quoting**.
4. Open the plugin's **Connectors** tab, connect `mgt-quoting-main`, and sign in with your MGT account.

Installing the plugin doesn't sign you in. You sign in once, on the **Connectors** tab. On a Team or Enterprise plan, an Owner might need to add the connector for your organization before you can connect.

## Install in Claude Code

In Claude Code, run:

```text
/plugin install mgt-quoting --marketplace MGT-Insurance/agentic-plugins-main
```

Or run these two commands:

```bash
claude plugin marketplace add MGT-Insurance/agentic-plugins-main
claude plugin install mgt-quoting@mgt-insurance-main
```

When you first use a quoting tool, Claude opens a browser window so you can sign in with your MGT account.

## Update in Claude Code

Auto-update is off by default for third-party marketplaces. To get a new version, run:

```bash
claude plugin update mgt-quoting@mgt-insurance-main
```

You can also turn on auto-update in `/plugin` under **Marketplaces**.

## If you also install the directory listing in Claude Code

After you add MGT Quoting from the Claude directory, uninstall the marketplace copy. An installed marketplace copy takes priority over the directory copy of the same name.

```bash
claude plugin uninstall mgt-quoting@mgt-insurance-main
```

## More than one agency

If your account belongs to several agencies, you don't choose one when you sign in. The first time Claude writes a quote, it asks which agency the quote belongs to.

## Where your data goes

When you use this plugin, the details you give Claude about a quote go to MGT Insurance's systems through the MGT MCP server at `https://mcp-main.mgtinsurance.ai`. That includes the business name and address, description of operations, classification codes, coverage choices, effective date, and your account email so MGT can attribute the quote to you. MGT stores the quotes you create. Don't give Claude data that a quote doesn't need.

## Support and license

Support, privacy, and terms links are listed on the plugin's directory page. This plugin is released under the [MIT License](LICENSE).

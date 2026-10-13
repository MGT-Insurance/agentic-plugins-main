# MGT Quoting

MGT Quoting lets Claude draft commercial insurance quotes with MGT Insurance. Claude checks whether MGT writes a business, picks the right classification, and creates and edits draft quotes for MGT products such as Business Owner Policy, specialty general liability, specialty property, and farm.

## Important limits

- **Claude drafts, and results can be wrong.** Claude is an AI model. Classifications, field values, and summaries can contain mistakes.
- **A licensed person reviews every quote.** Treat each quote as a draft until a licensed person at your agency has checked it.
- **Binding happens in Shadowfax, not in Claude.** Shadowfax is MGT's agent portal. This plugin never binds coverage.

## Who can use it

Accounts outside MGT that hold the `quote:create` access granted by MGT. If you can't see the quoting tools after you sign in, ask your MGT contact to check your access.

## Install

In Claude Code, run:

```text
/plugin install mgt-quoting --marketplace MGT-Insurance/claude-plugins-main
```

Or run these two commands:

```bash
claude plugin marketplace add MGT-Insurance/claude-plugins-main
claude plugin install mgt-quoting@mgt-insurance-main
```

When you first use a quoting tool, Claude opens a browser window so you can sign in with your MGT account.

## Update

Auto-update is off by default for third-party marketplaces. To get a new version, run:

```bash
claude plugin update mgt-quoting@mgt-insurance-main
```

You can also turn on auto-update in `/plugin` under **Marketplaces**.

## If you also install the directory listing

After you add MGT Quoting from the Claude directory, uninstall the marketplace copy. An installed marketplace copy takes priority over the directory copy of the same name.

```bash
claude plugin uninstall mgt-quoting@mgt-insurance-main
```

## More than one agency

If your account belongs to several agencies, you don't choose one when you sign in. The first time Claude writes a quote, it asks which agency the quote belongs to.

## Where your data goes

When you use this plugin, the details you give Claude about a quote go to MGT Insurance's systems through the MGT MCP server at `https://mcp-main.mgtinsurance.ai`. That includes the business name and address, description of operations, classification codes, coverage choices, effective date, and your account email so MGT can attribute the quote to you. MGT stores the draft quotes you create. Don't give Claude data that a quote doesn't need.

## Support and license

Support, privacy, and terms links are listed on the plugin's directory page. This plugin is released under the [MIT License](LICENSE).

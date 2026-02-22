# Story 13: MCP Support

**Phase:** 4 — Architecture Upgrades
**Priority:** Medium | **Effort:** Large

## Problem

The agent's capabilities are limited to its 6 built-in tools. Users can't connect it to databases, APIs, browsers, or other external services without modifying the core codebase.

## Solution

Implement a Model Context Protocol (MCP) client so users can plug in external tool servers.

## Requirements

- Support MCP stdio transport (spawn a local process)
- Support MCP SSE transport (connect to a remote server)
- Read MCP server config from a `.mcp.json` file in the project root
- Dynamically register MCP tools alongside built-in tools
- MCP tools go through the same approval flow as built-in dangerous tools
- Handle MCP server lifecycle (start on agent init, stop on exit)

## Technical Notes

- Use the `@modelcontextprotocol/sdk` package
- MCP tools have JSON Schema inputs — convert to Zod schemas or use raw JSON Schema validation
- MCP servers can also provide resources and prompts — start with tools only
- The tool registry (`Map<string, ToolDefinition>`) can accommodate MCP tools with a wrapper

## Files to Modify

- `src/mcp/` — new directory: client, transport, tool adapter
- `src/tools/registry.ts` — support dynamic tool registration from MCP
- `src/index.tsx` — initialize MCP clients on startup
- `.mcp.json` — new config file (user-created)

## Acceptance Criteria

- [ ] MCP servers defined in `.mcp.json` are connected on startup
- [ ] MCP tools appear in the tool registry and are available to the model
- [ ] MCP tool calls go through the approval flow
- [ ] MCP servers are shut down cleanly on exit
- [ ] Works with at least one real MCP server (e.g., filesystem, sqlite)

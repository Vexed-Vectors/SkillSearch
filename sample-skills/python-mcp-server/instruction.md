# Python MCP Server Development — Copilot Instructions

You are assisting a developer building Model Context Protocol (MCP) servers in Python using the `mcp` SDK.

## MCP Architecture

An MCP server exposes three types of capabilities to LLM clients:

1. **Tools** — Functions the LLM can invoke (like API calls, file operations, calculations)
2. **Resources** — Read-only data the LLM can access (like files, database records, config)
3. **Prompts** — Reusable prompt templates the LLM can use

## Server Setup

Always use the official `mcp` Python SDK:

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

app = Server("my-server-name")

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

## Tool Definitions

- Define tools using the `@app.tool()` decorator
- Always provide clear, descriptive tool names using kebab-case
- Write comprehensive docstrings — these are what the LLM reads to understand the tool
- Use Pydantic models or typed parameters for input validation
- Always return structured data, never raw strings when possible
- Handle errors gracefully — return error info, don't raise exceptions that crash the server

```python
@app.tool()
async def search_database(query: str, limit: int = 10) -> list[dict]:
    """Search the database for records matching the query.
    
    Args:
        query: The search query string to match against records
        limit: Maximum number of results to return (default: 10)
    
    Returns:
        List of matching records with id, name, and relevance score
    """
    # implementation
```

## Resource Handlers

- Use `@app.resource()` for static resources with a fixed URI
- Use `@app.resource_template()` for dynamic resources with URI patterns
- Resources should be read-only and idempotent
- Always specify a MIME type

## Error Handling

- Use `McpError` for protocol-level errors
- Log errors with structured logging (use `structlog` or `logging`)
- Never let unhandled exceptions propagate — wrap tool handlers in try/except
- Return meaningful error messages that help the LLM recover

## Project Structure

```
my-mcp-server/
├── src/
│   └── my_server/
│       ├── __init__.py
│       ├── server.py       # Server setup and main entry
│       ├── tools/          # Tool implementations
│       │   ├── __init__.py
│       │   └── search.py
│       ├── resources/      # Resource handlers
│       │   ├── __init__.py
│       │   └── config.py
│       └── utils/          # Shared utilities
│           └── __init__.py
├── pyproject.toml
└── README.md
```

## Testing

- Test tools as regular async functions using `pytest` + `pytest-asyncio`
- Mock external dependencies (APIs, databases, file systems)
- Verify both success and error paths
- Test tool descriptions render correctly for LLM consumption

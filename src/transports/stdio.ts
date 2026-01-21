import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export async function startStdioServer(server: McpServer) {
  const transport = new StdioServerTransport();
  
  try {
    console.error("Starting MCP server in stdio mode...");
    await server.connect(transport);
    console.error("MCP Server connected and ready to accept commands from Claude");
  } catch (err) {
    console.error(`Failed to start MCP server: ${err}`);
    process.exit(1);
  }
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.error('Shutting down stdio server...');
    process.exit(0);
  });
}

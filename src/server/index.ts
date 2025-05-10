import express from 'express';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { PORT, MODE } from '../config/env.js';
import { TransportManager } from './transport.js';
import { setupRoutes } from './routes.js';

/**
 * Function to start the HTTP server
 */
export async function startHttpServer(server: Server): Promise<void> {
  // Set up Express application and HTTP server
  const app = express();
  app.use(express.json());

  // Initialize transport manager
  const transportManager = new TransportManager(server);

  // Set up routes
  setupRoutes(app, transportManager);

  // Start server
  app.listen(PORT, () => {
    console.log(`Slack MCP Server running on HTTP at port ${PORT}`);
  });
}

/**
 * Function to start the Stdio server
 */
export async function startStdioServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Slack MCP Server running on stdio');
}

/**
 * Function to start server based on environment settings
 */
export async function startServer(server: Server): Promise<void> {
  // When environment variable MODE=stdio, start in stdio mode
  if (MODE === 'stdio') {
    await startStdioServer(server);
  } else {
    await startHttpServer(server);
  }
}

import express from 'express';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { TransportManager } from './transport.js';

/**
 * Function to set up Express routes
 */
export function setupRoutes(
  app: express.Application,
  transportManager: TransportManager
): void {
  // POST request handler (client to server communication)
  app.post('/mcp', async (req, res) => {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transportManager.getTransport(sessionId)) {
      // Reuse existing transport
      const transport = transportManager.getTransport(sessionId)!;
      await transport.handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New initialization request
      const transport = await transportManager.createTransport();
      await transport.handleRequest(req, res, req.body);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
    }
  });

  // Common handler for GET/DELETE requests
  const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transportManager.getTransport(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transportManager.getTransport(sessionId)!;
    await transport.handleRequest(req, res);
  };

  // GET request handler (server to client notification via SSE)
  app.get('/mcp', handleSessionRequest);

  // DELETE request handler (session termination)
  app.delete('/mcp', handleSessionRequest);
}

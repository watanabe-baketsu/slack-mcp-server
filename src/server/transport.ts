import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * Transport Manager Class
 * Manages transports for each session ID
 */
export class TransportManager {
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } =
    {};
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Get the transport corresponding to the specified session ID
   */
  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    return this.transports[sessionId];
  }

  /**
   * Create a new transport
   */
  async createTransport(): Promise<StreamableHTTPServerTransport> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store transport by session ID
        this.transports[sessionId] = transport;
      },
    });

    // Clean up when closing
    transport.onclose = () => {
      if (transport.sessionId) {
        delete this.transports[transport.sessionId];
      }
    };

    // Connect to server
    await this.server.connect(transport);

    return transport;
  }

  /**
   * Remove the transport corresponding to a specific session ID
   */
  removeTransport(sessionId: string): void {
    if (this.transports[sessionId]) {
      delete this.transports[sessionId];
    }
  }
}

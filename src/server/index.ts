import express from 'express';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { PORT, MODE } from '../config/env.js';
import { TransportManager } from './transport.js';
import { setupRoutes } from './routes.js';

/**
 * HTTPサーバーを起動する関数
 */
export async function startHttpServer(server: Server): Promise<void> {
  // ExpressアプリケーションとHTTPサーバーのセットアップ
  const app = express();
  app.use(express.json());

  // トランスポートマネージャーの初期化
  const transportManager = new TransportManager(server);

  // ルートの設定
  setupRoutes(app, transportManager);

  // サーバーを起動
  app.listen(PORT, () => {
    console.log(`Slack MCP Server running on HTTP at port ${PORT}`);
  });
}

/**
 * Stdioサーバーを起動する関数
 */
export async function startStdioServer(server: Server): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Slack MCP Server running on stdio');
}

/**
 * 環境設定に応じたサーバーを起動する関数
 */
export async function startServer(server: Server): Promise<void> {
  // 環境変数MODE=stdioの場合、stdioモードで起動
  if (MODE === 'stdio') {
    await startStdioServer(server);
  } else {
    await startHttpServer(server);
  }
} 
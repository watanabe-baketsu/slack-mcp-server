import express from 'express';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { TransportManager } from './transport.js';

/**
 * Expressルートを設定する関数
 */
export function setupRoutes(
  app: express.Application,
  transportManager: TransportManager
): void {
  // POSTリクエスト（クライアントからサーバーへの通信）のハンドラー
  app.post('/mcp', async (req, res) => {
    // 既存のセッションIDの確認
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (sessionId && transportManager.getTransport(sessionId)) {
      // 既存のトランスポートを再利用
      const transport = transportManager.getTransport(sessionId)!;
      await transport.handleRequest(req, res, req.body);
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // 新しい初期化リクエスト
      const transport = await transportManager.createTransport();
      await transport.handleRequest(req, res, req.body);
    } else {
      // 無効なリクエスト
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

  // GET/DELETEリクエスト用の共通ハンドラー
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

  // GETリクエスト（SSEを通じたサーバーからクライアントへの通知）のハンドラー
  app.get('/mcp', handleSessionRequest);

  // DELETEリクエスト（セッション終了）のハンドラー
  app.delete('/mcp', handleSessionRequest);
}

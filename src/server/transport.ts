import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

/**
 * トランスポートマネージャークラス
 * セッションID毎のトランスポートを管理します
 */
export class TransportManager {
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } =
    {};
  private server: Server;

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * 指定されたセッションIDに対応するトランスポートを取得
   */
  getTransport(sessionId: string): StreamableHTTPServerTransport | undefined {
    return this.transports[sessionId];
  }

  /**
   * 新しいトランスポートを作成
   */
  async createTransport(): Promise<StreamableHTTPServerTransport> {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // セッションIDでトランスポートを保存
        this.transports[sessionId] = transport;
      },
    });

    // 閉じる時のクリーンアップ
    transport.onclose = () => {
      if (transport.sessionId) {
        delete this.transports[transport.sessionId];
      }
    };

    // サーバーに接続
    await this.server.connect(transport);

    return transport;
  }

  /**
   * 特定のセッションIDに対応するトランスポートを削除
   */
  removeTransport(sessionId: string): void {
    if (this.transports[sessionId]) {
      delete this.transports[sessionId];
    }
  }
}

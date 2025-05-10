import { userClient } from '../config/slack-client.js';
import { ListChannelsRequestSchema, ListChannelsResponseSchema } from '../schemas.js';
import { GetUserChannelsRequestSchema, GetUserChannelsResponseSchema } from '../schemas.js';

/**
 * チャンネル一覧を取得するハンドラー
 */
export async function listChannelsHandler(args: unknown) {
  const parsedArgs = ListChannelsRequestSchema.parse(args);
  const response = await userClient.conversations.list({
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
    types: 'public_channel,private_channel', // プライベートチャンネルも含める
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list channels: ${response.error}`);
  }
  
  const parsed = ListChannelsResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
}

/**
 * ユーザーが参加しているチャンネル一覧を取得するハンドラー
 */
export async function getUserChannelsHandler(args: unknown) {
  const parsedArgs = GetUserChannelsRequestSchema.parse(args);
  
  // userClientを使用してユーザーが参加している全てのチャンネルを取得
  const response = await userClient.users.conversations({
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user channels: ${response.error}`);
  }
  
  const parsed = GetUserChannelsResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
} 
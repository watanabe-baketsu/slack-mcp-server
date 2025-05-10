import { userClient } from '../config/slack-client.js';
import {
  ListFilesInChannelRequestSchema,
  GetFileInfoRequestSchema,
  SummarizeChannelFilesRequestSchema,
  ListFilesResponseSchema
} from '../schemas.js';

/**
 * チャンネル内のファイル一覧を取得するハンドラー
 */
export async function listFilesInChannelHandler(args: unknown) {
  const parsedArgs = ListFilesInChannelRequestSchema.parse(args);
  
  // チャンネル内のファイルリストを取得
  const response = await userClient.files.list({
    channel: parsedArgs.channel_id,
    count: parsedArgs.limit,
    page: parsedArgs.cursor ? parseInt(parsedArgs.cursor) : 1,
    types: parsedArgs.types,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list files in channel: ${response.error}`);
  }
  
  const parsed = ListFilesResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
}

/**
 * ファイル情報を取得するハンドラー
 */
export async function getFileInfoHandler(args: unknown) {
  const parsedArgs = GetFileInfoRequestSchema.parse(args);
  
  // 特定のファイルの情報を取得
  const response = await userClient.files.info({
    file: parsedArgs.file_id,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get file info: ${response.error}`);
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify(response) }],
  };
}

/**
 * チャンネル内のファイルを要約するハンドラー
 */
export async function summarizeChannelFilesHandler(args: unknown) {
  const parsedArgs = SummarizeChannelFilesRequestSchema.parse(args);
  
  // 1. ユーザーが参加している全てのチャンネルを取得
  const channelsResponse = await userClient.users.conversations({
    types: parsedArgs.include_private ? 'public_channel,private_channel' : 'public_channel',
    exclude_archived: true,
    limit: 200, // 最大数を取得
  });
  
  if (!channelsResponse.ok) {
    throw new Error(`Failed to get user channels: ${channelsResponse.error}`);
  }
  
  if (!channelsResponse.channels || channelsResponse.channels.length === 0) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ 
        ok: true,
        message: 'No channels found',
        channel_summaries: []
      }) }],
    };
  }
  
  const channelSummaries = [];
  
  // 2. 各チャンネルでファイルを取得して内容をまとめる
  for (const channel of channelsResponse.channels) {
    try {
      // チャンネル内のファイルリストを取得
      const filesResponse = await userClient.files.list({
        channel: channel.id,
        count: parsedArgs.max_files_per_channel,
        types: parsedArgs.file_types || undefined,
      });
      
      if (!filesResponse.ok || !filesResponse.files || filesResponse.files.length === 0) {
        continue; // このチャンネルはスキップ
      }
      
      const files = filesResponse.files.map(file => ({
        id: file.id,
        name: file.name || 'Unnamed File',
        title: file.title || '',
        type: file.filetype || file.mimetype || 'unknown',
        size: file.size || 0,
        created: file.created || file.timestamp || 0,
        url: file.url_private || '',
        is_editable: file.editable || false,
        user: file.user || '',
      }));
      
      if (files.length > 0) {
        channelSummaries.push({
          channel_name: channel.name,
          channel_id: channel.id,
          is_private: channel.is_private,
          files: files,
        });
      }
    } catch (error) {
      console.error(`Error processing channel ${channel.id}:`, error);
    }
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify({ 
      ok: true,
      channel_summaries: channelSummaries,
    }) }],
  };
} 
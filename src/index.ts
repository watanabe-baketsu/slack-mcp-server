#!/usr/bin/env node

import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import { z } from 'zod';
import express from 'express';
import { randomUUID } from 'node:crypto';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  ListChannelsRequestSchema,
  PostMessageRequestSchema,
  ReplyToThreadRequestSchema,
  AddReactionRequestSchema,
  GetChannelHistoryRequestSchema,
  GetThreadRepliesRequestSchema,
  GetUsersRequestSchema,
  GetUserProfileRequestSchema,
  ListChannelsResponseSchema,
  GetUsersResponseSchema,
  GetUserProfileResponseSchema,
  SearchMessagesRequestSchema,
  SearchMessagesResponseSchema,
  ConversationsHistoryResponseSchema,
  ConversationsRepliesResponseSchema,
  SearchMentionsRequestSchema,
  GetCurrentUserResponseSchema,
  GetUserChannelsRequestSchema,
  GetUserChannelsResponseSchema,
  ListFilesInChannelRequestSchema,
  ListFilesResponseSchema,
  GetFileInfoRequestSchema,
  SummarizeChannelFilesRequestSchema,
  ListChannelCanvasesRequestSchema,
  GetCanvasContentRequestSchema,
  SummarizeUserCanvasesRequestSchema,
} from './schemas.js';

dotenv.config();

if (!process.env.SLACK_BOT_TOKEN) {
  console.error(
    'SLACK_BOT_TOKEN is not set. Please set it in your environment or .env file.'
  );
  process.exit(1);
}

if (!process.env.SLACK_USER_TOKEN) {
  console.error(
    'SLACK_USER_TOKEN is not set. Please set it in your environment or .env file.'
  );
  process.exit(1);
}

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);
const userClient = new WebClient(process.env.SLACK_USER_TOKEN);

const server = new Server(
  {
    name: 'slack-mcp-server',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'slack_list_channels',
        description: 'List public channels in the workspace with pagination',
        inputSchema: zodToJsonSchema(ListChannelsRequestSchema),
      },
      {
        name: 'slack_post_message',
        description: 'Post a new message to a Slack channel',
        inputSchema: zodToJsonSchema(PostMessageRequestSchema),
      },
      {
        name: 'slack_reply_to_thread',
        description: 'Reply to a specific message thread in Slack',
        inputSchema: zodToJsonSchema(ReplyToThreadRequestSchema),
      },
      {
        name: 'slack_add_reaction',
        description: 'Add a reaction emoji to a message',
        inputSchema: zodToJsonSchema(AddReactionRequestSchema),
      },
      {
        name: 'slack_get_channel_history',
        description: 'Get recent messages from a channel',
        inputSchema: zodToJsonSchema(GetChannelHistoryRequestSchema),
      },
      {
        name: 'slack_get_thread_replies',
        description: 'Get all replies in a message thread',
        inputSchema: zodToJsonSchema(GetThreadRepliesRequestSchema),
      },
      {
        name: 'slack_get_users',
        description:
          'Retrieve basic profile information of all users in the workspace',
        inputSchema: zodToJsonSchema(GetUsersRequestSchema),
      },
      {
        name: 'slack_get_user_profile',
        description: "Get a user's profile information",
        inputSchema: zodToJsonSchema(GetUserProfileRequestSchema),
      },
      {
        name: 'slack_search_messages',
        description: 'Search for messages in the workspace',
        inputSchema: zodToJsonSchema(SearchMessagesRequestSchema),
      },
      {
        name: 'slack_search_mentions',
        description: 'Search for messages that mention a specific user',
        inputSchema: zodToJsonSchema(SearchMentionsRequestSchema),
      },
      {
        name: 'slack_get_current_user',
        description: 'Get information about the current user associated with the token',
        inputSchema: zodToJsonSchema(z.object({})),
      },
      {
        name: 'slack_get_user_channels',
        description: 'Get all channels (including private) the user is a member of',
        inputSchema: zodToJsonSchema(GetUserChannelsRequestSchema),
      },
      {
        name: 'slack_list_files_in_channel',
        description: 'Get list of files in a channel',
        inputSchema: zodToJsonSchema(ListFilesInChannelRequestSchema),
      },
      {
        name: 'slack_get_file_info',
        description: 'Get information about a specific file',
        inputSchema: zodToJsonSchema(GetFileInfoRequestSchema),
      },
      {
        name: 'slack_summarize_channel_files',
        description: 'Summarize files from all channels the user is a member of',
        inputSchema: zodToJsonSchema(SummarizeChannelFilesRequestSchema),
      },
      {
        name: 'slack_list_channel_canvases',
        description: 'Get list of canvases in a channel',
        inputSchema: zodToJsonSchema(ListChannelCanvasesRequestSchema),
      },
      {
        name: 'slack_get_canvas_content',
        description: 'Get the content of a specific canvas',
        inputSchema: zodToJsonSchema(GetCanvasContentRequestSchema),
      },
      {
        name: 'slack_summarize_user_canvases',
        description: 'Summarize canvases from all channels the user is a member of',
        inputSchema: zodToJsonSchema(SummarizeUserCanvasesRequestSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params) {
      throw new Error('Params are required');
    }
    switch (request.params.name) {
      case 'slack_list_channels': {
        const args = ListChannelsRequestSchema.parse(request.params.arguments);
        const response = await userClient.conversations.list({
          limit: args.limit,
          cursor: args.cursor,
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

      case 'slack_post_message': {
        const args = PostMessageRequestSchema.parse(request.params.arguments);
        const response = await userClient.chat.postMessage({
          channel: args.channel_id,
          text: args.text,
        });
        if (!response.ok) {
          throw new Error(`Failed to post message: ${response.error}`);
        }
        return {
          content: [{ type: 'text', text: 'Message posted successfully' }],
        };
      }

      case 'slack_reply_to_thread': {
        const args = ReplyToThreadRequestSchema.parse(request.params.arguments);
        const response = await userClient.chat.postMessage({
          channel: args.channel_id,
          thread_ts: args.thread_ts,
          text: args.text,
        });
        if (!response.ok) {
          throw new Error(`Failed to reply to thread: ${response.error}`);
        }
        return {
          content: [
            { type: 'text', text: 'Reply sent to thread successfully' },
          ],
        };
      }
      case 'slack_add_reaction': {
        const args = AddReactionRequestSchema.parse(request.params.arguments);
        const response = await slackClient.reactions.add({
          channel: args.channel_id,
          timestamp: args.timestamp,
          name: args.reaction,
        });
        if (!response.ok) {
          throw new Error(`Failed to add reaction: ${response.error}`);
        }
        return {
          content: [{ type: 'text', text: 'Reaction added successfully' }],
        };
      }

      case 'slack_get_channel_history': {
        const args = GetChannelHistoryRequestSchema.parse(
          request.params.arguments
        );
        const response = await slackClient.conversations.history({
          channel: args.channel_id,
          limit: args.limit,
          cursor: args.cursor,
        });
        if (!response.ok) {
          throw new Error(`Failed to get channel history: ${response.error}`);
        }
        const parsedResponse =
          ConversationsHistoryResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsedResponse) }],
        };
      }

      case 'slack_get_thread_replies': {
        const args = GetThreadRepliesRequestSchema.parse(
          request.params.arguments
        );
        const response = await slackClient.conversations.replies({
          channel: args.channel_id,
          ts: args.thread_ts,
          limit: args.limit,
          cursor: args.cursor,
        });
        if (!response.ok) {
          throw new Error(`Failed to get thread replies: ${response.error}`);
        }
        const parsedResponse =
          ConversationsRepliesResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsedResponse) }],
        };
      }

      case 'slack_get_users': {
        const args = GetUsersRequestSchema.parse(request.params.arguments);
        const response = await slackClient.users.list({
          limit: args.limit,
          cursor: args.cursor,
        });
        if (!response.ok) {
          throw new Error(`Failed to get users: ${response.error}`);
        }
        const parsed = GetUsersResponseSchema.parse(response);

        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_get_user_profile': {
        const args = GetUserProfileRequestSchema.parse(
          request.params.arguments
        );
        const response = await slackClient.users.profile.get({
          user: args.user_id,
        });
        if (!response.ok) {
          throw new Error(`Failed to get user profile: ${response.error}`);
        }
        const parsed = GetUserProfileResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_search_messages': {
        const parsedParams = SearchMessagesRequestSchema.parse(
          request.params.arguments
        );

        let query = parsedParams.query;
        if (parsedParams.in_channel) {
          query += ` in:${parsedParams.in_channel}`;
        }
        if (parsedParams.in_group) {
          query += ` in:${parsedParams.in_group}`;
        }
        if (parsedParams.in_dm) {
          query += ` in:<@${parsedParams.in_dm}>`;
        }
        if (parsedParams.from_user) {
          query += ` from:<@${parsedParams.from_user}>`;
        }
        if (parsedParams.from_bot) {
          query += ` from:${parsedParams.from_bot}`;
        }

        const response = await userClient.search.messages({
          query: query,
          highlight: parsedParams.highlight,
          sort: parsedParams.sort,
          sort_dir: parsedParams.sort_dir,
          count: parsedParams.count,
          page: parsedParams.page,
        });

        if (!response.ok) {
          throw new Error(`Failed to search messages: ${response.error}`);
        }

        const parsed = SearchMessagesResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_search_mentions': {
        const args = SearchMentionsRequestSchema.parse(request.params.arguments);
        
        let query = `@${args.user_id}`;
        if (args.after) {
          query += ` after:${args.after}`;
        }
        if (args.before) {
          query += ` before:${args.before}`;
        }

        const response = await userClient.search.messages({
          query: query,
          count: args.limit,
          sort: 'timestamp',
          sort_dir: 'desc',
        });

        if (!response.ok) {
          throw new Error(`Failed to search mentions: ${response.error}`);
        }

        const parsed = SearchMessagesResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_get_current_user': {
        const response = await userClient.auth.test();
        if (!response.ok) {
          throw new Error(`Failed to get current user: ${response.error}`);
        }
        const parsed = GetCurrentUserResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_get_user_channels': {
        const args = GetUserChannelsRequestSchema.parse(request.params.arguments);
        // userClientを使用してユーザーが参加している全てのチャンネルを取得
        const response = await userClient.users.conversations({
          types: 'public_channel,private_channel',
          exclude_archived: true,
          limit: args.limit,
          cursor: args.cursor,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get user channels: ${response.error}`);
        }
        
        const parsed = GetUserChannelsResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_list_files_in_channel': {
        const args = ListFilesInChannelRequestSchema.parse(request.params.arguments);
        
        // チャンネル内のファイルリストを取得
        const response = await userClient.files.list({
          channel: args.channel_id,
          count: args.limit,
          page: args.cursor ? parseInt(args.cursor) : 1,
          types: args.types,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to list files in channel: ${response.error}`);
        }
        
        const parsed = ListFilesResponseSchema.parse(response);
        return {
          content: [{ type: 'text', text: JSON.stringify(parsed) }],
        };
      }

      case 'slack_get_file_info': {
        const args = GetFileInfoRequestSchema.parse(request.params.arguments);
        
        // 特定のファイルの情報を取得
        const response = await userClient.files.info({
          file: args.file_id,
        });
        
        if (!response.ok) {
          throw new Error(`Failed to get file info: ${response.error}`);
        }
        
        return {
          content: [{ type: 'text', text: JSON.stringify(response) }],
        };
      }

      case 'slack_summarize_channel_files': {
        const args = SummarizeChannelFilesRequestSchema.parse(request.params.arguments);
        
        // 1. ユーザーが参加している全てのチャンネルを取得
        const channelsResponse = await userClient.users.conversations({
          types: args.include_private ? 'public_channel,private_channel' : 'public_channel',
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
              count: args.max_files_per_channel,
              types: args.file_types || undefined,
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

      case 'slack_list_channel_canvases': {
        const args = ListChannelCanvasesRequestSchema.parse(request.params.arguments);
        
        try {
          // 方法1: conversations.canvases.list API（新しいAPI）を試す
          try {
            console.log(`Trying conversations.canvases.list for channel ${args.channel_id}`);
            const canvasResponse = await userClient.apiCall('conversations.canvases.list', {
              channel_id: args.channel_id,
              limit: args.limit || 100,
              cursor: args.cursor,
            });
            
            if (canvasResponse.ok) {
              console.log('Successfully retrieved canvases using conversations.canvases.list');
              return {
                content: [{ type: 'text', text: JSON.stringify(canvasResponse) }],
              };
            } else {
              console.warn(`conversations.canvases.list failed with error: ${canvasResponse.error}`);
            }
          } catch (apiError) {
            console.warn('Error using conversations.canvases.list:', apiError);
          }
          
          // 方法2: 通常のfiles.list APIを使用
          const filesResponse = await userClient.files.list({
            channel: args.channel_id,
            types: 'all', // すべてのタイプを取得し、後でフィルタリング
            count: args.limit || 100,
            page: args.cursor ? parseInt(args.cursor) : 1,
          });
          
          console.log('Method 2 response:', JSON.stringify(filesResponse));
          
          if (!filesResponse.ok) {
            throw new Error(`Failed to get channel files: ${filesResponse.error}`);
          }

          console.log(`Files found in channel ${args.channel_id}:`, 
            filesResponse.files ? filesResponse.files.length : 0);
          
          // ファイルタイプの一覧を表示（デバッグ用）
          if (filesResponse.files && filesResponse.files.length > 0) {
            console.log('File types:', filesResponse.files.map(f => ({ 
              id: f.id, 
              name: f.name, 
              type: f.filetype, 
              mode: f.mode,
              mimetype: f.mimetype
            })));
            
            // キャンバスのみをフィルタリング（複数の条件を試す）
            const canvasFiles = filesResponse.files.filter(file => {
              const isCanvas = 
                file.filetype === 'canvas' || 
                file.mode === 'canvas' ||
                file.pretty_type === 'canvas' ||
                file.filetype === 'quip' ||
                (file.mimetype && file.mimetype.includes('canvas')) ||
                (file.name && file.name.toLowerCase().includes('canvas'));
              
              if (isCanvas) {
                console.log('Found canvas:', file.id, file.name);
              }
              
              return isCanvas;
            });
            
            console.log(`Canvases found after filtering: ${canvasFiles.length}`);
            
            // フィルター後のファイル一覧を返す
            return {
              content: [{ 
                type: 'text', 
                text: JSON.stringify({
                  ok: true,
                  files: canvasFiles,
                  total: canvasFiles.length
                }) 
              }],
            };
          }
          
          // 方法3: 直接API呼び出しを試みる
          try {
            console.log(`Trying direct API call for files.list in channel ${args.channel_id}`);
            const directResponse = await userClient.apiCall('files.list', {
              channel: args.channel_id,
              count: 100,
            });
            
            console.log('Method 3 response:', JSON.stringify(directResponse));
            
            if (directResponse.ok && 'files' in directResponse && Array.isArray(directResponse.files)) {
              console.log(`Total files from direct API: ${directResponse.files.length}`);
              
              // ファイル情報のサンプルを表示
              if (directResponse.files.length > 0) {
                const fileSamples = directResponse.files.slice(0, 5).map((f: {
                  id: string;
                  name?: string;
                  title?: string;
                  filetype?: string;
                  mode?: string;
                  created?: number;
                  timestamp?: number;
                }) => ({
                  id: f.id,
                  name: f.name,
                  title: f.title,
                  filetype: f.filetype,
                  mode: f.mode,
                  created: f.created,
                  timestamp: f.timestamp
                }));
                console.log('File samples:', fileSamples);
              }
            }
          } catch (apiError) {
            console.warn('Error in direct API call:', apiError);
          }
          
          return {
            content: [{ type: 'text', text: JSON.stringify({ 
              ok: true,
              message: "No canvases found",
              files: []
            }) }],
          };
        } catch (error: Error | unknown) {
          console.error('Error getting canvases:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to get canvases: ${errorMessage}`);
        }
      }

      case 'slack_get_canvas_content': {
        const args = GetCanvasContentRequestSchema.parse(request.params.arguments);
        
        try {
          console.log(`Getting basic info for canvas ID: ${args.canvas_id}`);
          
          // 特定のキャンバスの基本情報を取得
          const response = await userClient.files.info({
            file: args.canvas_id,
          });
          
          if (!response.ok) {
            throw new Error(`Failed to get canvas info: ${response.error}`);
          }
          
          const file = response.file;
          if (!file) {
            throw new Error('Canvas file information not found');
          }
          
          // 基本情報のみを返す
          return {
            content: [{ type: 'text', text: JSON.stringify({
              ok: true,
              canvas: {
                id: file.id,
                title: file.title || file.name || 'Untitled Canvas',
                type: file.filetype || '',
                created_at: file.created || 0,
                updated_at: file.updated || file.timestamp || 0,
                created_by: file.user || '',
                url: file.url_private || '',
                permalink: file.permalink || '',
                mimetype: file.mimetype || '',
                size: file.size || 0,
                is_editable: file.editable || false,
                message: '注意: Slack APIの制限により、キャンバスの内容を直接取得することはできません。'
              }
            }) }],
          };
        } catch (error) {
          console.error('Error getting canvas info:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to get canvas info: ${errorMessage}`);
        }
      }

      case 'slack_summarize_user_canvases': {
        const args = SummarizeUserCanvasesRequestSchema.parse(request.params.arguments);
        
        try {
          // 1. ユーザーが参加している全てのチャンネルを取得
          const channelsResponse = await userClient.users.conversations({
            types: args.include_private ? 'public_channel,private_channel' : 'public_channel',
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
          
          // 2. 各チャンネルでキャンバスを取得して情報をまとめる
          for (const channel of channelsResponse.channels) {
            try {
              // チャンネル内のファイルリストを取得
              const filesResponse = await userClient.files.list({
                channel: channel.id,
                types: 'all', // すべてのタイプを取得
                count: args.max_canvases_per_channel || 20,
              });
              
              if (!filesResponse.ok || !filesResponse.files || filesResponse.files.length === 0) {
                continue; // このチャンネルはスキップ
              }
              
              // キャンバスのみをフィルタリング
              const canvasFiles = filesResponse.files.filter(file => 
                file.filetype === 'canvas' || 
                file.mode === 'canvas' ||
                file.pretty_type === 'canvas' ||
                file.filetype === 'quip'
              );
              
              if (canvasFiles.length === 0) {
                continue; // キャンバスがない場合はスキップ
              }
              
              // キャンバスの基本情報のみを収集（内容取得は行わない）
              const canvases = canvasFiles.map(canvas => ({
                id: canvas.id,
                title: canvas.title || canvas.name || 'Untitled Canvas',
                created: canvas.created || canvas.timestamp || 0,
                updated: canvas.updated || canvas.timestamp || canvas.created || 0,
                user_id: canvas.user || '',
                permalink: canvas.permalink || '',
                url: canvas.url_private || '',
              }));
              
              if (canvases.length > 0) {
                channelSummaries.push({
                  channel_name: channel.name,
                  channel_id: channel.id,
                  is_private: channel.is_private,
                  canvases: canvases,
                });
              }
            } catch (error: unknown) {
              console.error(`Error processing channel ${channel.id}:`, error);
            }
          }
          
          return {
            content: [{ type: 'text', text: JSON.stringify({ 
              ok: true,
              channel_summaries: channelSummaries,
            }) }],
          };
        } catch (error: unknown) {
          console.error('Error summarizing canvases:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          throw new Error(`Failed to summarize canvases: ${errorMessage}`);
        }
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    console.error('Error handling request:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(errorMessage);
  }
});

// ExpressアプリケーションとHTTPサーバーのセットアップ
const app = express();
app.use(express.json());

// セッションIDごとにトランスポートを保持するオブジェクト
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// POSTリクエスト（クライアントからサーバーへの通信）のハンドラー
app.post('/mcp', async (req, res) => {
  // 既存のセッションIDの確認
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // 既存のトランスポートを再利用
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // 新しい初期化リクエスト
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // セッションIDでトランスポートを保存
        transports[sessionId] = transport;
      }
    });

    // 閉じる時のクリーンアップ
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    
    // サーバーに接続
    await server.connect(transport);
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
    return;
  }

  // リクエストを処理
  await transport.handleRequest(req, res, req.body);
});

// GET/DELETEリクエスト用の共通ハンドラー
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// GETリクエスト（SSEを通じたサーバーからクライアントへの通知）のハンドラー
app.get('/mcp', handleSessionRequest);

// DELETEリクエスト（セッション終了）のハンドラー
app.delete('/mcp', handleSessionRequest);

// ポート設定（環境変数から取得、デフォルトは3000）
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// サーバーを起動
app.listen(PORT, () => {
  console.log(`Slack MCP Server running on HTTP at port ${PORT}`);
});

// Stdioモードでのサーバー起動（バックワードコンパティビリティのため）
async function runStdioServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Slack MCP Server running on stdio');
}

// 実行モードの判定と開始
// 環境変数MODE=stdioの場合、stdioモードで起動
if (process.env.MODE === 'stdio') {
  runStdioServer().catch((error) => {
    console.error('Fatal error in stdio mode:', error);
    process.exit(1);
  });
}

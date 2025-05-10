import * as channelsHandlers from './channels.js';
import * as messagesHandlers from './messages.js';
import * as usersHandlers from './users.js';
import * as filesHandlers from './files.js';
import * as canvasesHandlers from './canvases.js';

export {
  channelsHandlers,
  messagesHandlers,
  usersHandlers,
  filesHandlers,
  canvasesHandlers,
};

// ハンドラーの型定義
export type ToolHandler = (args: unknown) => Promise<{
  content: { type: string; text: string }[];
}>;

// ツール名とハンドラーの対応付け
export const handlers: Record<string, ToolHandler> = {
  // チャンネル関連
  'slack_list_channels': channelsHandlers.listChannelsHandler,
  'slack_get_user_channels': channelsHandlers.getUserChannelsHandler,
  
  // メッセージ関連
  'slack_post_message': messagesHandlers.postMessageHandler,
  'slack_reply_to_thread': messagesHandlers.replyToThreadHandler,
  'slack_add_reaction': messagesHandlers.addReactionHandler,
  'slack_get_channel_history': messagesHandlers.getChannelHistoryHandler,
  'slack_get_thread_replies': messagesHandlers.getThreadRepliesHandler,
  'slack_search_messages': messagesHandlers.searchMessagesHandler,
  'slack_search_mentions': messagesHandlers.searchMentionsHandler,
  
  // ユーザー関連
  'slack_get_users': usersHandlers.getUsersHandler,
  'slack_get_user_profile': usersHandlers.getUserProfileHandler,
  'slack_get_current_user': usersHandlers.getCurrentUserHandler,
  
  // ファイル関連
  'slack_list_files_in_channel': filesHandlers.listFilesInChannelHandler,
  'slack_get_file_info': filesHandlers.getFileInfoHandler,
  'slack_summarize_channel_files': filesHandlers.summarizeChannelFilesHandler,
  
  // キャンバス関連
  'slack_list_channel_canvases': canvasesHandlers.listChannelCanvasesHandler,
  'slack_get_canvas_content': canvasesHandlers.getCanvasContentHandler,
  'slack_summarize_user_canvases': canvasesHandlers.summarizeUserCanvasesHandler,
}; 
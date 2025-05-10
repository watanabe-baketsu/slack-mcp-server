import * as channelsHandlers from './channels.js';
import * as messagesHandlers from './messages.js';
import * as usersHandlers from './users.js';
import * as filesHandlers from './files.js';
import * as canvasesHandlers from './canvases.js';
import * as activityHandlers from './activity.js';

export {
  channelsHandlers,
  messagesHandlers,
  usersHandlers,
  filesHandlers,
  canvasesHandlers,
  activityHandlers,
};

// Handler type definition
export type ToolHandler = (args: unknown) => Promise<{
  content: { type: string; text: string }[];
}>;

// Mapping tool names to handlers
export const handlers: Record<string, ToolHandler> = {
  // Channel related
  slack_list_channels: channelsHandlers.listChannelsHandler,
  slack_get_user_channels: channelsHandlers.getUserChannelsHandler,

  // Message related
  slack_post_message: messagesHandlers.postMessageHandler,
  slack_reply_to_thread: messagesHandlers.replyToThreadHandler,
  slack_add_reaction: messagesHandlers.addReactionHandler,
  slack_get_channel_history: messagesHandlers.getChannelHistoryHandler,
  slack_get_thread_replies: messagesHandlers.getThreadRepliesHandler,
  slack_search_messages: messagesHandlers.searchMessagesHandler,
  slack_search_mentions: messagesHandlers.searchMentionsHandler,

  // User related
  slack_get_users: usersHandlers.getUsersHandler,
  slack_get_user_profile: usersHandlers.getUserProfileHandler,
  slack_get_current_user: usersHandlers.getCurrentUserHandler,

  // File related
  slack_list_files_in_channel: filesHandlers.listFilesInChannelHandler,
  slack_get_file_info: filesHandlers.getFileInfoHandler,
  slack_summarize_channel_files: filesHandlers.summarizeChannelFilesHandler,

  // Canvas related
  slack_list_channel_canvases: canvasesHandlers.listChannelCanvasesHandler,
  slack_get_canvas_content: canvasesHandlers.getCanvasContentHandler,
  slack_summarize_user_canvases: canvasesHandlers.summarizeUserCanvasesHandler,

  // Activity related
  slack_get_user_channel_activity:
    activityHandlers.getUserChannelActivityHandler,
};

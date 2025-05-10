import { slackClient, userClient } from '../config/slack-client.js';
import {
  PostMessageRequestSchema,
  ReplyToThreadRequestSchema,
  AddReactionRequestSchema,
  GetChannelHistoryRequestSchema,
  GetThreadRepliesRequestSchema,
  SearchMessagesRequestSchema,
  SearchMentionsRequestSchema,
  ConversationsHistoryResponseSchema,
  ConversationsRepliesResponseSchema,
  SearchMessagesResponseSchema,
} from '../schemas.js';

/**
 * Handler for posting a message
 */
export async function postMessageHandler(args: unknown) {
  const parsedArgs = PostMessageRequestSchema.parse(args);
  const response = await userClient.chat.postMessage({
    channel: parsedArgs.channel_id,
    text: parsedArgs.text,
  });

  if (!response.ok) {
    throw new Error(`Failed to post message: ${response.error}`);
  }

  return {
    content: [{ type: 'text', text: 'Message posted successfully' }],
  };
}

/**
 * Handler for replying to a thread
 */
export async function replyToThreadHandler(args: unknown) {
  const parsedArgs = ReplyToThreadRequestSchema.parse(args);
  const response = await userClient.chat.postMessage({
    channel: parsedArgs.channel_id,
    thread_ts: parsedArgs.thread_ts,
    text: parsedArgs.text,
  });

  if (!response.ok) {
    throw new Error(`Failed to reply to thread: ${response.error}`);
  }

  return {
    content: [{ type: 'text', text: 'Reply sent to thread successfully' }],
  };
}

/**
 * Handler for adding a reaction
 */
export async function addReactionHandler(args: unknown) {
  const parsedArgs = AddReactionRequestSchema.parse(args);
  const response = await slackClient.reactions.add({
    channel: parsedArgs.channel_id,
    timestamp: parsedArgs.timestamp,
    name: parsedArgs.reaction,
  });

  if (!response.ok) {
    throw new Error(`Failed to add reaction: ${response.error}`);
  }

  return {
    content: [{ type: 'text', text: 'Reaction added successfully' }],
  };
}

/**
 * Handler for getting channel history
 */
export async function getChannelHistoryHandler(args: unknown) {
  const parsedArgs = GetChannelHistoryRequestSchema.parse(args);
  const response = await userClient.conversations.history({
    channel: parsedArgs.channel_id,
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
  });

  if (!response.ok) {
    throw new Error(`Failed to get channel history: ${response.error}`);
  }

  const parsedResponse = ConversationsHistoryResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsedResponse) }],
  };
}

/**
 * Handler for getting thread replies
 */
export async function getThreadRepliesHandler(args: unknown) {
  const parsedArgs = GetThreadRepliesRequestSchema.parse(args);
  const response = await slackClient.conversations.replies({
    channel: parsedArgs.channel_id,
    ts: parsedArgs.thread_ts,
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
  });

  if (!response.ok) {
    throw new Error(`Failed to get thread replies: ${response.error}`);
  }

  const parsedResponse = ConversationsRepliesResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsedResponse) }],
  };
}

/**
 * Handler for searching messages
 */
export async function searchMessagesHandler(args: unknown) {
  const parsedParams = SearchMessagesRequestSchema.parse(args);

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

/**
 * Handler for searching mentions
 */
export async function searchMentionsHandler(args: unknown) {
  const parsedArgs = SearchMentionsRequestSchema.parse(args);

  let query = `@${parsedArgs.user_id}`;
  if (parsedArgs.after) {
    query += ` after:${parsedArgs.after}`;
  }
  if (parsedArgs.before) {
    query += ` before:${parsedArgs.before}`;
  }

  const response = await userClient.search.messages({
    query: query,
    count: parsedArgs.limit,
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

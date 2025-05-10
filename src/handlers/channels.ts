import { userClient } from '../config/slack-client.js';
import {
  ListChannelsRequestSchema,
  ListChannelsResponseSchema,
} from '../schemas.js';
import {
  GetUserChannelsRequestSchema,
  GetUserChannelsResponseSchema,
} from '../schemas.js';

/**
 * Handler for retrieving channel list
 */
export async function listChannelsHandler(args: unknown) {
  const parsedArgs = ListChannelsRequestSchema.parse(args);
  const response = await userClient.conversations.list({
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
    types: 'public_channel,private_channel', // Include private channels
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
 * Handler for retrieving list of channels the user has joined
 */
export async function getUserChannelsHandler(args: unknown) {
  const parsedArgs = GetUserChannelsRequestSchema.parse(args);

  // Use userClient to get all channels the user has joined
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

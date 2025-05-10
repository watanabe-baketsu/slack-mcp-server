import { slackClient, userClient } from '../config/slack-client.js';
import {
  GetUsersRequestSchema,
  GetUserProfileRequestSchema,
  GetUsersResponseSchema,
  GetUserProfileResponseSchema,
  GetCurrentUserResponseSchema
} from '../schemas.js';

/**
 * ユーザー一覧を取得するハンドラー
 */
export async function getUsersHandler(args: unknown) {
  const parsedArgs = GetUsersRequestSchema.parse(args);
  const response = await slackClient.users.list({
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get users: ${response.error}`);
  }
  
  const parsed = GetUsersResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
}

/**
 * ユーザープロファイルを取得するハンドラー
 */
export async function getUserProfileHandler(args: unknown) {
  const parsedArgs = GetUserProfileRequestSchema.parse(args);
  const response = await slackClient.users.profile.get({
    user: parsedArgs.user_id,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user profile: ${response.error}`);
  }
  
  const parsed = GetUserProfileResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
}

/**
 * 現在のユーザー情報を取得するハンドラー
 */
export async function getCurrentUserHandler() {
  const response = await userClient.auth.test();
  
  if (!response.ok) {
    throw new Error(`Failed to get current user: ${response.error}`);
  }
  
  const parsed = GetCurrentUserResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
} 
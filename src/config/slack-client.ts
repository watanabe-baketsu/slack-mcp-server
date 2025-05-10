import { WebClient } from '@slack/web-api';
import { SLACK_BOT_TOKEN, SLACK_USER_TOKEN } from './env.js';

// Botトークンを使用したクライアント
export const slackClient = new WebClient(SLACK_BOT_TOKEN);

// ユーザートークンを使用したクライアント
export const userClient = new WebClient(SLACK_USER_TOKEN);

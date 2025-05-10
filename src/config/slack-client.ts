import { WebClient } from '@slack/web-api';
import { SLACK_BOT_TOKEN, SLACK_USER_TOKEN } from './env.js';

// Client using the bot token
export const slackClient = new WebClient(SLACK_BOT_TOKEN);

// Client using the user token
export const userClient = new WebClient(SLACK_USER_TOKEN);

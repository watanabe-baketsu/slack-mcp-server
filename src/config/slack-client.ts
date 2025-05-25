import { WebClient } from '@slack/web-api';

export interface SlackClients {
  botClient: WebClient;
  userClient: WebClient;
}

export const SlackContext: SlackClients = {} as SlackClients;

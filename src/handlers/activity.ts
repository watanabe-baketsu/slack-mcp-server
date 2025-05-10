import { userClient } from '../config/slack-client.js';
import {
  GetUserChannelActivityRequestSchema,
  GetUserChannelActivityResponseSchema,
} from '../schemas.js';

/**
 * Get timestamp (in seconds) for a date N days ago from current date
 */
function getTimestampNDaysAgo(days: number): number {
  const now = new Date();
  const nDaysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return Math.floor(nDaysAgo.getTime() / 1000);
}

/**
 * Calculate total number of reactions on a message
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function countReactions(message: Record<string, any>): number {
  if (!message.reactions || !Array.isArray(message.reactions)) {
    return 0;
  }
  return message.reactions.reduce(
    (sum: number, reaction: { count?: number }) => sum + (reaction.count || 0),
    0
  );
}

/**
 * Check if a message contains mentions
 */
function hasMention(message: string): boolean {
  // Mention pattern: <@USERID>
  return /<@[A-Z0-9]+>/i.test(message);
}

/**
 * Handler for retrieving recent activity in channels the user is participating in
 */
export async function getUserChannelActivityHandler(args: unknown) {
  const parsedArgs = GetUserChannelActivityRequestSchema.parse(args);

  // Configuration parameters
  const days = parsedArgs.days || 1;
  const maxChannels = parsedArgs.max_channels || 5;
  const maxMessagesPerChannel = parsedArgs.max_messages_per_channel || 10;
  const includePrivate = parsedArgs.include_private !== false;

  // Timestamp (seconds)
  const oldest = getTimestampNDaysAgo(days);

  // Get list of channels user is participating in
  const channelsResponse = await userClient.users.conversations({
    types: includePrivate ? 'public_channel,private_channel' : 'public_channel',
    exclude_archived: true,
    limit: 200, // Get maximum number
  });

  if (!channelsResponse.ok) {
    throw new Error(`Failed to get user channels: ${channelsResponse.error}`);
  }

  // Channel list
  const channels = channelsResponse.channels || [];

  // Collect channel information and messages
  const channelSummaries: Array<{
    channel_id: string;
    channel_name: string;
    messages: Array<{
      text: string;
      user?: string;
      ts: string;
      reply_count: number;
      reaction_count: number;
      has_mention: boolean;
      permalink: string;
    }>;
  }> = [];

  // Process up to maxChannels channels
  const channelsToProcess = channels.slice(0, maxChannels);

  for (const channel of channelsToProcess) {
    try {
      // Skip if channel ID is missing
      if (!channel.id || !channel.name) {
        continue;
      }

      // Get channel history
      const historyResponse = await userClient.conversations.history({
        channel: channel.id,
        limit: maxMessagesPerChannel,
        oldest: oldest.toString(),
      });

      if (!historyResponse.ok) {
        console.error(
          `Failed to get history for channel ${channel.id}: ${historyResponse.error}`
        );
        continue;
      }

      const messages = historyResponse.messages || [];

      // Skip if no messages
      if (messages.length === 0) {
        continue;
      }

      // Process messages
      const processedMessages = messages.map((msg) => ({
        text: msg.text || '',
        user: msg.user,
        ts: msg.ts || '',
        reply_count: msg.reply_count || 0,
        reaction_count: countReactions(msg),
        has_mention: hasMention(msg.text || ''),
        permalink: '', // To be retrieved later
      }));

      // Get permalinks (only for important messages to avoid API rate limits)
      for (let i = 0; i < Math.min(3, processedMessages.length); i++) {
        try {
          const permalinkResponse = await userClient.chat.getPermalink({
            channel: channel.id,
            message_ts: processedMessages[i].ts,
          });

          if (permalinkResponse.ok && permalinkResponse.permalink) {
            processedMessages[i].permalink = permalinkResponse.permalink;
          }
        } catch (error) {
          console.error(`Failed to get permalink: ${error}`);
        }
      }

      // Sort by importance (reactions + replies)
      processedMessages.sort((a, b) => {
        const timeNow = Math.floor(Date.now() / 1000);
        const msgTimeA = parseInt(a.ts.split('.')[0]);
        const msgTimeB = parseInt(b.ts.split('.')[0]);
        const recencyA = Math.max(0, 1 - (timeNow - msgTimeA) / (86400 * days));
        const recencyB = Math.max(0, 1 - (timeNow - msgTimeB) / (86400 * days));
        const timeBonusA = recencyA * 2;
        const timeBonusB = recencyB * 2;

        const importanceA =
          (a.reaction_count || 0) * 1.0 +
          (a.reply_count || 0) * 1.5 +
          (a.has_mention ? 2 : 0) +
          timeBonusA;
        const importanceB =
          (b.reaction_count || 0) * 1.0 +
          (b.reply_count || 0) * 1.5 +
          (b.has_mention ? 2 : 0) +
          timeBonusB;
        return importanceB - importanceA;
      });

      // Add channel summary
      channelSummaries.push({
        channel_id: channel.id,
        channel_name: channel.name,
        messages: processedMessages.slice(0, maxMessagesPerChannel),
      });
    } catch (error) {
      console.error(`Error processing channel ${channel.id}: ${error}`);
    }
  }

  // Format today's date
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  // Filter channels with activity
  const filteredSummaries = channelSummaries.filter(
    (summary) => summary.messages.length > 0
  );

  // Sort by importance (total message importance)
  filteredSummaries.sort((a, b) => {
    const importanceA =
      a.messages.reduce(
        (sum, msg) =>
          sum +
          (msg.reaction_count || 0) * 1.0 +
          (msg.reply_count || 0) * 1.5 +
          (msg.has_mention ? 2 : 0) +
          (msg.reaction_count || 0) * 0.8 +
          (msg.reply_count || 0) * 1.2 +
          (msg.has_mention ? 2 : 0) * 0.8 +
          1,
        0
      ) / Math.sqrt(a.messages.length);
    const importanceB =
      b.messages.reduce(
        (sum, msg) =>
          sum +
          (msg.reaction_count || 0) * 1.0 +
          (msg.reply_count || 0) * 1.5 +
          (msg.has_mention ? 2 : 0) +
          (msg.reaction_count || 0) * 0.8 +
          (msg.reply_count || 0) * 1.2 +
          (msg.has_mention ? 2 : 0) * 0.8 +
          1,
        0
      ) / Math.sqrt(b.messages.length);
    return importanceB - importanceA;
  });

  // Create response
  const response = {
    ok: true,
    date: formattedDate,
    channels_summary: filteredSummaries,
  };

  const parsedResponse = GetUserChannelActivityResponseSchema.parse(response);

  // Format results in Japanese
  const formattedSummary = formatActivitySummary(parsedResponse);

  return {
    content: [{ type: 'text', text: formattedSummary }],
  };
}

/**
 * Format activity summary in Japanese
 */
function formatActivitySummary(response: {
  date: string;
  channels_summary: Array<{
    channel_name: string;
    messages: Array<{
      text: string;
      reaction_count?: number;
      reply_count?: number;
      has_mention?: boolean;
      permalink?: string;
    }>;
  }>;
}): string {
  const { date, channels_summary } = response;

  if (channels_summary.length === 0) {
    return `${date}の顕著なアクティビティはありませんでした。`;
  }

  let summary = `# ${date} のアクティビティサマリー\n\n`;

  // Channel summaries
  for (const channel of channels_summary) {
    summary += `## #${channel.channel_name}\n\n`;

    // Display messages
    if (channel.messages.length > 0) {
      // Show details for first 3 messages only
      for (let i = 0; i < Math.min(3, channel.messages.length); i++) {
        const msg = channel.messages[i];
        summary += `- ${msg.text}\n`;

        // Show reaction count
        if (msg.reaction_count && msg.reaction_count > 0) {
          summary += `  - リアクション: ${msg.reaction_count}件\n`;
        }

        // Show reply count
        if (msg.reply_count && msg.reply_count > 0) {
          summary += `  - 返信: ${msg.reply_count}件\n`;
        }

        // Permalink
        if (msg.permalink) {
          summary += `  - [メッセージを見る](${msg.permalink})\n`;
        }

        summary += '\n';
      }

      // Show count of remaining messages
      if (channel.messages.length > 3) {
        summary += `...他 ${channel.messages.length - 3} 件のメッセージ\n\n`;
      }
    }
  }

  return summary;
}

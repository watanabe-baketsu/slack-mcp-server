import { userClient } from '../config/slack-client.js';
import {
  GetUserChannelActivityRequestSchema,
  GetUserChannelActivityResponseSchema,
} from '../schemas.js';

/**
 * 現在の日時からN日前の日時をタイムスタンプ（秒）で取得する
 */
function getTimestampNDaysAgo(days: number): number {
  const now = new Date();
  const nDaysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return Math.floor(nDaysAgo.getTime() / 1000);
}

/**
 * メッセージにリアクションの合計数を計算
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
 * メッセージにメンションが含まれているかチェック
 */
function hasMention(message: string): boolean {
  // メンションパターン: <@USERID>
  return /<@[A-Z0-9]+>/i.test(message);
}

/**
 * ユーザーが参加しているチャンネルの最近のアクティビティを取得するハンドラー
 */
export async function getUserChannelActivityHandler(args: unknown) {
  const parsedArgs = GetUserChannelActivityRequestSchema.parse(args);

  // 設定パラメータ
  const days = parsedArgs.days || 1;
  const maxChannels = parsedArgs.max_channels || 5;
  const maxMessagesPerChannel = parsedArgs.max_messages_per_channel || 10;
  const includePrivate = parsedArgs.include_private !== false;

  // タイムスタンプ（秒）
  const oldest = getTimestampNDaysAgo(days);

  // ユーザーが参加しているチャンネル一覧を取得
  const channelsResponse = await userClient.users.conversations({
    types: includePrivate ? 'public_channel,private_channel' : 'public_channel',
    exclude_archived: true,
    limit: 200, // 最大数を取得
  });

  if (!channelsResponse.ok) {
    throw new Error(`Failed to get user channels: ${channelsResponse.error}`);
  }

  // チャンネル一覧
  const channels = channelsResponse.channels || [];

  // チャネル情報とメッセージを集める
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

  // 最大maxChannelsまでのチャンネルを処理
  const channelsToProcess = channels.slice(0, maxChannels);

  for (const channel of channelsToProcess) {
    try {
      // チャンネルIDがない場合はスキップ
      if (!channel.id || !channel.name) {
        continue;
      }

      // チャンネル履歴を取得
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

      // メッセージがない場合はスキップ
      if (messages.length === 0) {
        continue;
      }

      // メッセージを加工
      const processedMessages = messages.map((msg) => ({
        text: msg.text || '',
        user: msg.user,
        ts: msg.ts || '',
        reply_count: msg.reply_count || 0,
        reaction_count: countReactions(msg),
        has_mention: hasMention(msg.text || ''),
        permalink: '', // 後で取得
      }));

      // パーマリンクを取得（APIレート制限を避けるため重要なメッセージだけにする）
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

      // 重要度でソート（リアクション数 + 返信数）
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

      // チャンネルサマリーを追加
      channelSummaries.push({
        channel_id: channel.id,
        channel_name: channel.name,
        messages: processedMessages.slice(0, maxMessagesPerChannel),
      });
    } catch (error) {
      console.error(`Error processing channel ${channel.id}: ${error}`);
    }
  }

  // 今日の日付をフォーマット
  const today = new Date();
  const formattedDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  // アクティビティがあるチャンネルのみをフィルタ
  const filteredSummaries = channelSummaries.filter(
    (summary) => summary.messages.length > 0
  );

  // 重要度でソート（メッセージの合計重要度）
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

  // レスポンスを作成
  const response = {
    ok: true,
    date: formattedDate,
    channels_summary: filteredSummaries,
  };

  const parsedResponse = GetUserChannelActivityResponseSchema.parse(response);

  // 結果を日本語でフォーマット
  const formattedSummary = formatActivitySummary(parsedResponse);

  return {
    content: [{ type: 'text', text: formattedSummary }],
  };
}

/**
 * アクティビティサマリーを日本語でフォーマット
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

  let summary = `# ${date} のSlackアクティビティまとめ\n\n`;

  // チャンネルごとのサマリー
  channels_summary.forEach((channel) => {
    summary += `## #${channel.channel_name}\n\n`;

    if (channel.messages.length === 0) {
      summary += '顕著なアクティビティはありませんでした。\n\n';
      return;
    }

    // メッセージを表示
    channel.messages.forEach((msg, index) => {
      // 最初の3つのメッセージだけ詳細表示
      if (index < 3) {
        summary += `- ${msg.text}`;

        // リアクションカウントを表示
        if (msg.reaction_count && msg.reaction_count > 0) {
          summary += ` (👍 ${msg.reaction_count})`;
        }

        // 返信カウントを表示
        if (msg.reply_count && msg.reply_count > 0) {
          summary += ` (💬 ${msg.reply_count})`;
        }

        // パーマリンク
        if (msg.permalink) {
          summary += ` [リンク](${msg.permalink})`;
        }

        summary += '\n';
      }
    });

    // 残りのメッセージ数を表示
    if (channel.messages.length > 3) {
      summary += `\nその他 ${channel.messages.length - 3} 件のメッセージがあります。\n`;
    }

    summary += '\n';
  });

  return summary;
}

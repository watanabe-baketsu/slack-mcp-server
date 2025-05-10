import { userClient } from '../config/slack-client.js';
import {
  ListChannelCanvasesRequestSchema,
  GetCanvasContentRequestSchema,
  SummarizeUserCanvasesRequestSchema,
} from '../schemas.js';

/**
 * Handler for retrieving canvas list in a channel
 */
export async function listChannelCanvasesHandler(args: unknown) {
  const parsedArgs = ListChannelCanvasesRequestSchema.parse(args);

  try {
    // Method 1: Try conversations.canvases.list API (new API)
    try {
      console.log(
        `Trying conversations.canvases.list for channel ${parsedArgs.channel_id}`
      );
      const canvasResponse = await userClient.apiCall(
        'conversations.canvases.list',
        {
          channel_id: parsedArgs.channel_id,
          limit: parsedArgs.limit || 100,
          cursor: parsedArgs.cursor,
        }
      );

      if (canvasResponse.ok) {
        console.log(
          'Successfully retrieved canvases using conversations.canvases.list'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(canvasResponse) }],
        };
      } else {
        console.warn(
          `conversations.canvases.list failed with error: ${canvasResponse.error}`
        );
      }
    } catch (apiError) {
      console.warn('Error using conversations.canvases.list:', apiError);
    }

    // Method 2: Use regular files.list API
    const filesResponse = await userClient.files.list({
      channel: parsedArgs.channel_id,
      types: 'all', // Get all types and filter later
      count: parsedArgs.limit || 100,
      page: parsedArgs.cursor ? parseInt(parsedArgs.cursor) : 1,
    });

    console.log('Method 2 response:', JSON.stringify(filesResponse));

    if (!filesResponse.ok) {
      throw new Error(`Failed to get channel files: ${filesResponse.error}`);
    }

    console.log(
      `Files found in channel ${parsedArgs.channel_id}:`,
      filesResponse.files ? filesResponse.files.length : 0
    );

    // Display file type list (for debugging)
    if (filesResponse.files && filesResponse.files.length > 0) {
      console.log(
        'File types:',
        filesResponse.files.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.filetype,
          mode: f.mode,
          mimetype: f.mimetype,
        }))
      );

      // Filter canvas files only (try multiple conditions)
      const canvasFiles = filesResponse.files.filter((file) => {
        const isCanvas =
          file.filetype === 'canvas' ||
          file.mode === 'canvas' ||
          file.pretty_type === 'canvas' ||
          file.filetype === 'quip' ||
          (file.mimetype && file.mimetype.includes('canvas')) ||
          (file.name && file.name.toLowerCase().includes('canvas'));

        if (isCanvas) {
          console.log('Found canvas:', file.id, file.name);
        }

        return isCanvas;
      });

      console.log(`Canvases found after filtering: ${canvasFiles.length}`);

      // Return filtered file list
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              files: canvasFiles,
              total: canvasFiles.length,
            }),
          },
        ],
      };
    }

    // Method 3: Try direct API call
    try {
      console.log(
        `Trying direct API call for files.list in channel ${parsedArgs.channel_id}`
      );
      const directResponse = await userClient.apiCall('files.list', {
        channel: parsedArgs.channel_id,
        count: 100,
      });

      console.log('Method 3 response:', JSON.stringify(directResponse));

      if (
        directResponse.ok &&
        'files' in directResponse &&
        Array.isArray(directResponse.files)
      ) {
        console.log(
          `Total files from direct API: ${directResponse.files.length}`
        );

        // Display sample file information
        if (directResponse.files.length > 0) {
          const fileSamples = directResponse.files
            .slice(0, 5)
            .map(
              (f: {
                id: string;
                name?: string;
                title?: string;
                filetype?: string;
                mode?: string;
                created?: number;
                timestamp?: number;
              }) => ({
                id: f.id,
                name: f.name,
                title: f.title,
                filetype: f.filetype,
                mode: f.mode,
                created: f.created,
                timestamp: f.timestamp,
              })
            );
          console.log('File samples:', fileSamples);
        }
      }
    } catch (apiError) {
      console.warn('Error in direct API call:', apiError);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            message: 'No canvases found',
            files: [],
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Error getting canvases:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get canvases: ${errorMessage}`);
  }
}

/**
 * Handler for retrieving canvas content
 */
export async function getCanvasContentHandler(args: unknown) {
  const parsedArgs = GetCanvasContentRequestSchema.parse(args);

  try {
    console.log(`Getting basic info for canvas ID: ${parsedArgs.canvas_id}`);

    // Get basic information for specific canvas
    const response = await userClient.files.info({
      file: parsedArgs.canvas_id,
    });

    if (!response.ok) {
      throw new Error(`Failed to get canvas info: ${response.error}`);
    }

    const file = response.file;
    if (!file) {
      throw new Error('Canvas file information not found');
    }

    // Return basic information only
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            canvas: {
              id: file.id,
              title: file.title || file.name || 'Untitled Canvas',
              type: file.filetype || '',
              created_at: file.created || 0,
              updated_at: file.updated || file.timestamp || 0,
              created_by: file.user || '',
              url: file.url_private || '',
              permalink: file.permalink || '',
              mimetype: file.mimetype || '',
              size: file.size || 0,
              is_editable: file.editable || false,
              message:
                'Note: Due to Slack API limitations, canvas content cannot be directly retrieved.',
            },
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Error getting canvas info:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get canvas info: ${errorMessage}`);
  }
}

/**
 * Handler for summarizing user canvases
 */
export async function summarizeUserCanvasesHandler(args: unknown) {
  const parsedArgs = SummarizeUserCanvasesRequestSchema.parse(args);

  try {
    // 1. Get all channels the user is participating in
    const channelsResponse = await userClient.users.conversations({
      types: parsedArgs.include_private
        ? 'public_channel,private_channel'
        : 'public_channel',
      exclude_archived: true,
      limit: 200, // Get maximum number
    });

    if (!channelsResponse.ok) {
      throw new Error(`Failed to get user channels: ${channelsResponse.error}`);
    }

    if (!channelsResponse.channels || channelsResponse.channels.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              message: 'No channels found',
              channel_summaries: [],
            }),
          },
        ],
      };
    }

    const channelSummaries = [];

    // 2. Get canvas information from each channel and compile information
    for (const channel of channelsResponse.channels) {
      try {
        // Get file list in channel
        const filesResponse = await userClient.files.list({
          channel: channel.id,
          types: 'all', // Get all types
          count: parsedArgs.max_canvases_per_channel || 20,
        });

        if (
          !filesResponse.ok ||
          !filesResponse.files ||
          filesResponse.files.length === 0
        ) {
          continue; // Skip this channel
        }

        // Filter canvas files only
        const canvasFiles = filesResponse.files.filter(
          (file) =>
            file.filetype === 'canvas' ||
            file.mode === 'canvas' ||
            file.pretty_type === 'canvas' ||
            file.filetype === 'quip'
        );

        if (canvasFiles.length === 0) {
          continue; // Skip if no canvases
        }

        // Collect basic canvas information only (don't retrieve content)
        const canvases = canvasFiles.map((canvas) => ({
          id: canvas.id,
          title: canvas.title || canvas.name || 'Untitled Canvas',
          created: canvas.created || canvas.timestamp || 0,
          updated: canvas.updated || canvas.timestamp || canvas.created || 0,
          user_id: canvas.user || '',
          permalink: canvas.permalink || '',
          url: canvas.url_private || '',
        }));

        if (canvases.length > 0) {
          channelSummaries.push({
            channel_name: channel.name,
            channel_id: channel.id,
            is_private: channel.is_private,
            canvases: canvases,
          });
        }
      } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            channel_summaries: channelSummaries,
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Error summarizing canvases:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to summarize canvases: ${errorMessage}`);
  }
}

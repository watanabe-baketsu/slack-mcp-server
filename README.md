# slack-mcp-server

A [MCP(Model Context Protocol)](https://www.anthropic.com/news/model-context-protocol) server for accessing Slack API. This server allows AI assistants to interact with the Slack API through a standardized interface.

## Features

Available tools:

- `slack_list_channels` - List public channels in the workspace with pagination
- `slack_get_user_channels` - Get all channels (including private) the user is a member of
- `slack_post_message` - Post a new message to a Slack channel
- `slack_reply_to_thread` - Reply to a specific message thread in Slack
- `slack_add_reaction` - Add a reaction emoji to a message
- `slack_get_channel_history` - Get recent messages from a channel
- `slack_get_thread_replies` - Get all replies in a message thread
- `slack_search_messages` - Search for messages in the workspace
- `slack_search_mentions` - Search for messages that mention a specific user
- `slack_get_users` - Retrieve basic profile information of all users in the workspace
- `slack_get_user_profile` - Get a user's profile information
- `slack_get_current_user` - Get information about the current user associated with the token
- `slack_list_files_in_channel` - Get list of files in a channel
- `slack_get_file_info` - Get information about a specific file
- `slack_summarize_channel_files` - Summarize files from all channels the user is a member of
- `slack_list_channel_canvases` - Get list of canvases in a channel
- `slack_get_canvas_content` - Get the content of a specific canvas
- `slack_summarize_user_canvases` - Summarize user canvases
- `slack_get_user_channel_activity` - Get user activity in a channel

## Quick Start

### Installation

```bash
npm install @watanabe-baketsu/slack-mcp-server
```

NOTE: Its now hosted in GitHub Registry so you need your PAT.

### Configuration

You need to set the following environment variables:

- `SLACK_BOT_TOKEN`: Slack Bot User OAuth Token
- `SLACK_USER_TOKEN`: Slack User OAuth Token (required for some features like message search)
- `PORT`: (Optional) Port number to run the server on (default: 3000)

You can also create a `.env` file to set these environment variables:

```
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_USER_TOKEN=xoxp-your-user-token
PORT=3000
```

For running examples, use the following environment variables:

```
EXMAPLES_SLACK_BOT_TOKEN=xoxb-your-bot-token
EXMAPLES_SLACK_USER_TOKEN=xoxp-your-user-token
```

### Usage

#### Start the MCP server

Directly:
```bash
npx @watanabe-baketsu/slack-mcp-server
```

Or, run the installed module with node:
```bash
node node_modules/.bin/slack-mcp-server
```

#### Edit MCP configuration json for your client:

```json
{
  "slack": {
    "command": "npx",
    "args": [
      "-y",
      "@watanabe-baketsu/slack-mcp-server"
    ],
    "env": {
      "NPM_CONFIG_//npm.pkg.github.com/:_authToken": "<your-github-pat>",
      "SLACK_BOT_TOKEN": "<your-bot-token>",
      "SLACK_USER_TOKEN": "<your-user-token>",
      "PORT": "3000"
    }
  }
}
```

## Implementation Pattern

This server adopts the following implementation pattern:

1. Define request/response using Zod schemas
   - Request schema: Define input parameters
   - Response schema: Define responses limited to necessary fields

2. Implementation flow:
   - Validate request with Zod schema
   - Call Slack WebAPI
   - Parse response with Zod schema to limit to necessary fields
   - Return as JSON

For example, the `slack_list_channels` implementation parses the request with `ListChannelsRequestSchema`, calls `slackClient.conversations.list`, and returns the response parsed with `ListChannelsResponseSchema`.

## Development

### Available Scripts

- `npm run dev` - Start the server in development mode with hot reloading
- `npm run build` - Build the project for production
- `npm run start` - Start the production server
- `npm run lint` - Run linting checks (ESLint and Prettier)
- `npm run fix` - Automatically fix linting issues
- `npm run examples` - Run example scripts

### Docker Deployment

A Dockerfile is provided for containerized deployment:

```bash
# Build the Docker image
docker build -t slack-mcp-server .

# Run the container
docker run -p 3000:3000 --env-file .env -v $(pwd)/db:/app/db slack-mcp-server
```

### Contributing

1. Fork the repository
2. Create your feature branch
3. Run tests and linting: `npm run lint`
4. Commit your changes
5. Push to the branch
6. Create a Pull Request

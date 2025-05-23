import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate environment variables
if (!process.env.SLACK_BOT_TOKEN) {
  console.error(
    'SLACK_BOT_TOKEN is not set. Please set it in your environment or .env file.'
  );
  process.exit(1);
}

if (!process.env.SLACK_USER_TOKEN) {
  console.error(
    'SLACK_USER_TOKEN is not set. Please set it in your environment or .env file.'
  );
  process.exit(1);
}

// Export environment variables
export const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
export const SLACK_USER_TOKEN = process.env.SLACK_USER_TOKEN;
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const MODE = process.env.MODE;

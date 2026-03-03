import { config } from 'dotenv';
config({ path: '.env.local' });
import { WebClient } from '@slack/web-api';

const token = process.env.SLACK_BOT_TOKEN;
console.log('Token exists:', !!token);
console.log('Token prefix:', token?.substring(0, 10) + '...');

const client = new WebClient(token);

async function main() {
  try {
    const result = await client.chat.postMessage({
      channel: '#bugs',
      text: 'Debug test from Levi',
    });
    console.log('Success:', result.ok);
    console.log('Channel:', result.channel);
    console.log('Timestamp:', result.ts);
  } catch (err: any) {
    console.error('Error code:', err.code);
    console.error('Error data:', JSON.stringify(err.data, null, 2));
    console.error('Full error:', err.message);
  }
}

main();

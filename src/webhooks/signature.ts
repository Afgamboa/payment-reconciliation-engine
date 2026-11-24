import { createHmac } from 'node:crypto';

// Usage: node --env-file=.env dist/webhooks/signature.js '<raw json body>'
// Prints the value to send in the x-webhook-signature header.
const secret = process.env.WEBHOOK_SECRET;
const body = process.argv[2];

if (!secret || !body) {
  console.error('WEBHOOK_SECRET env var and a JSON body argument are required');
  process.exit(1);
}

console.log(createHmac('sha256', secret).update(body).digest('hex'));

import { createHmac } from 'node:crypto';

const secret = "6539a13fb57ab688c2c3860f6db99f3077ad8ffbafd6e71ed56b0a4b8186cf02";  
const body = JSON.stringify({
  eventId: 'evt_123',
  paymentId: 'pay_456',
  provider: 'WOMPI',
  status: 'COMPLETED',
  amount: 50000,
  currency: 'COP',
});

const signature = createHmac('sha256', secret || '')
  .update(body)
  .digest('hex');

console.log(signature);
console.log(body);
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { EventStatus } from '../src/common/enum/event-status.enum.js';
import { EventPublisher } from '../src/messaging/rabbitmq.publisher.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EventProcessor } from '../src/processing/event-processor.service.js';
import { EventWorker } from '../src/processing/event-worker.service.js';

const PROVIDER = 'WOMPI';
const TEST_PREFIX = 'e2e-';

const sign = (rawBody: string) =>
  createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

const buildPayload = (overrides: Record<string, unknown> = {}) => ({
  eventId: `${TEST_PREFIX}evt-${randomUUID()}`,
  paymentId: `${TEST_PREFIX}pay-${randomUUID()}`,
  type: 'PAYMENT_STATUS_CHANGED',
  status: 'COMPLETED',
  amount: 125000,
  currency: 'COP',
  occurredAt: '2026-11-18T14:00:00.000Z',
  ...overrides,
});

describe('Webhook recovery engine (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let worker: EventWorker;
  let processor: EventProcessor;

  const postWebhook = (payload: object, signature?: string) => {
    const rawBody = JSON.stringify(payload);
    return request(app.getHttpServer())
      .post(`/api/webhooks/${PROVIDER}`)
      .set('content-type', 'application/json')
      .set('x-webhook-signature', signature ?? sign(rawBody))
      .send(rawBody);
  };

  const getEvent = async (id: string) =>
    (await request(app.getHttpServer()).get(`/api/events/${id}`).expect(200))
      .body;

  const findPayment = (providerPaymentId: string) =>
    prisma.payments.findUnique({
      where: {
        provider_providerPaymentId: {
          provider: PROVIDER,
          providerPaymentId,
        },
      },
    });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EventPublisher)
      .useValue({ notify: vi.fn() })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
    worker = app.get(EventWorker);
    processor = app.get(EventProcessor);
  });

  afterAll(async () => {
    await prisma.payment_Attempts.deleteMany({
      where: { event: { eventId: { startsWith: TEST_PREFIX } } },
    });
    await prisma.webhooks_Events.deleteMany({
      where: { eventId: { startsWith: TEST_PREFIX } },
    });
    await prisma.payments.deleteMany({
      where: { providerPaymentId: { startsWith: TEST_PREFIX } },
    });
    await app.close();
  });

  it('stores a valid COMPLETED webhook and completes the payment', async () => {
    const payload = buildPayload();

    const response = await postWebhook(payload).expect(202);
    expect(response.body.status).toBe('ACCEPTED');
    expect(response.headers['x-correlation-id']).toBeDefined();

    await worker.trigger();

    const event = await getEvent(response.body.id);
    expect(event.status).toBe(EventStatus.PROCESSED);
    expect(event.attemptsLog).toHaveLength(1);
    expect(event.attemptsLog[0].outcome).toBe('APPLIED');

    const payment = await findPayment(payload.paymentId);
    expect(payment?.status).toBe('COMPLETED');
    await request(app.getHttpServer())
      .get(`/api/payments/${payment!.id}`)
      .expect(200);
  });

  it('applies the same eventId only once, even when sent concurrently', async () => {
    const payload = buildPayload();

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => postWebhook(payload)),
    );

    const statuses = responses.map((response) => response.body.status);
    expect(statuses.filter((status) => status === 'ACCEPTED')).toHaveLength(1);
    expect(statuses.filter((status) => status === 'DUPLICATE')).toHaveLength(4);
    expect(
      await prisma.webhooks_Events.count({
        where: { eventId: payload.eventId },
      }),
    ).toBe(1);

    await worker.trigger();

    const event = await getEvent(responses[0].body.id);
    expect(event.attempts).toBe(1);
  });

  it('does not regress a COMPLETED payment when an older PENDING arrives', async () => {
    const paymentId = `${TEST_PREFIX}pay-${randomUUID()}`;
    await postWebhook(
      buildPayload({ paymentId, occurredAt: '2026-11-18T14:05:00.000Z' }),
    );
    await worker.trigger();

    const stale = await postWebhook(
      buildPayload({
        paymentId,
        status: 'PENDING',
        occurredAt: '2026-11-18T14:00:00.000Z',
      }),
    );
    await worker.trigger();

    expect((await findPayment(paymentId))?.status).toBe('COMPLETED');
    const event = await getEvent(stale.body.id);
    expect(event.status).toBe(EventStatus.PROCESSED);
    expect(event.attemptsLog[0].outcome).toBe('IGNORED');
  });

  it('keeps unknown statuses visible for review', async () => {
    const response = await postWebhook(buildPayload({ status: 'REFUNDED' }));
    await worker.trigger();

    const event = await getEvent(response.body.id);
    expect(event.status).toBe(EventStatus.NEEDS_REVIEW);
    expect(event.rawPayload.status).toBe('REFUNDED');
  });

  it('rejects an invalid signature or payload without storing anything', async () => {
    const forged = buildPayload();
    await postWebhook(forged, 'deadbeef').expect(401);

    const invalid = buildPayload({ amount: -5 });
    await postWebhook(invalid).expect(400);

    expect(
      await prisma.webhooks_Events.count({
        where: { eventId: { in: [forged.eventId, invalid.eventId] } },
      }),
    ).toBe(0);
  });

  it('never lets two concurrent workers claim the same event', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => postWebhook(buildPayload())),
    );

    await Promise.all([
      processor.processNextBatch(),
      processor.processNextBatch(),
      processor.processNextBatch(),
    ]);
    await worker.trigger();

    const events = await Promise.all(
      responses.map((response) => getEvent(response.body.id)),
    );
    expect(events.every((event) => event.attempts === 1)).toBe(true);
    expect(events.every((event) => event.status === EventStatus.PROCESSED)).toBe(
      true,
    );
  });

  it('reconciles a stuck payment and can be repeated safely', async () => {
    const providerPaymentId = `${TEST_PREFIX}pay-${randomUUID()}`;
    const anHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await prisma.payments.create({
      data: {
        provider: PROVIDER,
        providerPaymentId,
        amount: 1000,
        currency: 'COP',
        status: 'PENDING',
        lastEventAt: anHourAgo,
        updatedAt: anHourAgo,
      },
    });

    const run = () =>
      request(app.getHttpServer())
        .post('/api/admin/reconciliation/run')
        .set('x-admin-key', process.env.ADMIN_API_KEY!);

    await request(app.getHttpServer())
      .post('/api/admin/reconciliation/run')
      .expect(401);

    const first = await run().expect(200);
    expect(first.body.corrected).toBeGreaterThanOrEqual(1);
    expect((await findPayment(providerPaymentId))?.status).toBe('COMPLETED');

    const updatedAt = (await findPayment(providerPaymentId))?.updatedAt;
    await run().expect(200);
    expect((await findPayment(providerPaymentId))?.updatedAt).toEqual(updatedAt);
  });

  it('reports the health of its dependencies', async () => {
    const response = await request(app.getHttpServer()).get('/api/health');

    expect(response.body.dependencies.database).toBe('up');
  });

  it('exposes Prometheus metrics', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/metrics')
      .expect(200);

    expect(response.text).toContain('webhook_events_received_total');
    expect(response.text).toContain('nodejs_eventloop_lag_seconds');
  });
});

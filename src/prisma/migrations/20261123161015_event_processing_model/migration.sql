/*
  Backfills existing rows so the new NOT NULL columns can be added.
*/
-- AlterTable
ALTER TABLE "Payments" ADD COLUMN     "lastEventAt" TIMESTAMP(3);
UPDATE "Payments" SET "lastEventAt" = "updatedAt";
ALTER TABLE "Payments" ALTER COLUMN "lastEventAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "Webhooks_Events" ADD COLUMN     "correlationId" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "occurredAt" TIMESTAMP(3),
ADD COLUMN     "type" TEXT,
ALTER COLUMN "status" SET DEFAULT 'RECEIVED',
ALTER COLUMN "attempts" SET DEFAULT 0;

-- Events stored before this migration held the payment status in "status"; requeue them.
UPDATE "Webhooks_Events"
SET "correlationId" = "id",
    "occurredAt" = "receivedAt",
    "type" = 'PAYMENT_STATUS_CHANGED',
    "status" = 'RECEIVED',
    "attempts" = 0,
    "nextRetryAt" = NULL;

ALTER TABLE "Webhooks_Events" ALTER COLUMN "correlationId" SET NOT NULL,
ALTER COLUMN "occurredAt" SET NOT NULL,
ALTER COLUMN "type" SET NOT NULL;

-- CreateTable
CREATE TABLE "Payment_Attempts" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "outcome" TEXT,
    "error" TEXT,

    CONSTRAINT "Payment_Attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_Attempts_eventId_attemptNumber_key" ON "Payment_Attempts"("eventId", "attemptNumber");

-- CreateIndex
CREATE INDEX "Payments_status_updatedAt_idx" ON "Payments"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Webhooks_Events_status_nextRetryAt_idx" ON "Webhooks_Events"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "Webhooks_Events_provider_paymentId_idx" ON "Webhooks_Events"("provider", "paymentId");

-- AddForeignKey
ALTER TABLE "Payment_Attempts" ADD CONSTRAINT "Payment_Attempts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Webhooks_Events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

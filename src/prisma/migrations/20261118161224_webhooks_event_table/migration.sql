-- CreateTable
CREATE TABLE "Webhooks_Events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "nextRetryAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Webhooks_Events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Webhooks_Events_provider_eventId_key" ON "Webhooks_Events"("provider", "eventId");

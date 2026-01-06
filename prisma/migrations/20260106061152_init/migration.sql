-- CreateTable
CREATE TABLE "Record" (
    "id" SERIAL NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "kospiIndividual" DOUBLE PRECISION NOT NULL,
    "kospiForeign" DOUBLE PRECISION NOT NULL,
    "kospiInstitution" DOUBLE PRECISION NOT NULL,
    "kospiChangePct" DOUBLE PRECISION NOT NULL,
    "kosdaqIndividual" DOUBLE PRECISION NOT NULL,
    "kosdaqForeign" DOUBLE PRECISION NOT NULL,
    "kosdaqInstitution" DOUBLE PRECISION NOT NULL,
    "kosdaqChangePct" DOUBLE PRECISION NOT NULL,
    "nasdaqChangePct" DOUBLE PRECISION NOT NULL,
    "usdkrw" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Record_date_idx" ON "Record"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Record_date_time_key" ON "Record"("date", "time");

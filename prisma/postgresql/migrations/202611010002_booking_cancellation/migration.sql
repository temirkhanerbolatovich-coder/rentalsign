CREATE TABLE "BookingCancellation" (
    "contractId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookingCancellation_pkey" PRIMARY KEY ("contractId")
);

ALTER TABLE "BookingCancellation" ADD CONSTRAINT "BookingCancellation_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

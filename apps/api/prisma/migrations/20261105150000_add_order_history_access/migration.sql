ALTER TABLE "Order"
ADD COLUMN "guestAccessTokenHash" TEXT;

CREATE UNIQUE INDEX "Order_guestAccessTokenHash_key"
ON "Order"("guestAccessTokenHash");

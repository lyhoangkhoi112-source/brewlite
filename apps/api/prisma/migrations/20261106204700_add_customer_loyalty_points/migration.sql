ALTER TABLE "User"
ADD COLUMN "loyaltyPoints" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "LoyaltyTransaction"
ADD COLUMN "orderId" TEXT;

CREATE UNIQUE INDEX "LoyaltyTransaction_orderId_key"
ON "LoyaltyTransaction"("orderId");

ALTER TABLE "LoyaltyTransaction"
ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "User" AS users
SET "loyaltyPoints" = COALESCE(
  (
    SELECT SUM(
      CASE
        WHEN transactions."type" IN ('REDEEM', 'EXPIRE')
          THEN -transactions."points"
        ELSE transactions."points"
      END
    )
    FROM "LoyaltyTransaction" AS transactions
    WHERE transactions."userId" = users."id"
      AND transactions."type" = 'EARN'
  ),
  0
);

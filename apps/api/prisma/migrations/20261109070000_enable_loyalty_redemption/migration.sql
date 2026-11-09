DROP INDEX IF EXISTS "LoyaltyTransaction_orderId_key";

CREATE INDEX "LoyaltyTransaction_orderId_idx"
ON "LoyaltyTransaction"("orderId");

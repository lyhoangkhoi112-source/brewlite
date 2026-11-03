DROP INDEX "Order_idempotencyKey_key";
ALTER TABLE "Order" DROP COLUMN "idempotencyKey";

ALTER TABLE "CartItem"
ADD COLUMN "sugarLevel" TEXT,
ADD COLUMN "iceLevel" TEXT;

ALTER TABLE "OrderItem"
ADD COLUMN "sugarLevel" TEXT,
ADD COLUMN "iceLevel" TEXT;

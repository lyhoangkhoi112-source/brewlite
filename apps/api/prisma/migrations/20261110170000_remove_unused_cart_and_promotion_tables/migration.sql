ALTER TABLE "Order" DROP CONSTRAINT "Order_promotionId_fkey";
ALTER TABLE "Order" DROP COLUMN "promotionId";

DROP TABLE "CartItem";
DROP TABLE "Cart";
DROP TABLE "Promotion";

DROP TYPE "PromotionType";

ALTER TABLE "User" ALTER COLUMN "id" DROP DEFAULT;

WITH numbered_users AS (
  SELECT
    "id",
    CASE "role"
      WHEN 'CUSTOMER' THEN 'KH'
      WHEN 'STAFF' THEN 'NV'
      WHEN 'MANAGER' THEN 'QL'
    END || LPAD(
      ROW_NUMBER() OVER (PARTITION BY "role" ORDER BY "createdAt", "id")::TEXT,
      8,
      '0'
    ) AS new_id
  FROM "User"
)
UPDATE "User"
SET "id" = numbered_users.new_id
FROM numbered_users
WHERE "User"."id" = numbered_users."id";

WITH numbered_orders AS (
  SELECT
    "id",
    'HD' || LPAD(
      ROW_NUMBER() OVER (ORDER BY "createdAt", "id")::TEXT,
      8,
      '0'
    ) AS new_order_code
  FROM "Order"
)
UPDATE "Order"
SET "orderCode" = numbered_orders.new_order_code
FROM numbered_orders
WHERE "Order"."id" = numbered_orders."id";

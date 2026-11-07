CREATE TYPE "ProductCategory" AS ENUM (
    'COFFEE',
    'MILK_TEA',
    'FRUIT_TEA',
    'MATCHA',
    'ICE_BLEND',
    'MACCHIATO',
    'TOPPING'
);

ALTER TABLE "Product"
ADD COLUMN "category" "ProductCategory";

UPDATE "Product"
SET "category" = CASE LOWER(BTRIM("description"))
    WHEN 'cà phê' THEN 'COFFEE'::"ProductCategory"
    WHEN 'trà sữa' THEN 'MILK_TEA'::"ProductCategory"
    WHEN 'trà trái cây' THEN 'FRUIT_TEA'::"ProductCategory"
    WHEN 'matcha' THEN 'MATCHA'::"ProductCategory"
    WHEN 'ice blend' THEN 'ICE_BLEND'::"ProductCategory"
    WHEN 'machiato' THEN 'MACCHIATO'::"ProductCategory"
    WHEN 'macchiato' THEN 'MACCHIATO'::"ProductCategory"
    WHEN 'topping' THEN 'TOPPING'::"ProductCategory"
    ELSE NULL
END
WHERE "description" IS NOT NULL;

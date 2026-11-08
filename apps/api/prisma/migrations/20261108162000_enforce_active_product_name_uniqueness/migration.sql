DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "Product"
        WHERE "status" <> 'UNAVAILABLE'
        GROUP BY LOWER(BTRIM("name"))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Cannot enforce unique active product names: resolve existing case-insensitive duplicates first';
    END IF;
END $$;

CREATE UNIQUE INDEX "Product_active_name_ci_key"
ON "Product" (LOWER(BTRIM("name")))
WHERE "status" <> 'UNAVAILABLE';

-- Fix applicationStartDate format from ISO timestamps to DD/MM/YYYY
-- This script converts existing ISO timestamp strings back to the original DD/MM/YYYY format

-- Update records with 2025-08-10 timestamps to 10/08/2025
UPDATE "CreditApplication" 
SET "applicationStartDate" = '10/08/2025'
WHERE "applicationStartDate" LIKE '2025-08-10%';

-- Update records with 2024-12-07 timestamps to 07/12/2024
UPDATE "CreditApplication" 
SET "applicationStartDate" = '07/12/2024'
WHERE "applicationStartDate" LIKE '2024-12-07%';

-- Update records with 2023-06-10 timestamps to 10/06/2023
UPDATE "CreditApplication" 
SET "applicationStartDate" = '10/06/2023'
WHERE "applicationStartDate" LIKE '2023-06-10%';

-- Update records with 2024-02-01 timestamps to 01/02/2024
UPDATE "CreditApplication" 
SET "applicationStartDate" = '01/02/2024'
WHERE "applicationStartDate" LIKE '2024-02-01%';

-- Update records with 2022-01-11 timestamps to 11/01/2022
UPDATE "CreditApplication" 
SET "applicationStartDate" = '11/01/2022'
WHERE "applicationStartDate" LIKE '2022-01-11%';

-- Update records with 2025-06-30 timestamps to 30/06/2025
UPDATE "CreditApplication" 
SET "applicationStartDate" = '30/06/2025'
WHERE "applicationStartDate" LIKE '2025-06-30%';

-- Update records with 2024-03-08 timestamps to 08/03/2024
UPDATE "CreditApplication" 
SET "applicationStartDate" = '08/03/2024'
WHERE "applicationStartDate" LIKE '2024-03-08%';

-- Update records with 2022-08-11 timestamps to 11/08/2022
UPDATE "CreditApplication" 
SET "applicationStartDate" = '11/08/2022'
WHERE "applicationStartDate" LIKE '2022-08-11%';

-- Update records with 2023-04-30 timestamps to 30/04/2023
UPDATE "CreditApplication" 
SET "applicationStartDate" = '30/04/2023'
WHERE "applicationStartDate" LIKE '2023-04-30%';

-- Update records with 2024-08-01 timestamps to 01/08/2024
UPDATE "CreditApplication" 
SET "applicationStartDate" = '01/08/2024'
WHERE "applicationStartDate" LIKE '2024-08-01%';

-- Update records with 2024-08-02 timestamps to 02/08/2024
UPDATE "CreditApplication" 
SET "applicationStartDate" = '02/08/2024'
WHERE "applicationStartDate" LIKE '2024-08-02%';

-- Verify the changes
SELECT "sheetId", "applicationStartDate" 
FROM "CreditApplication" 
WHERE "applicationStartDate" IS NOT NULL 
LIMIT 10; 
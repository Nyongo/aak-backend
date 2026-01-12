# Debugging "Parameter 57" Error

## Current Error
```
Error: incorrect binary data format in bind parameter 57
Location: /app/dist/src/jf/services/loans.service.js:160:55
```

## Root Cause
The error occurs because the **remote server is running OLD compiled JavaScript** that converts the `synced` boolean field to a string.

## Understanding the Error

### What is "Parameter 57"?
Prisma sends parameters to PostgreSQL in order. Parameter 57 is the **57th field** being inserted into the database.

### Field Order (First 60 fields):
1-10: sheetId, loanType, loanPurpose, borrowerType, borrowerId, borrowerName, principalAmount, interestType, annualDecliningInterest, annualFlatInterest
11-20: processingFeePercentage, creditLifeInsurancePercentage, securitizationFee, processingFee, creditLifeInsuranceFee, numberOfMonths, dailyPenalty, amountToDisburse, totalComprehensiveVehicleInsurancePaymentsToPay, totalInterestCharged
21-30: totalInterestToPay, totalPrincipalToPay, creditApplicationId, firstPaymentPeriod, createdBy, totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance, totalLoanAmountPaidIncludingPenaltiesAndInsurance, totalPenaltiesAssessed, totalPenaltiesPaid, penaltiesStillDue
31-40: sslId, loanOverdue, par14, par30, par60, par90, par120, amountOverdue, loanFullyPaid, loanStatus
41-50: totalAmountDueToDate, amountDisbursedToDateIncludingFees, balanceOfDisbursementsOwed, principalPaidToDate, outstandingPrincipalBalance, numberOfAssetsUsedAsCollateral, numberOfAssetsRecorded, allCollateralRecorded, principalDifference, creditLifeInsuranceSubmitted
51-60: directorHasCompletedCreditLifeHealthExamination, recordOfReceiptForCreditLifeInsurance, percentDisbursed, daysLate, totalUnpaidLiability, restructured, collateralCheckedByLegalTeam, hasFemaleDirector, reportsGenerated, contractUploaded
61-70: percentChargeOnVehicleInsuranceFinancing, customerCareCallDone, checksHeld, remainingPeriodsForChecks, adequateChecksForRemainingPeriods, totalLiabilityAmountFromContract, liabilityCheck, creditLifeInsurer, interestChargedVsDueDifference, principalDueWithForgivenessVsWithoutForgiveness
...continues...

**Parameter 57 is most likely: `synced` field**

## The Fix

### Before (OLD CODE - WRONG):
```typescript
// Line 78-86 in OLD loans.service.ts
// Handle all other fields (strings, etc.)
else {
  // Convert to string or null
  if (value === null || value === '' || value === '(empty)') {
    data[key] = null;
  } else {
    // ❌ This converts boolean true to string "true"
    data[key] = String(value);
  }
}
```

### After (NEW CODE - CORRECT):
```typescript
// Lines 78-97 in NEW loans.service.ts
// Handle boolean fields (Boolean)
else if (booleanFields.includes(key)) {
  if (value === null || value === undefined) {
    data[key] = null;
  } else if (typeof value === 'boolean') {
    data[key] = value; // ✅ Keep boolean as boolean
  } else if (typeof value === 'string') {
    const lowerValue = value.toLowerCase().trim();
    if (lowerValue === 'true' || lowerValue === '1') {
      data[key] = true; // ✅ Convert string to boolean
    } else if (lowerValue === 'false' || lowerValue === '0') {
      data[key] = false;
    } else {
      data[key] = null;
    }
  } else if (typeof value === 'number') {
    data[key] = value !== 0;
  } else {
    data[key] = null;
  }
}
// Then handle all other string fields
else {
  ...
}
```

## Deployment Checklist

- [ ] **Step 1**: Commit changes to Git
  ```bash
  git add src/jf/services/loans.service.ts
  git commit -m "Fix: Handle synced field as boolean"
  git push origin main
  ```

- [ ] **Step 2**: SSH to server and pull code
  ```bash
  ssh user@server
  cd /path/to/jf-backend
  git pull origin main
  ```

- [ ] **Step 3**: Rebuild Docker container (CRITICAL - must recompile TypeScript)
  ```bash
  docker-compose down
  docker-compose build --no-cache  # ⚠️ --no-cache is important!
  docker-compose up -d
  ```

- [ ] **Step 4**: Verify the fix is compiled
  ```bash
  # Check if booleanFields is in the compiled code
  docker exec <container> grep "booleanFields" /app/dist/src/jf/services/loans.service.js

  # Should output: const booleanFields = ['synced'];
  ```

- [ ] **Step 5**: Test the import
  ```bash
  curl -X POST "https://your-api.com/jf/loans-migration/import-from-sheets"
  ```

- [ ] **Step 6**: Verify in logs
  ```bash
  docker logs <container> 2>&1 | tail -n 100
  # Should NOT see "parameter 57" error anymore
  ```

## Common Mistakes

### ❌ Mistake 1: Not rebuilding
```bash
# This won't work - just restarts with old code
docker-compose restart
```

### ✅ Correct: Full rebuild
```bash
# This recompiles TypeScript → JavaScript
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### ❌ Mistake 2: Caching old build
```bash
# Build might use cached layers with old code
docker-compose build
```

### ✅ Correct: No-cache build
```bash
# Force fresh build from scratch
docker-compose build --no-cache
```

## Verification Commands

### 1. Check TypeScript source is updated on server
```bash
ssh user@server
cd /path/to/jf-backend
grep -n "booleanFields" src/jf/services/loans.service.ts
# Should show: const booleanFields = ['synced'];
```

### 2. Check compiled JavaScript has the fix
```bash
docker exec <container> grep -A 5 "booleanFields" /app/dist/src/jf/services/loans.service.js
# Should show boolean handling logic
```

### 3. Check line 160 in compiled code
```bash
docker exec <container> sed -n '155,165p' /app/dist/src/jf/services/loans.service.js
# Should NOT be the old code that converts to String()
```

### 4. Test a single loan import
```bash
# Get status first
curl -X GET "https://your-api.com/jf/loans-migration/status"

# Then import
curl -X POST "https://your-api.com/jf/loans-migration/import-from-sheets"

# Expected result:
# {
#   "success": true,
#   "imported": 1277,
#   "errors": 0
# }
```

## If Still Failing

### Check what's being sent to Prisma
Add temporary logging in loans.service.ts:

```typescript
// Around line 133, before prisma.loan.create
console.log('Field types being sent to Prisma:');
console.log('synced:', typeof data.synced, data.synced);
console.log('hasFemaleDirector:', typeof data.hasFemaleDirector, data.hasFemaleDirector);
```

Then rebuild and check logs:
```bash
docker-compose build --no-cache
docker-compose up -d
docker logs -f <container> | grep "Field types"
```

## Expected vs Actual

### ❌ What was happening (causing error):
```json
{
  "synced": "true"  // String - PostgreSQL expects boolean
}
```

### ✅ What should happen (after fix):
```json
{
  "synced": true  // Boolean - matches PostgreSQL schema
}
```

## PostgreSQL Schema
```sql
-- From Prisma schema
synced Boolean @default(false)

-- PostgreSQL expects:
-- true (boolean) ✅
-- false (boolean) ✅
-- "true" (string) ❌ ERROR: incorrect binary data format
```

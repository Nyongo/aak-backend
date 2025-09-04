/*
  Warnings:

  - You are about to drop the column `address` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `balanceCarriedForward` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `category` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `collateralDescription` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `collateralType` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `collateralValue` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `createdDate` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `creditApplicationId` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `customerType` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `feesAmount` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `installmentNumber` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `interestAmount` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `isOverdue` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `isPaid` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `lastModifiedBy` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `lastModifiedDate` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `lastPaymentDate` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `loanAmount` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `loanId` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `monthlyPayment` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `nextPaymentDate` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `outstandingBalance` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `paymentDate` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `paymentHistory` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `paymentMethod` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `paymentScheduleNumber` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `penaltyAmount` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `principalAmount` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `priority` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `remarks` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `schoolId` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `sslId` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `totalFees` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `totalInterest` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `totalPenalties` on the `DirectPaymentSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT` on the `InvestmentCommittee` table. All the data in the column will be lost.
  - You are about to drop the column `lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol` on the `InvestmentCommittee` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DirectPaymentSchedule" DROP COLUMN "address",
DROP COLUMN "balanceCarriedForward",
DROP COLUMN "category",
DROP COLUMN "collateralDescription",
DROP COLUMN "collateralType",
DROP COLUMN "collateralValue",
DROP COLUMN "createdBy",
DROP COLUMN "createdDate",
DROP COLUMN "creditApplicationId",
DROP COLUMN "customerType",
DROP COLUMN "email",
DROP COLUMN "feesAmount",
DROP COLUMN "installmentNumber",
DROP COLUMN "interestAmount",
DROP COLUMN "isActive",
DROP COLUMN "isOverdue",
DROP COLUMN "isPaid",
DROP COLUMN "lastModifiedBy",
DROP COLUMN "lastModifiedDate",
DROP COLUMN "lastPaymentDate",
DROP COLUMN "loanAmount",
DROP COLUMN "loanId",
DROP COLUMN "location",
DROP COLUMN "monthlyPayment",
DROP COLUMN "nextPaymentDate",
DROP COLUMN "notes",
DROP COLUMN "outstandingBalance",
DROP COLUMN "paymentDate",
DROP COLUMN "paymentHistory",
DROP COLUMN "paymentMethod",
DROP COLUMN "paymentScheduleNumber",
DROP COLUMN "paymentStatus",
DROP COLUMN "penaltyAmount",
DROP COLUMN "phone",
DROP COLUMN "principalAmount",
DROP COLUMN "priority",
DROP COLUMN "remarks",
DROP COLUMN "schoolId",
DROP COLUMN "sslId",
DROP COLUMN "status",
DROP COLUMN "tags",
DROP COLUMN "totalAmount",
DROP COLUMN "totalFees",
DROP COLUMN "totalInterest",
DROP COLUMN "totalPenalties",
ADD COLUMN     "adjustedMonth" TEXT,
ADD COLUMN     "amountStillUnpaid" TEXT,
ADD COLUMN     "borrowerType" TEXT,
ADD COLUMN     "checkCashingStatus" TEXT,
ADD COLUMN     "creditLifeInsuranceFeeInsuranceExpense" TEXT,
ADD COLUMN     "creditLifeInsuranceFeePaymentsUtilized" TEXT,
ADD COLUMN     "creditLifeInsuranceFeesCharged" TEXT,
ADD COLUMN     "creditLifeInsuranceFeesOwedToInsurer" TEXT,
ADD COLUMN     "dateFullyPaid" TEXT,
ADD COLUMN     "daysLate" TEXT,
ADD COLUMN     "debtType" TEXT,
ADD COLUMN     "directLoanId" TEXT,
ADD COLUMN     "holidayForgiveness" TEXT,
ADD COLUMN     "interestChargedWithoutForgiveness" TEXT,
ADD COLUMN     "interestRepaymentDue" TEXT,
ADD COLUMN     "notesOnPayment" TEXT,
ADD COLUMN     "par14" TEXT,
ADD COLUMN     "par30" TEXT,
ADD COLUMN     "paymentOverdue" TEXT,
ADD COLUMN     "principalRepaymentDue" TEXT,
ADD COLUMN     "principalRepaymentWithoutForgiveness" TEXT,
ADD COLUMN     "vehicleInsuranceFeesOwedToInsurer" TEXT,
ADD COLUMN     "vehicleInsurancePaymentDue" TEXT,
ADD COLUMN     "vehicleInsurancePaymentDueWithoutForgiveness" TEXT,
ADD COLUMN     "vehicleInsurancePremiumDueWithForgiveness" TEXT,
ADD COLUMN     "vehicleInsurancePremiumDueWithoutForgiveness" TEXT,
ADD COLUMN     "vehicleInsuranceSurchargeDueWithForgiveness" TEXT,
ADD COLUMN     "vehicleInsuranceSurchargeDueWithoutForgiveness" TEXT;

-- AlterTable
ALTER TABLE "InvestmentCommittee" DROP COLUMN "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndT",
DROP COLUMN "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCol",
ADD COLUMN     "annualExpenseEstimateExcludingPayrollRentDebtOwnersDrawFoodAndTransport" TEXT,
ADD COLUMN     "lesserOfAnnualRevenueFromBankaAndMPesaStatementsAnd75PercentCollections" TEXT;

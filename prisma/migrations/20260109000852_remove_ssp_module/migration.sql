/*
  Warnings:

  - You are about to drop the column `totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn` on the `Loan` table. All the data in the column will be lost.
  - You are about to drop the column `customerId` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `logo` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the column `url` on the `schools` table. All the data in the column will be lost.
  - You are about to drop the `CropsInFarm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Driver` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerFarm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FarmerUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Maintenance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRequestCrops` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceRequestService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SspBidding` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SspSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SspUser` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Trip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vehicle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `buses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `parent_addresses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `route_students` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `routes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `school_drivers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `school_minders` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `school_parents` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `students` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CropsInFarm" DROP CONSTRAINT "CropsInFarm_cropId_fkey";

-- DropForeignKey
ALTER TABLE "CropsInFarm" DROP CONSTRAINT "CropsInFarm_farmId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_userId_fkey";

-- DropForeignKey
ALTER TABLE "FarmerFarm" DROP CONSTRAINT "FarmerFarm_countyId_fkey";

-- DropForeignKey
ALTER TABLE "FarmerFarm" DROP CONSTRAINT "FarmerFarm_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "FarmerUser" DROP CONSTRAINT "FarmerUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "Maintenance" DROP CONSTRAINT "Maintenance_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "Pesticide" DROP CONSTRAINT "Pesticide_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Pesticide" DROP CONSTRAINT "Pesticide_lastUpdatedById_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_assignedSspId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_farmId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequest" DROP CONSTRAINT "ServiceRequest_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequestCrops" DROP CONSTRAINT "ServiceRequestCrops_cropId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequestCrops" DROP CONSTRAINT "ServiceRequestCrops_serviceRequestId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequestService" DROP CONSTRAINT "ServiceRequestService_serviceRequestId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceRequestService" DROP CONSTRAINT "ServiceRequestService_serviceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "SspBidding" DROP CONSTRAINT "SspBidding_farmerId_fkey";

-- DropForeignKey
ALTER TABLE "SspBidding" DROP CONSTRAINT "SspBidding_serviceRequestId_fkey";

-- DropForeignKey
ALTER TABLE "SspBidding" DROP CONSTRAINT "SspBidding_sspId_fkey";

-- DropForeignKey
ALTER TABLE "SspSchedule" DROP CONSTRAINT "SspSchedule_serviceRequestId_fkey";

-- DropForeignKey
ALTER TABLE "SspSchedule" DROP CONSTRAINT "SspSchedule_sspId_fkey";

-- DropForeignKey
ALTER TABLE "SspUser" DROP CONSTRAINT "SspUser_countyId_fkey";

-- DropForeignKey
ALTER TABLE "SspUser" DROP CONSTRAINT "SspUser_userId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_driverId_fkey";

-- DropForeignKey
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_vehicleId_fkey";

-- DropForeignKey
ALTER TABLE "buses" DROP CONSTRAINT "buses_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "parent_addresses" DROP CONSTRAINT "parent_addresses_parentId_fkey";

-- DropForeignKey
ALTER TABLE "route_students" DROP CONSTRAINT "route_students_routeId_fkey";

-- DropForeignKey
ALTER TABLE "route_students" DROP CONSTRAINT "route_students_studentId_fkey";

-- DropForeignKey
ALTER TABLE "routes" DROP CONSTRAINT "routes_busId_fkey";

-- DropForeignKey
ALTER TABLE "routes" DROP CONSTRAINT "routes_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "school_drivers" DROP CONSTRAINT "school_drivers_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "school_minders" DROP CONSTRAINT "school_minders_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "school_parents" DROP CONSTRAINT "school_parents_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "schools" DROP CONSTRAINT "schools_customerId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_parentId_fkey";

-- DropForeignKey
ALTER TABLE "students" DROP CONSTRAINT "students_schoolId_fkey";

-- AlterTable
ALTER TABLE "Loan" DROP COLUMN "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleIn",
ADD COLUMN     "totalLiabilityAmountIncludingPenaltiesAndComprehensiveVehicleInsurance" TEXT;

-- AlterTable
ALTER TABLE "schools" DROP COLUMN "customerId",
DROP COLUMN "latitude",
DROP COLUMN "logo",
DROP COLUMN "longitude",
DROP COLUMN "url";

-- DropTable
DROP TABLE "CropsInFarm";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "Driver";

-- DropTable
DROP TABLE "FarmerFarm";

-- DropTable
DROP TABLE "FarmerUser";

-- DropTable
DROP TABLE "Maintenance";

-- DropTable
DROP TABLE "ServiceRequest";

-- DropTable
DROP TABLE "ServiceRequestCrops";

-- DropTable
DROP TABLE "ServiceRequestService";

-- DropTable
DROP TABLE "SspBidding";

-- DropTable
DROP TABLE "SspSchedule";

-- DropTable
DROP TABLE "SspUser";

-- DropTable
DROP TABLE "Trip";

-- DropTable
DROP TABLE "Vehicle";

-- DropTable
DROP TABLE "buses";

-- DropTable
DROP TABLE "parent_addresses";

-- DropTable
DROP TABLE "route_students";

-- DropTable
DROP TABLE "routes";

-- DropTable
DROP TABLE "school_drivers";

-- DropTable
DROP TABLE "school_minders";

-- DropTable
DROP TABLE "school_parents";

-- DropTable
DROP TABLE "students";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "RiderType";

-- DropEnum
DROP TYPE "TripStatus";

-- DropEnum
DROP TYPE "TripType";

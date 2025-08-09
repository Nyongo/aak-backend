import { IsString, IsOptional, IsArray, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateFinancialSurveyDto {
  @IsString()
  creditApplicationId: string;

  @IsString()
  @IsOptional()
  surveyDate?: string;

  @IsString()
  @IsOptional()
  directorId?: string;

  // School Information
  @IsArray()
  @IsOptional()
  schoolGrades?: string[];

  @IsString()
  @IsIn(['APBET', 'Private'])
  @IsOptional()
  isSchoolAPBETOrPrivate?: 'APBET' | 'Private';

  // Church Support
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  isChurchSupported?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  churchName?: string;

  @IsString()
  @IsOptional()
  churchAnnualSupport?: string;

  @IsString()
  @IsOptional()
  churchBenefits?: string;

  // Facilities
  @IsString()
  @IsIn(['Rent', 'Lease', 'Own'])
  @IsOptional()
  facilityOwnership?: 'Rent' | 'Lease' | 'Own';

  @IsString()
  @IsOptional()
  annualLeaseRent?: string;

  @IsString()
  @IsOptional()
  ownerAnnualWithdrawal?: string;

  @IsString()
  @IsOptional()
  monthlyDebtPayments?: string;

  // Meals
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    return value;
  })
  providesMeals?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  termlyFoodExpense?: string;

  @IsString()
  @IsOptional()
  termlyFuelExpense?: string;

  // Academic Expenses
  @IsString()
  @IsOptional()
  annualStudentTextbookExpense?: string;

  @IsString()
  @IsOptional()
  annualTeacherTextbookExpense?: string;

  @IsString()
  @IsOptional()
  termlyStationeryExpense?: string;

  // Utility Expenses
  @IsString()
  @IsOptional()
  monthlyWifiExpense?: string;

  @IsString()
  @IsOptional()
  termlyAirtimeExpense?: string;

  @IsString()
  @IsOptional()
  monthlyWaterExpense?: string;

  @IsString()
  @IsOptional()
  termlyMiscExpense?: string;

  @IsString()
  @IsOptional()
  annualTaxLicenseExpense?: string;

  @IsString()
  @IsOptional()
  monthlyElectricityExpense?: string;

  // Transportation
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    return value;
  })
  hasVehicles?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  termlyVehicleServiceExpense?: string;

  @IsString()
  @IsOptional()
  termlyVehicleFuelExpense?: string;

  @IsString()
  @IsOptional()
  totalVehiclePurchaseExpense?: string;

  // Asset & Maintenance
  @IsString()
  @IsOptional()
  annualEquipmentFurnitureExpense?: string;

  @IsString()
  @IsOptional()
  annualRepairMaintenanceExpense?: string;

  // Additional Revenue
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    return value;
  })
  hasOtherRevenue?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  otherRevenueSources?: string;

  @IsString()
  @IsOptional()
  annualOtherRevenue?: string;

  // Sponsorships
  @IsString()
  @IsOptional()
  sponsoredChildrenCount?: string;

  @IsString()
  @IsOptional()
  annualSponsorshipRevenue?: string;

  // Asset Values
  @IsString()
  @IsOptional()
  lastYearAssetValue?: string;

  @IsString()
  @IsOptional()
  lastYearLoanDeposits?: string;

  @IsString()
  @IsOptional()
  previousYearStudentCount?: string;

  // Donations
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    return value;
  })
  receivesSignificantDonations?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  annualDonationRevenue?: string;

  // Future Planning
  @IsString()
  @IsOptional()
  majorProjectsAndMitigation?: string;

  @IsString()
  @IsOptional()
  nextYearExpectedStudents?: string;

  @IsString()
  @IsOptional()
  twoYearsAgoAssetValue?: string;

  // Banking & Financial History
  @IsString()
  @IsOptional()
  currentBankBalance?: string;

  @IsString()
  @IsOptional()
  yearsAtCurrentPremises?: string;

  @IsString()
  @IsOptional()
  yearsWithBankAccount?: string;

  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    if (value === '') return undefined;
    return value;
  })
  hasAuditedFinancials?: 'TRUE' | 'FALSE';

  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return value;
  })
  branchCount?: string;

  // Alternative field name from frontend
  @IsString()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '') return undefined;
    return value;
  })
  numberOfBranches?: string;

  // Borrowing History
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    if (value === '') return undefined;
    return value;
  })
  hasMicrofinanceBorrowing?: 'TRUE' | 'FALSE';

  // Alternative field name from frontend
  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    if (value === '') return undefined;
    return value;
  })
  hasMicrofinanceBorrowingHistory?: 'TRUE' | 'FALSE';

  @IsString()
  @IsIn(['TRUE', 'FALSE'])
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'Yes') return 'TRUE';
    if (value === 'No') return 'FALSE';
    if (value === '') return undefined;
    return value;
  })
  hasFormalBankBorrowing?: 'TRUE' | 'FALSE';
}

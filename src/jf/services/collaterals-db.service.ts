import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollateralsDbService {
  private readonly logger = new Logger(CollateralsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async countAll() {
    return this.prisma.collateral.count();
  }

  extractSheetId(record: any): string | null {
    return (
      record['ID'] ||
      record['Sheet ID'] ||
      record['sheetId'] ||
      record['Id'] ||
      null
    );
  }

  convertSheetToDb(record: any) {
    return {
      sheetId: this.extractSheetId(record),
      directLoanId: record['Direct Loan ID'] || null,
      schoolId: record['School ID'] || null,
      type: record['Type'] || null,
      description: record['Description'] || null,
      originalTitleDeedCollected:
        record['Original Title Deed Collected?'] || null,
      originalTitleDeedPhoto: record['Original Title Deed Photo'] || null,
      titleNumber: record['Title Number'] || null,
      landSecuritizationComplete:
        record['Land securitization complete?'] || null,
      vehicleLicensePlateDetails:
        record['Vehicle License Plate Details'] || null,
      comprehensiveInsuranceRegistered:
        record['Comprehensive Insurance Registered?'] || null,
      comprehensiveInsuranceThrough:
        record['Comprehensive Insurance Through Jackfruit or through School'] ||
        null,
      comprehensiveInsuranceCoverageImage:
        record['Comprehensive Insurance Coverage Image'] || null,
      financiersInterestedRegistered:
        record["Financier's Interested Registered?"] || null,
      confirmationOfFinanciersInterest:
        record["Confirmation of Financier's Interest"] || null,
      originalLogbookCollected: record['Original Logbook Collected?'] || null,
      ownershipAcceptedOnNtsaPortal:
        record['Ownership Accepted on NTSA Portal?'] || null,
      newLogbookCollected: record['New Logbook Collected?'] || null,
      uploadOfLogbookIssuedAfterJointTransfer:
        record['Upload of Logbook Issued After Joint Transfer'] || null,
      photoOfLogbookIssuedAfterJointTransfer:
        record['Photo of Logbook Issued After Joint Transfer'] || null,
      trackerInstalled: record['Tracker Installed?'] || null,
      cc: record['CC'] || null,
      yearOfManufacture: record['Year of Manufacture'] || null,
      comprehensiveInsuranceExpirationDate:
        record['Comprehensive Insurance Expiration Date'] || null,
      evaluatorsReport: record['Evaluators Report'] || null,
      evaluatorsAssessedMarketValueKes:
        record['Evaluators Assessed Market Value (KES)'] || null,
      evaluatorsAssessedForcedValueKes:
        record['Evaluators Assessed Forced Value (KES)'] || null,
      legalOwnerOfCollateral: record['Legal Owner of Collateral'] || null,
      userId: record['User ID'] || null,
      fullOwnerDetails: record['Full Owner Details'] || null,
      percentComplete: record['% Complete'] || null,
      originalOrNewTitlesHeld: record['Original or New Titles Held  '] || null,
      createdAtSheet: record['Created At'] || null,
      createdBy: record['Created By'] || null,
      reasonDeedNotHeldIfMissing:
        record['Reason Deed not Held, if Missing'] || null,
      landChargesHeld: record['Land Charges Held'] || null,
      chargeStatusId: record['Charge Status ID'] || null,
      instructions: record['Instructions'] || null,
      clerkAssigned: record['Clerk Assigned'] || null,
      dateCollateralSecured: record['Date Collateral Secured'] || null,
      schoolSitsOnLand: record['School sits on land?'] || null,
      collateralOwnedByDirectorOfSchool:
        record['Collateral owned by director of school?'] || null,
      status: record['Status'] || null,
      sslId: record['SSL ID'] || null,
      rawData: record,
    };
  }

  async findBySheetId(sheetId: string) {
    return this.prisma.collateral.findUnique({
      where: { sheetId },
    });
  }

  async create(data: any) {
    return this.prisma.collateral.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.collateral.update({
      where: { id },
      data,
    });
  }
}


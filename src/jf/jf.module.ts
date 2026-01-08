import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import * as cacheStore from 'cache-manager-memory-store';
import { GoogleAuthService } from './services/google-auth.service';
import { GoogleDriveService } from './services/google-drive.service';
import { SpreadsheetService } from './services/spread-sheet.service';
import { CaseStudySectionsService } from './services/case-study-sections.service';
import { SpreadsheetController } from './controllers/spread-sheet.controller';
import { NotificationController } from './controllers/notification.controller';
import { AppSheetService } from './services/appsheet.service';
import { SheetsService } from './services/sheets.service';
import { UsersService } from './services/users.service';
import { AppSheetController } from './controllers/appsheet.controller';
import { BorrowersController } from './controllers/borrowers.controller';
import { BorrowersControllerSheets } from './controllers/borrowers.controller.sheets';
import { DirectorsController } from './controllers/directors.controller';
import { CrbConsentController } from './controllers/crb-consent.controller';
import { CreditApplicationsController } from './controllers/credit-applications.controller';
import { ActiveDebtsController } from './controllers/active-debts.controller';
import { FeePlansController } from './controllers/fee-plans.controller';
import { PayrollController } from './controllers/payroll.controller';
import { EnrollmentController } from './controllers/enrollment.controller';
import { EnrollmentReportsController } from './controllers/enrollment-reports.controller';
import { MpesaBankStatementController } from './controllers/mpesa-bank-statement.controller';
import { AuditedFinancialsController } from './controllers/audited-financials.controller';
import { OtherSupportingDocsController } from './controllers/other-supporting-docs.controller';
import { EnrollmentVerificationController } from './controllers/enrollment-verification.controller';
import { StudentBreakdownController } from './controllers/student-breakdown.controller';
import { InvestmentCommitteeController } from './controllers/investment-committee.controller';
import { CreditApplicationCommentsController } from './controllers/credit-application-comments.controller';
import { VendorDisbursementDetailsController } from './controllers/vendor-disbursement-details.controller';
import { ImpactSurveyController } from './controllers/impact-survey.controller';
import { FinancialSurveyController } from './controllers/financial-survey.controller';
import { HomeVisitController } from './controllers/home-visit.controller';
import { AssetTitlesController } from './controllers/asset-titles.controller';
import { ReferrersController } from './controllers/referrers.controller';
import { TermsController } from './controllers/terms.controller';
import { ContractDetailsController } from './controllers/contract-details.controller';
import { SchoolPhotosController } from './controllers/school-photos.controller';
import { LoansController } from './controllers/loans.controller';
import { CaseStudySectionsController } from './controllers/case-study-sections.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NewslettersController } from './controllers/newsletters.controller';
import { NewsletterSectionsController } from './controllers/newsletter-sections.controller';
import { NewslettersService } from './services/newsletters.service';
import { NewsletterSectionsService } from './services/newsletter-sections.service';
import { MailService } from 'src/common/services/mail.service';
import { CaseStudiesController } from './controllers/case-studies.controller';
import { CaseStudiesService } from './services/case-studies.service';
import { BorrowersDbService } from './services/borrowers-db.service';
import { BorrowersSyncService } from './services/borrowers-sync.service';
import { DirectorsDbService } from './services/directors-db.service';
import { DirectorsSyncService } from './services/directors-sync.service';
import { CrbConsentDbService } from './services/crb-consent-db.service';
import { CrbConsentSyncService } from './services/crb-consent-sync.service';
import { ReferrersDbService } from './services/referrers-db.service';
import { ReferrersSyncService } from './services/referrers-sync.service';
import { CreditApplicationsDbService } from './services/credit-applications-db.service';
import { CreditApplicationsSyncService } from './services/credit-applications-sync.service';
import { ActiveDebtsDbService } from './services/active-debts-db.service';
import { ActiveDebtsSyncService } from './services/active-debts-sync.service';
import { FeePlansDbService } from './services/fee-plans-db.service';
import { FeePlansSyncService } from './services/fee-plans-sync.service';
import { PayrollDbService } from './services/payroll-db.service';
import { PayrollSyncService } from './services/payroll-sync.service';
import { EnrollmentVerificationDbService } from './services/enrollment-verification-db.service';
import { EnrollmentVerificationSyncService } from './services/enrollment-verification-sync.service';
import { MpesaBankStatementDbService } from './services/mpesa-bank-statement-db.service';
import { MpesaBankStatementSyncService } from './services/mpesa-bank-statement-sync.service';
import { AuditedFinancialsDbService } from './services/audited-financials-db.service';
import { AuditedFinancialsSyncService } from './services/audited-financials-sync.service';
import { StudentBreakdownDbService } from './services/student-breakdown-db.service';
import { StudentBreakdownSyncService } from './services/student-breakdown-sync.service';
import { OtherSupportingDocsDbService } from './services/other-supporting-docs-db.service';
import { OtherSupportingDocsSyncService } from './services/other-supporting-docs-sync.service';
import { InvestmentCommitteeDbService } from './services/investment-committee-db.service';
import { InvestmentCommitteeSyncService } from './services/investment-committee-sync.service';
import { VendorDisbursementDetailsDbService } from './services/vendor-disbursement-details-db.service';
import { VendorDisbursementDetailsSyncService } from './services/vendor-disbursement-details-sync.service';
import { HomeVisitDbService } from './services/home-visit-db.service';
import { HomeVisitSyncService } from './services/home-visit-sync.service';
import { AssetTitleDbService } from './services/asset-title-db.service';
import { AssetTitleSyncService } from './services/asset-title-sync.service';
import { ContractDetailsDbService } from './services/contract-details-db.service';
import { ContractDetailsSyncService } from './services/contract-details-sync.service';
import { CreditApplicationCommentsDbService } from './services/credit-application-comments-db.service';
import { CreditApplicationCommentsSyncService } from './services/credit-application-comments-sync.service';
import { FinancialSurveysDbService } from './services/financial-surveys-db.service';
import { FinancialSurveysSyncService } from './services/financial-surveys-sync.service';
import { MlDataService } from './services/ml-data.service';
import { MlDataController } from './controllers/ml-data.controller';
import { BorrowersMigrationController } from './controllers/borrowers-migration.controller';
import { DirectorsMigrationController } from './controllers/directors-migration.controller';
import { CrbConsentsMigrationController } from './controllers/crb-consents-migration.controller';
import { ReferrersMigrationController } from './controllers/referrers-migration.controller';
import { CreditApplicationsMigrationController } from './controllers/credit-applications-migration.controller';
import { ActiveDebtsMigrationController } from './controllers/active-debts-migration.controller';
import { FeePlansMigrationController } from './controllers/fee-plans-migration.controller';
import { PayrollMigrationController } from './controllers/payroll-migration.controller';
import { EnrollmentVerificationMigrationController } from './controllers/enrollment-verification-migration.controller';
import { MpesaBankStatementMigrationController } from './controllers/mpesa-bank-statement-migration.controller';
import { AuditedFinancialsMigrationController } from './controllers/audited-financials-migration.controller';
import { StudentBreakdownMigrationController } from './controllers/student-breakdown-migration.controller';
import { OtherSupportingDocsMigrationController } from './controllers/other-supporting-docs-migration.controller';
import { InvestmentCommitteeMigrationController } from './controllers/investment-committee-migration.controller';
import { VendorDisbursementDetailsMigrationController } from './controllers/vendor-disbursement-details-migration.controller';
import { FinancialSurveysMigrationController } from './controllers/financial-surveys-migration.controller';
import { HomeVisitsMigrationController } from './controllers/home-visits-migration.controller';
import { AssetTitlesMigrationController } from './controllers/asset-titles-migration.controller';
import { ContractDetailsMigrationController } from './controllers/contract-details-migration.controller';
import { CreditApplicationCommentsMigrationController } from './controllers/credit-application-comments-migration.controller';
import { DirectPaymentSchedulesController } from './controllers/direct-payment-schedules.controller';
import { DirectPaymentSchedulesMigrationController } from './controllers/direct-payment-schedules-migration.controller';
import { PrincipalTranchesController } from './controllers/principal-tranches.controller';
import { PrincipalTranchesMigrationController } from './controllers/principal-tranches-migration.controller';
import { DirectLendingProcessingController } from './controllers/direct-lending-processing.controller';
import { DirectLendingProcessingMigrationController } from './controllers/direct-lending-processing-migration.controller';
import { ImpactSurveyMigrationController } from './controllers/impact-survey-migration.controller';
import { DirectPaymentSchedulesDbService } from './services/direct-payment-schedules-db.service';
import { DirectPaymentSchedulesSyncService } from './services/direct-payment-schedules-sync.service';
import { PrincipalTranchesDbService } from './services/principal-tranches-db.service';
import { PrincipalTranchesSyncService } from './services/principal-tranches-sync.service';
import { DirectLendingProcessingDbService } from './services/direct-lending-processing-db.service';
import { DirectLendingProcessingSyncService } from './services/direct-lending-processing-sync.service';
import { ImpactSurveyDbService } from './services/impact-survey-db.service';
import { ImpactSurveySyncService } from './services/impact-survey-sync.service';
import { LoansService } from './services/loans.service';
import { LoansMigrationController } from './controllers/loans-migration.controller';

import { DirectorsControllerSheets } from './controllers/directors.controller.sheets';
import { CommonModule } from '../common/common.module';
import { FileUploadService } from './services/file-upload.service';
import { BackgroundUploadService } from './services/background-upload.service';
import { JFNetworkContactPageService } from './services/jf-network-contact-page.service';
import { JFNetworkContactPageController } from './controllers/jf-network-contact-page.controller';
import { LeadsController } from './controllers/leads.controller';
import { ZohoCrmService } from './services/zoho-crm.service';
import { CbsService } from './services/cbs.service';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true, // Make cache accessible globally
      store: cacheStore.memoryStore,
      ttl: 600, // Cache TTL in seconds (e.g., 600 = 10 minutes)
      // max: 100, // Optional: Max number of items in cache
    }),
    ScheduleModule.forRoot(),
    CommonModule,
  ],
  providers: [
    GoogleAuthService,
    GoogleDriveService,
    SpreadsheetService,
    MailService,
    AppSheetService,
    SheetsService,
    UsersService,
    CaseStudiesService,
    CaseStudySectionsService,
    NewslettersService,
    NewsletterSectionsService,
    PrismaService,
    BorrowersDbService,
    BorrowersSyncService,
    DirectorsDbService,
    DirectorsSyncService,
    CrbConsentDbService,
    CrbConsentSyncService,
    ReferrersDbService,
    ReferrersSyncService,
    CreditApplicationsDbService,
    CreditApplicationsSyncService,
    ActiveDebtsDbService,
    ActiveDebtsSyncService,
    FeePlansDbService,
    FeePlansSyncService,
    PayrollDbService,
    PayrollSyncService,
    EnrollmentVerificationDbService,
    EnrollmentVerificationSyncService,
    MpesaBankStatementDbService,
    MpesaBankStatementSyncService,
    AuditedFinancialsDbService,
    AuditedFinancialsSyncService,
    StudentBreakdownDbService,
    StudentBreakdownSyncService,
    OtherSupportingDocsDbService,
    OtherSupportingDocsSyncService,
    InvestmentCommitteeDbService,
    InvestmentCommitteeSyncService,
    VendorDisbursementDetailsDbService,
    VendorDisbursementDetailsSyncService,
    HomeVisitDbService,
    HomeVisitSyncService,
    AssetTitleDbService,
    AssetTitleSyncService,
    ContractDetailsDbService,
    ContractDetailsSyncService,
    CreditApplicationCommentsDbService,
    CreditApplicationCommentsSyncService,
    DirectPaymentSchedulesDbService,
    DirectPaymentSchedulesSyncService,
    PrincipalTranchesDbService,
    PrincipalTranchesSyncService,
    DirectLendingProcessingDbService,
    DirectLendingProcessingSyncService,
    ImpactSurveyDbService,
    ImpactSurveySyncService,
    LoansService,
    FinancialSurveysDbService,
    FinancialSurveysSyncService,
    MlDataService,
    FileUploadService,
    BackgroundUploadService,
    JFNetworkContactPageService,
    ZohoCrmService,
    CbsService,
  ],
  controllers: [
    SpreadsheetController,
    CaseStudiesController,
    CaseStudySectionsController,
    NotificationController,
    AppSheetController,
    BorrowersController,
    BorrowersControllerSheets,
    DirectorsController,
    CrbConsentController,
    CreditApplicationsController,
    ActiveDebtsController,
    FeePlansController,
    PayrollController,
    EnrollmentController,
    EnrollmentReportsController,
    MpesaBankStatementController,
    AuditedFinancialsController,
    OtherSupportingDocsController,
    EnrollmentVerificationController,
    StudentBreakdownController,
    InvestmentCommitteeController,
    CreditApplicationCommentsController,
    VendorDisbursementDetailsController,
    ImpactSurveyController,
    FinancialSurveyController,
    HomeVisitController,
    AssetTitlesController,
    ReferrersController,
    TermsController,
    ContractDetailsController,
    SchoolPhotosController,
    LoansController,
    NewslettersController,
    NewsletterSectionsController,
    MlDataController,
    BorrowersMigrationController,
    DirectorsControllerSheets,
    DirectorsMigrationController,
    CrbConsentsMigrationController,
    ReferrersMigrationController,
    CreditApplicationsMigrationController,
    ActiveDebtsMigrationController,
    FeePlansMigrationController,
    PayrollMigrationController,
    EnrollmentVerificationMigrationController,
    MpesaBankStatementMigrationController,
    AuditedFinancialsMigrationController,
    StudentBreakdownMigrationController,
    OtherSupportingDocsMigrationController,
    InvestmentCommitteeMigrationController,
    VendorDisbursementDetailsMigrationController,
    FinancialSurveysMigrationController,
    HomeVisitsMigrationController,
    AssetTitlesMigrationController,
    ContractDetailsMigrationController,
    CreditApplicationCommentsMigrationController,
    DirectPaymentSchedulesController,
    DirectPaymentSchedulesMigrationController,
    PrincipalTranchesController,
    PrincipalTranchesMigrationController,
    DirectLendingProcessingController,
    DirectLendingProcessingMigrationController,
    ImpactSurveyMigrationController,
    LoansMigrationController,
    JFNetworkContactPageController,
    LeadsController,
  ],
  exports: [GoogleDriveService, SheetsService],
})
export class JfModule {}

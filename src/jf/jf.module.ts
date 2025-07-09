import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
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

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true, // Make cache accessible globally
      store: cacheStore.memoryStore,
      ttl: 600, // Cache TTL in seconds (e.g., 600 = 10 minutes)
      // max: 100, // Optional: Max number of items in cache
    })
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
    PrismaService
  ],
  controllers: [
    SpreadsheetController,
    CaseStudiesController,
    CaseStudySectionsController,
    NotificationController,
    AppSheetController,
    BorrowersController,
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
    NewsletterSectionsController
  ],
})
export class JfModule {}

import { Injectable, Logger } from '@nestjs/common';
import { GoogleDriveService } from './google-drive.service';
import { FileUploadService } from './file-upload.service';
import { DirectorsDbService } from './directors-db.service';
import { DirectorsSyncService } from './directors-sync.service';
import { CrbConsentDbService } from './crb-consent-db.service';
import { CrbConsentSyncService } from './crb-consent-sync.service';
import { ReferrersDbService } from './referrers-db.service';
import { ReferrersSyncService } from './referrers-sync.service';
import { CreditApplicationsDbService } from './credit-applications-db.service';
import { CreditApplicationsSyncService } from './credit-applications-sync.service';
import { ActiveDebtsDbService } from './active-debts-db.service';
import { ActiveDebtsSyncService } from './active-debts-sync.service';
import { FeePlansDbService } from './fee-plans-db.service';
import { FeePlansSyncService } from './fee-plans-sync.service';
import { EnrollmentVerificationDbService } from './enrollment-verification-db.service';
import { EnrollmentVerificationSyncService } from './enrollment-verification-sync.service';
import { MpesaBankStatementDbService } from './mpesa-bank-statement-db.service';
import { MpesaBankStatementSyncService } from './mpesa-bank-statement-sync.service';
import { AuditedFinancialsDbService } from './audited-financials-db.service';
import { AuditedFinancialsSyncService } from './audited-financials-sync.service';
import { OtherSupportingDocsDbService } from './other-supporting-docs-db.service';
import { OtherSupportingDocsSyncService } from './other-supporting-docs-sync.service';
import { VendorDisbursementDetailsDbService } from './vendor-disbursement-details-db.service';
import { VendorDisbursementDetailsSyncService } from './vendor-disbursement-details-sync.service';

interface UploadTask {
  id: string;
  localFilePath: string;
  fileName: string;
  folderId: string;
  mimeType: string;
  retryCount: number;
  maxRetries: number;
  directorId?: number;
  fieldName?: string; // 'nationalIdFront', 'nationalIdBack', 'kraPinPhoto', 'passportPhoto'
  consentId?: number;
  consentFieldName?: string; // 'signature'
  referrerId?: number;
  referrerFieldName?: string; // 'proofOfPayment'
  creditApplicationId?: number;
  creditApplicationFieldName?: string; // 'photoOfCheck'
  activeDebtId?: number;
  activeDebtFieldName?: string; // 'debtStatement'
  feePlanId?: number;
  feePlanFieldName?: string; // 'photo', 'file'
  enrollmentVerificationId?: number;
  enrollmentVerificationFieldName?: string; // 'subCountyEnrollmentReport', 'enrollmentReport'
  mpesaBankStatementId?: number;
  mpesaBankStatementFieldName?: string; // 'statement', 'convertedExcelFile'
  auditedFinancialId?: number;
  auditedFinancialFieldName?: string; // 'file'
  otherSupportingDocId?: number;
  otherSupportingDocFieldName?: string; // 'file', 'image'
  vendorDisbursementDetailId?: number;
  vendorDisbursementDetailFieldName?: string; // 'documentVerifyingPaymentAccount'
  operation?: 'create' | 'update'; // Operation type for sync
}

@Injectable()
export class BackgroundUploadService {
  private readonly logger = new Logger(BackgroundUploadService.name);
  private uploadQueue: UploadTask[] = [];
  private isProcessing = false;
  private readonly USERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_ID;
  private readonly FEE_PLAN_IMAGES_FOLDER_NAME = 'Fee Plan Documents_Images';
  private readonly FEE_PLAN_FILES_FOLDER_NAME = 'Fee Plan Documents_Files_';
  private readonly ENROLLMENT_REPORTS_IMAGES_FOLDER_NAME =
    'Enrollment Reports_Images';
  private readonly ENROLLMENT_REPORTS_FILES_FOLDER_NAME =
    'Enrollment Reports_Files_';
  private readonly FINANCIAL_RECORDS_FILES_FOLDER_NAME =
    'Financial Records_Files_';
  private readonly FINANCIAL_RECORDS_IMAGES_FOLDER_NAME =
    'Financial Records_Images';
  private readonly AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_NAME =
    'Audited Financial Statements_Files_';
  private readonly OTHER_SUPPORTING_DOCS_FILES_FOLDER_NAME =
    'Other Supporting Documents_Files_';
  private readonly VENDOR_DISBURSEMENT_DETAILS_FILES_FOLDER_NAME =
    'Vendor Disbursement Details_Images';

  constructor(
    private readonly googleDriveService: GoogleDriveService,
    private readonly fileUploadService: FileUploadService,
    private readonly directorsDbService: DirectorsDbService,
    private readonly directorsSyncService: DirectorsSyncService,
    private readonly crbConsentDbService: CrbConsentDbService,
    private readonly crbConsentSyncService: CrbConsentSyncService,
    private readonly referrersDbService: ReferrersDbService,
    private readonly referrersSyncService: ReferrersSyncService,
    private readonly creditApplicationsDbService: CreditApplicationsDbService,
    private readonly creditApplicationsSyncService: CreditApplicationsSyncService,
    private readonly activeDebtsDbService: ActiveDebtsDbService,
    private readonly activeDebtsSyncService: ActiveDebtsSyncService,
    private readonly feePlansDbService: FeePlansDbService,
    private readonly feePlansSyncService: FeePlansSyncService,
    private readonly enrollmentVerificationDbService: EnrollmentVerificationDbService,
    private readonly enrollmentVerificationSyncService: EnrollmentVerificationSyncService,
    private readonly mpesaBankStatementDbService: MpesaBankStatementDbService,
    private readonly mpesaBankStatementSyncService: MpesaBankStatementSyncService,
    private readonly auditedFinancialsDbService: AuditedFinancialsDbService,
    private readonly auditedFinancialsSyncService: AuditedFinancialsSyncService,
    private readonly otherSupportingDocsDbService: OtherSupportingDocsDbService,
    private readonly otherSupportingDocsSyncService: OtherSupportingDocsSyncService,
    private readonly vendorDisbursementDetailsDbService: VendorDisbursementDetailsDbService,
    private readonly vendorDisbursementDetailsSyncService: VendorDisbursementDetailsSyncService,
  ) {}

  /**
   * Add a file upload task to the background queue
   */
  async queueFileUpload(
    localFilePath: string,
    fileName: string,
    folderId?: string,
    mimeType?: string,
    directorId?: number,
    fieldName?: string,
    consentId?: number,
    consentFieldName?: string,
    referrerId?: number,
    referrerFieldName?: string,
    creditApplicationId?: number,
    creditApplicationFieldName?: string,
    activeDebtId?: number,
    activeDebtFieldName?: string,
    feePlanId?: number,
    feePlanFieldName?: string,
    enrollmentVerificationId?: number,
    enrollmentVerificationFieldName?: string,
    mpesaBankStatementId?: number,
    mpesaBankStatementFieldName?: string,
    auditedFinancialId?: number,
    auditedFinancialFieldName?: string,
    otherSupportingDocId?: number,
    otherSupportingDocFieldName?: string,
    vendorDisbursementDetailId?: number,
    vendorDisbursementDetailFieldName?: string,
    operation?: 'create' | 'update',
  ): Promise<void> {
    const task: UploadTask = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2)}`,
      localFilePath,
      fileName,
      folderId: folderId || this.USERS_IMAGES_FOLDER_ID,
      mimeType:
        mimeType || this.fileUploadService.getFileMimeType(localFilePath),
      retryCount: 0,
      maxRetries: 3,
      directorId,
      fieldName,
      consentId,
      consentFieldName,
      referrerId,
      referrerFieldName,
      creditApplicationId,
      creditApplicationFieldName,
      activeDebtId,
      activeDebtFieldName,
      feePlanId,
      feePlanFieldName,
      enrollmentVerificationId,
      enrollmentVerificationFieldName,
      mpesaBankStatementId,
      mpesaBankStatementFieldName,
      auditedFinancialId,
      auditedFinancialFieldName,
      otherSupportingDocId,
      otherSupportingDocFieldName,
      vendorDisbursementDetailId,
      vendorDisbursementDetailFieldName,
      operation,
    };

    this.uploadQueue.push(task);
    this.logger.log(
      `Queued file upload: ${fileName} (${task.id}) for active debt: ${activeDebtId}`,
    );

    // Start processing if not already running
    if (!this.isProcessing) {
      this.logger.log(
        `Starting queue processing for ${this.uploadQueue.length} tasks`,
      );
      this.processQueue();
    } else {
      this.logger.log(
        `Queue already processing, ${this.uploadQueue.length} tasks in queue`,
      );
    }
  }

  /**
   * Process the upload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.logger.log(
      `Starting to process ${this.uploadQueue.length} upload tasks`,
    );

    while (this.uploadQueue.length > 0) {
      const task = this.uploadQueue.shift();
      if (!task) continue;

      try {
        await this.processUploadTask(task);
      } catch (error) {
        this.logger.error(`Failed to process upload task ${task.id}:`, error);

        // Retry logic
        if (task.retryCount < task.maxRetries) {
          task.retryCount++;
          this.logger.log(
            `Retrying upload task ${task.id} (attempt ${task.retryCount}/${task.maxRetries})`,
          );

          // Add back to queue with delay
          setTimeout(() => {
            this.uploadQueue.push(task);
          }, 5000 * task.retryCount); // Exponential backoff
        } else {
          this.logger.error(
            `Upload task ${task.id} failed after ${task.maxRetries} attempts`,
          );
        }
      }

      // Add small delay between uploads to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.isProcessing = false;
    this.logger.log('Upload queue processing completed');
  }

  /**
   * Process a single upload task
   */
  private async processUploadTask(task: UploadTask): Promise<void> {
    this.logger.log(
      `Processing upload task: ${task.fileName} (${task.id}) for active debt: ${task.activeDebtId}`,
    );

    // Read file from local storage
    const fileBuffer = await this.fileUploadService.getFileBuffer(
      task.localFilePath,
    );
    if (!fileBuffer) {
      throw new Error(`File not found: ${task.localFilePath}`);
    }

    // Upload to Google Drive
    const googleDriveFile = await this.googleDriveService.uploadFile(
      fileBuffer,
      task.fileName,
      task.mimeType,
      task.folderId,
    );

    this.logger.log(
      `Successfully uploaded to Google Drive: ${task.fileName} (${task.id}) with URL: ${googleDriveFile}`,
    );

    // Update database with Google Drive URL if directorId and fieldName are provided
    if (task.directorId && task.fieldName && googleDriveFile) {
      try {
        const googleDriveUrl = `${process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_NAME}/${task.fileName}`;

        await this.directorsDbService.update(task.directorId.toString(), {
          [task.fieldName]: googleDriveUrl,
        });

        this.logger.log(
          `Updated database for director ${task.directorId}, field ${task.fieldName} with Google Drive URL`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.directorsSyncService.syncDirectorById(task.directorId);
            this.logger.log(
              `Automatically synced director ${task.directorId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync director ${task.directorId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for director ${task.directorId}, field ${task.fieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if consentId and consentFieldName are provided
    if (task.consentId && task.consentFieldName && googleDriveFile) {
      try {
        const googleDriveUrl = `${process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_NAME}/${task.fileName}`;

        await this.crbConsentDbService.update(task.consentId.toString(), {
          [task.consentFieldName]: googleDriveUrl,
        });

        this.logger.log(
          `Updated database for CRB consent ${task.consentId}, field ${task.consentFieldName} with Google Drive URL`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.crbConsentSyncService.syncConsentById(task.consentId);
            this.logger.log(
              `Automatically synced CRB consent ${task.consentId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync CRB consent ${task.consentId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for CRB consent ${task.consentId}, field ${task.consentFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if referrerId and referrerFieldName are provided
    if (task.referrerId && task.referrerFieldName && googleDriveFile) {
      try {
        const googleDriveUrl = `${process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_NAME}/${task.fileName}`;

        await this.referrersDbService.update(task.referrerId.toString(), {
          [task.referrerFieldName]: googleDriveUrl,
        });

        this.logger.log(
          `Updated database for referrer ${task.referrerId}, field ${task.referrerFieldName} with Google Drive URL`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.referrersSyncService.syncReferrerById(task.referrerId);
            this.logger.log(
              `Automatically synced referrer ${task.referrerId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync referrer ${task.referrerId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for referrer ${task.referrerId}, field ${task.referrerFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if creditApplicationId and creditApplicationFieldName are provided
    if (
      task.creditApplicationId &&
      task.creditApplicationFieldName &&
      googleDriveFile
    ) {
      try {
        const googleDriveUrl = `${process.env.GOOGLE_DRIVE_CREDIT_APPLICATIONS_IMAGES_FOLDER_NAME}/${task.fileName}`;

        await this.creditApplicationsDbService.update(
          task.creditApplicationId.toString(),
          {
            [task.creditApplicationFieldName]: googleDriveUrl,
          },
        );

        this.logger.log(
          `Updated database for credit application ${task.creditApplicationId}, field ${task.creditApplicationFieldName} with Google Drive URL`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.creditApplicationsSyncService.syncCreditApplicationById(
              task.creditApplicationId,
            );
            this.logger.log(
              `Automatically synced credit application ${task.creditApplicationId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync credit application ${task.creditApplicationId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for credit application ${task.creditApplicationId}, field ${task.creditApplicationFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if activeDebtId and activeDebtFieldName are provided
    this.logger.log(
      `Checking if should update active debt: activeDebtId=${task.activeDebtId}, activeDebtFieldName=${task.activeDebtFieldName}, googleDriveFile=${googleDriveFile}`,
    );
    if (task.activeDebtId && task.activeDebtFieldName && googleDriveFile) {
      try {
        this.logger.log(
          `Attempting to update active debt ${task.activeDebtId} with Google Drive file`,
        );
        // googleDriveFile is already the Google Drive file ID or web view link
        const googleDriveUrl = googleDriveFile;

        // We need to get the sheetId first since the update method expects sheetId, not database ID
        const activeDebt = await this.activeDebtsDbService.findById(
          task.activeDebtId.toString(),
        );
        if (!activeDebt) {
          this.logger.error(
            `Active debt with ID ${task.activeDebtId} not found`,
          );
          return;
        }

        // Construct the Google Drive path in the same format as before: FOLDER_NAME/filename
        const googleDrivePath = `${process.env.GOOGLE_DRIVE_ACTIVE_DEBT_FILES_FOLDER_NAME}/${task.fileName}`;

        await this.activeDebtsDbService.update(activeDebt.sheetId, {
          [task.activeDebtFieldName]: googleDrivePath,
        });

        this.logger.log(
          `Successfully updated database for active debt ${task.activeDebtId}, field ${task.activeDebtFieldName} with Google Drive path: ${googleDrivePath}`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.activeDebtsSyncService.syncActiveDebtById(
              task.activeDebtId,
            );
            this.logger.log(
              `Automatically synced active debt ${task.activeDebtId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync active debt ${task.activeDebtId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for active debt ${task.activeDebtId}, field ${task.activeDebtFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if feePlanId and feePlanFieldName are provided
    if (task.feePlanId && task.feePlanFieldName && googleDriveFile) {
      try {
        this.logger.log(
          `Attempting to update fee plan ${task.feePlanId} with Google Drive file`,
        );
        // googleDriveFile is already the Google Drive file ID or web view link
        const googleDriveUrl = googleDriveFile;

        // We need to get the sheetId first since the update method expects sheetId, not database ID
        const feePlan = await this.feePlansDbService.findById(
          task.feePlanId.toString(),
        );
        if (!feePlan) {
          this.logger.error(`Fee plan with ID ${task.feePlanId} not found`);
          return;
        }

        // Construct the Google Drive path in the same format as before: FOLDER_NAME/filename
        let googleDrivePath;
        if (task.feePlanFieldName === 'photo') {
          googleDrivePath = `${this.FEE_PLAN_IMAGES_FOLDER_NAME}/${task.fileName}`;
        } else {
          googleDrivePath = `${this.FEE_PLAN_FILES_FOLDER_NAME}/${task.fileName}`;
        }

        await this.feePlansDbService.update(feePlan.sheetId, {
          [task.feePlanFieldName]: googleDrivePath,
        });

        this.logger.log(
          `Successfully updated database for fee plan ${task.feePlanId}, field ${task.feePlanFieldName} with Google Drive path: ${googleDrivePath}`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.feePlansSyncService.syncFeePlanById(task.feePlanId);
            this.logger.log(
              `Automatically synced fee plan ${task.feePlanId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync fee plan ${task.feePlanId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for fee plan ${task.feePlanId}, field ${task.feePlanFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if enrollmentVerificationId and enrollmentVerificationFieldName are provided
    if (
      task.enrollmentVerificationId &&
      task.enrollmentVerificationFieldName &&
      googleDriveFile
    ) {
      try {
        this.logger.log(
          `Attempting to update enrollment verification ${task.enrollmentVerificationId} with Google Drive file`,
        );
        // googleDriveFile is already the Google Drive file ID or web view link
        const googleDriveUrl = googleDriveFile;

        // We need to get the sheetId first since the update method expects sheetId, not database ID
        const enrollmentVerification =
          await this.enrollmentVerificationDbService.findById(
            task.enrollmentVerificationId.toString(),
          );
        if (!enrollmentVerification) {
          this.logger.error(
            `Enrollment verification with ID ${task.enrollmentVerificationId} not found`,
          );
          return;
        }

        // Construct the Google Drive path in the same format as before: FOLDER_NAME/filename
        let googleDrivePath;
        if (
          task.enrollmentVerificationFieldName === 'subCountyEnrollmentReport'
        ) {
          googleDrivePath = `${this.ENROLLMENT_REPORTS_IMAGES_FOLDER_NAME}/${task.fileName}`;
        } else {
          googleDrivePath = `${this.ENROLLMENT_REPORTS_FILES_FOLDER_NAME}/${task.fileName}`;
        }

        await this.enrollmentVerificationDbService.update(
          enrollmentVerification.sheetId,
          {
            [task.enrollmentVerificationFieldName]: googleDrivePath,
          },
        );

        this.logger.log(
          `Successfully updated database for enrollment verification ${task.enrollmentVerificationId}, field ${task.enrollmentVerificationFieldName} with Google Drive path: ${googleDrivePath}`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.enrollmentVerificationSyncService.syncEnrollmentVerificationById(
              task.enrollmentVerificationId,
            );
            this.logger.log(
              `Automatically synced enrollment verification ${task.enrollmentVerificationId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync enrollment verification ${task.enrollmentVerificationId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for enrollment verification ${task.enrollmentVerificationId}, field ${task.enrollmentVerificationFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if mpesaBankStatementId and mpesaBankStatementFieldName are provided
    if (
      task.mpesaBankStatementId &&
      task.mpesaBankStatementFieldName &&
      googleDriveFile
    ) {
      try {
        this.logger.log(
          `Attempting to update mpesa bank statement ${task.mpesaBankStatementId} with Google Drive file`,
        );
        // googleDriveFile is already the Google Drive file ID or web view link
        const googleDriveUrl = googleDriveFile;

        // We need to get the sheetId first since the update method expects sheetId, not database ID
        const mpesaBankStatement =
          await this.mpesaBankStatementDbService.findById(
            task.mpesaBankStatementId.toString(),
          );
        if (!mpesaBankStatement) {
          this.logger.error(
            `Mpesa bank statement with ID ${task.mpesaBankStatementId} not found`,
          );
          return;
        }

        // Construct the Google Drive path in the same format as before: FOLDER_NAME/filename
        let googleDrivePath;
        if (task.mpesaBankStatementFieldName === 'statement') {
          googleDrivePath = `${this.FINANCIAL_RECORDS_FILES_FOLDER_NAME}/${task.fileName}`;
        } else {
          googleDrivePath = `${this.FINANCIAL_RECORDS_FILES_FOLDER_NAME}/${task.fileName}`;
        }

        await this.mpesaBankStatementDbService.update(
          mpesaBankStatement.sheetId,
          {
            [task.mpesaBankStatementFieldName]: googleDrivePath,
          },
        );

        this.logger.log(
          `Successfully updated database for mpesa bank statement ${task.mpesaBankStatementId}, field ${task.mpesaBankStatementFieldName} with Google Drive path: ${googleDrivePath}`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.mpesaBankStatementSyncService.syncMpesaBankStatementById(
              task.mpesaBankStatementId,
            );
            this.logger.log(
              `Automatically synced mpesa bank statement ${task.mpesaBankStatementId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync mpesa bank statement ${task.mpesaBankStatementId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for mpesa bank statement ${task.mpesaBankStatementId}, field ${task.mpesaBankStatementFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if auditedFinancialId and auditedFinancialFieldName are provided
    if (
      task.auditedFinancialId &&
      task.auditedFinancialFieldName &&
      googleDriveFile
    ) {
      try {
        this.logger.log(
          `Attempting to update audited financial ${task.auditedFinancialId} with Google Drive file`,
        );
        // googleDriveFile is already the Google Drive file ID or web view link
        const googleDriveUrl = googleDriveFile;

        // We need to get the sheetId first since the update method expects sheetId, not database ID
        const auditedFinancial = await this.auditedFinancialsDbService.findById(
          task.auditedFinancialId.toString(),
        );
        if (!auditedFinancial) {
          this.logger.error(
            `Audited financial with ID ${task.auditedFinancialId} not found`,
          );
          return;
        }

        // Construct the Google Drive path in the same format as before: FOLDER_NAME/filename
        const googleDrivePath = `${this.AUDITED_FINANCIAL_STATEMENTS_FILES_FOLDER_NAME}/${task.fileName}`;

        await this.auditedFinancialsDbService.update(auditedFinancial.sheetId, {
          [task.auditedFinancialFieldName]: googleDrivePath,
        });

        this.logger.log(
          `Successfully updated database for audited financial ${task.auditedFinancialId}, field ${task.auditedFinancialFieldName} with Google Drive path: ${googleDrivePath}`,
        );

        // Database updated with Google Drive URL
        // Trigger automatic sync after a delay to update Google Sheets
        setTimeout(async () => {
          try {
            await this.auditedFinancialsSyncService.syncAuditedFinancialById(
              task.auditedFinancialId,
            );
            this.logger.log(
              `Automatically synced audited financial ${task.auditedFinancialId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync audited financial ${task.auditedFinancialId} after file upload:`,
              syncError,
            );
          }
        }, 5000); // 5 second delay to ensure database update is complete
      } catch (error) {
        this.logger.error(
          `Failed to update database for audited financial ${task.auditedFinancialId}, field ${task.auditedFinancialFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if otherSupportingDocId and otherSupportingDocFieldName are provided
    if (
      task.otherSupportingDocId &&
      task.otherSupportingDocFieldName &&
      googleDriveFile
    ) {
      try {
        this.logger.log(
          `Attempting to update other supporting doc ${task.otherSupportingDocId} with Google Drive file`,
        );
        const googleDriveUrl = googleDriveFile;
        const otherSupportingDoc =
          await this.otherSupportingDocsDbService.findById(
            task.otherSupportingDocId.toString(),
          );
        if (!otherSupportingDoc) {
          this.logger.error(
            `Other supporting doc with ID ${task.otherSupportingDocId} not found`,
          );
          return;
        }
        const googleDrivePath = `${this.OTHER_SUPPORTING_DOCS_FILES_FOLDER_NAME}/${task.fileName}`;
        await this.otherSupportingDocsDbService.update(
          otherSupportingDoc.sheetId,
          {
            [task.otherSupportingDocFieldName]: googleDrivePath,
          },
        );
        this.logger.log(
          `Successfully updated database for other supporting doc ${task.otherSupportingDocId}, field ${task.otherSupportingDocFieldName} with Google Drive path: ${googleDrivePath}`,
        );
        setTimeout(async () => {
          try {
            await this.otherSupportingDocsSyncService.syncOtherSupportingDocById(
              task.otherSupportingDocId,
              task.operation,
            );
            this.logger.log(
              `Automatically synced other supporting doc ${task.otherSupportingDocId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync other supporting doc ${task.otherSupportingDocId} after file upload:`,
              syncError,
            );
          }
        }, 5000);
      } catch (error) {
        this.logger.error(
          `Failed to update database for other supporting doc ${task.otherSupportingDocId}, field ${task.otherSupportingDocFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }

    // Update database with Google Drive URL if vendorDisbursementDetailId and vendorDisbursementDetailFieldName are provided
    if (
      task.vendorDisbursementDetailId &&
      task.vendorDisbursementDetailFieldName &&
      googleDriveFile
    ) {
      try {
        this.logger.log(
          `Attempting to update vendor disbursement detail ${task.vendorDisbursementDetailId} with Google Drive file`,
        );
        const googleDriveUrl = googleDriveFile;
        const vendorDisbursementDetail =
          await this.vendorDisbursementDetailsDbService.findById(
            task.vendorDisbursementDetailId.toString(),
          );
        if (!vendorDisbursementDetail) {
          this.logger.error(
            `Vendor disbursement detail with ID ${task.vendorDisbursementDetailId} not found`,
          );
          return;
        }
        const googleDrivePath = `${this.VENDOR_DISBURSEMENT_DETAILS_FILES_FOLDER_NAME}/${task.fileName}`;
        await this.vendorDisbursementDetailsDbService.update(
          vendorDisbursementDetail.sheetId,
          {
            [task.vendorDisbursementDetailFieldName]: googleDrivePath,
          },
        );
        this.logger.log(
          `Successfully updated database for vendor disbursement detail ${task.vendorDisbursementDetailId}, field ${task.vendorDisbursementDetailFieldName} with Google Drive path: ${googleDrivePath}`,
        );
        setTimeout(async () => {
          try {
            await this.vendorDisbursementDetailsSyncService.syncVendorDisbursementDetailById(
              task.vendorDisbursementDetailId,
            );
            this.logger.log(
              `Automatically synced vendor disbursement detail ${task.vendorDisbursementDetailId} to Google Sheets with updated file URL`,
            );
          } catch (syncError) {
            this.logger.error(
              `Failed to auto-sync vendor disbursement detail ${task.vendorDisbursementDetailId} after file upload:`,
              syncError,
            );
          }
        }, 5000);
      } catch (error) {
        this.logger.error(
          `Failed to update database for vendor disbursement detail ${task.vendorDisbursementDetailId}, field ${task.vendorDisbursementDetailFieldName}:`,
          error,
        );
        // Don't throw error here as the file upload was successful
      }
    }
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      queueLength: this.uploadQueue.length,
      isProcessing: this.isProcessing,
      tasks: this.uploadQueue.map((task) => ({
        id: task.id,
        fileName: task.fileName,
        retryCount: task.retryCount,
      })),
    };
  }

  /**
   * Clear the upload queue
   */
  clearQueue(): void {
    this.uploadQueue = [];
    this.logger.log('Upload queue cleared');
  }
}

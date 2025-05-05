import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { CreateCrbConsentDto } from '../dto/create-crb-consent.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/crb-consent')
export class CrbConsentController {
  private readonly logger = new Logger(CrbConsentController.name);
  private readonly SHEET_NAME = 'CRB Consent';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('by-borrower/:borrowerId')
  async getConsentsByBorrower(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(`Fetching CRB consents for borrower: ${borrowerId}`);

      const response = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!response || !response.length) {
        return {
          success: true,
          count: 0,
          data: [],
        };
      }

      const headers = response[0];
      const borrowerIdIndex = headers.findIndex(
        (header) => header === 'Borrower ID',
      );

      if (borrowerIdIndex === -1) {
        throw new Error('Borrower ID column not found in sheet');
      }

      // Filter consents for this borrower
      const consents = response
        .slice(1)
        .filter((row) => row[borrowerIdIndex] === borrowerId)
        .map((row) => {
          const consent = {};
          headers.forEach((header, index) => {
            if (row[index]) {
              consent[header] = row[index];
            }
          });
          return consent;
        });

      return {
        success: true,
        count: consents.length,
        data: consents,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to fetch CRB consents: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('signature'))
  async addConsent(
    @Body() consentData: CreateCrbConsentDto,
    @UploadedFile() signature?: Express.Multer.File,
  ) {
    try {
      this.logger.log(
        `Adding new CRB consent for borrower: ${consentData['Borrower ID']}`,
      );

      // Upload signature if provided
      let signatureUrl = '';
      if (signature) {
        const timestamp = new Date().getTime();
        const filename = `crb_consent_signature_${consentData['Borrower ID']}_${timestamp}.${signature.originalname.split('.').pop()}`;

        signatureUrl = await this.googleDriveService.uploadFile(
          signature.buffer,
          filename,
          signature.mimetype,
        );
      }

      // Generate a unique ID for the consent
      const consentId = `CRB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

      // Prepare consent data with all required fields
      const newConsent = {
        ID: consentId,
        ...consentData,
        Signature: signatureUrl,
        'Created At': new Date().toISOString(),
      };

      // Add to sheet
      await this.sheetsService.appendRow(this.SHEET_NAME, newConsent);

      return {
        success: true,
        data: newConsent,
        message: 'CRB consent added successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to add CRB consent: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get(':consentId')
  async getConsentById(@Param('consentId') consentId: string) {
    try {
      this.logger.log(`Fetching CRB consent: ${consentId}`);

      const response = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!response || !response.length) {
        return {
          success: false,
          error: 'Consent not found',
        };
      }

      const headers = response[0];
      const idIndex = headers.findIndex((header) => header === 'ID');

      if (idIndex === -1) {
        throw new Error('ID column not found in sheet');
      }

      // Find the consent with matching ID
      const consentRow = response
        .slice(1)
        .find((row) => row[idIndex] === consentId);

      if (!consentRow) {
        return {
          success: false,
          error: 'Consent not found',
        };
      }

      // Convert row to object
      const consent = {};
      headers.forEach((header, index) => {
        if (consentRow[index]) {
          consent[header] = consentRow[index];
        }
      });

      return {
        success: true,
        data: consent,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to fetch CRB consent: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}

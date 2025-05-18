import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/vendor-disbursement-details')
export class VendorDisbursementDetailsController {
  private readonly logger = new Logger(
    VendorDisbursementDetailsController.name,
  );
  private readonly SHEET_NAME = 'Vendor Disbursement Details';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('documentVerifyingPaymentAccount'))
  async createDisbursementDetail(
    @Body()
    createDto: {
      creditApplicationId: string;
      vendorPaymentMethod: string;
      phoneNumberForMPesaPayment?: string;
      managerVerification: 'Y' | 'N';
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
      phoneNumberForBankAccount?: string;
      paybillNumberAndAccount?: string;
      buyGoodsTill?: string;
    },
    @UploadedFile() documentVerifyingPaymentAccount: Express.Multer.File,
  ) {
    try {
      // Generate unique ID for the disbursement detail
      const id = `VD-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Format current date as DD/MM/YYYY HH:mm:ss
      const now = new Date();
      const createdAt = now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      // Upload document if provided
      let documentUrl = '';
      if (documentVerifyingPaymentAccount) {
        documentUrl = await this.googleDriveService.uploadFile(
          documentVerifyingPaymentAccount.buffer,
          documentVerifyingPaymentAccount.originalname,
          documentVerifyingPaymentAccount.mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        'Vendor Payment Method': createDto.vendorPaymentMethod,
        'Phone Number for M Pesa Payment':
          createDto.phoneNumberForMPesaPayment || '',
        'Manager Verification of Payment Account':
          createDto.managerVerification,
        'Document Verifying Payment Account': documentUrl,
        'Bank Name': createDto.bankName || '',
        'Account Name': createDto.accountName || '',
        'Account Number': createDto.accountNumber || '',
        'Phone Number for Bank Account':
          createDto.phoneNumberForBankAccount || '',
        'Paybill Number and Account': createDto.paybillNumberAndAccount || '',
        'Buy Goods Till ': createDto.buyGoodsTill || '',
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Vendor disbursement detail created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating vendor disbursement detail: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getDetailsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching disbursement details for application: ${creditApplicationId}`,
      );

      const details = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!details || details.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = details[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = details
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const detail = {};
          headers.forEach((header, index) => {
            detail[header] = row[index];
          });
          return detail;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching disbursement details for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getDetailById(@Param('id') id: string) {
    try {
      const details = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!details || details.length === 0) {
        return { success: false, message: 'No disbursement details found' };
      }

      const headers = details[0];
      const idIndex = headers.indexOf('ID');
      const detailRow = details.find((row) => row[idIndex] === id);

      if (!detailRow) {
        return { success: false, message: 'Disbursement detail not found' };
      }

      const detail = {};
      headers.forEach((header, index) => {
        detail[header] = detailRow[index];
      });

      return { success: true, data: detail };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching disbursement detail ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllDetails() {
    try {
      const details = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!details || details.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = details[0];
      const data = details.slice(1).map((row) => {
        const detail = {};
        headers.forEach((header, index) => {
          detail[header] = row[index];
        });
        return detail;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all disbursement details: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('documentVerifyingPaymentAccount'))
  async updateDisbursementDetail(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      vendorPaymentMethod?: string;
      phoneNumberForMPesaPayment?: string;
      managerVerification?: 'Y' | 'N';
      bankName?: string;
      accountName?: string;
      accountNumber?: string;
      phoneNumberForBankAccount?: string;
      paybillNumberAndAccount?: string;
      buyGoodsTill?: string;
    },
    @UploadedFile() documentVerifyingPaymentAccount: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating vendor disbursement detail with ID: ${id}`);

      // First verify the detail exists
      const details = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!details || details.length === 0) {
        return { success: false, message: 'No disbursement details found' };
      }

      const headers = details[0];
      const idIndex = headers.indexOf('ID');
      const detailRow = details.find((row) => row[idIndex] === id);

      if (!detailRow) {
        return { success: false, message: 'Disbursement detail not found' };
      }

      // Upload new document if provided
      let documentUrl = '';
      if (documentVerifyingPaymentAccount) {
        documentUrl = await this.googleDriveService.uploadFile(
          documentVerifyingPaymentAccount.buffer,
          documentVerifyingPaymentAccount.originalname,
          documentVerifyingPaymentAccount.mimetype,
        );
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (
          header === 'Credit Application ID' &&
          updateDto.creditApplicationId
        ) {
          return updateDto.creditApplicationId;
        }
        if (
          header === 'Vendor Payment Method' &&
          updateDto.vendorPaymentMethod
        ) {
          return updateDto.vendorPaymentMethod;
        }
        if (
          header === 'Phone Number for M Pesa Payment' &&
          updateDto.phoneNumberForMPesaPayment
        ) {
          return updateDto.phoneNumberForMPesaPayment;
        }
        if (
          header === 'Manager Verification of Payment Account' &&
          updateDto.managerVerification
        ) {
          return updateDto.managerVerification;
        }
        if (header === 'Document Verifying Payment Account' && documentUrl) {
          return documentUrl;
        }
        if (header === 'Bank Name' && updateDto.bankName) {
          return updateDto.bankName;
        }
        if (header === 'Account Name' && updateDto.accountName) {
          return updateDto.accountName;
        }
        if (header === 'Account Number' && updateDto.accountNumber) {
          return updateDto.accountNumber;
        }
        if (
          header === 'Phone Number for Bank Account' &&
          updateDto.phoneNumberForBankAccount
        ) {
          return updateDto.phoneNumberForBankAccount;
        }
        if (
          header === 'Paybill Number and Account' &&
          updateDto.paybillNumberAndAccount
        ) {
          return updateDto.paybillNumberAndAccount;
        }
        if (header === 'Buy Goods Till ' && updateDto.buyGoodsTill) {
          return updateDto.buyGoodsTill;
        }
        return detailRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated detail record
      const updatedDetail = {};
      headers.forEach((header, index) => {
        updatedDetail[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Vendor disbursement detail updated successfully',
        data: updatedDetail,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating vendor disbursement detail: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Delete(':id')
  async deleteDisbursementDetail(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting vendor disbursement detail with ID: ${id}`);

      // First verify the detail exists
      const details = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!details || details.length === 0) {
        return { success: false, message: 'No disbursement details found' };
      }

      const headers = details[0];
      const idIndex = headers.indexOf('ID');
      const detailRow = details.find((row) => row[idIndex] === id);

      if (!detailRow) {
        return { success: false, message: 'Disbursement detail not found' };
      }

      // Delete the row
      await this.sheetsService.deleteRow(this.SHEET_NAME, id);

      return {
        success: true,
        message: 'Vendor disbursement detail deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error deleting vendor disbursement detail: ${apiError.message}`,
      );
      throw error;
    }
  }
}

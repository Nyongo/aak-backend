import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

@Controller('jf/referrers')
export class ReferrersController {
  private readonly logger = new Logger(ReferrersController.name);
  private readonly SHEET_NAME = 'Referrers';
  private readonly PROOF_FOLDER_ID = '191bBnDWzo18cF6ofK4dkEFf48SRK_Suq';
  private readonly PROOF_FOLDER_NAME = 'Referrers_Images';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('proofOfPayment'))
  async addReferrer(
    @Body() body: any,
    @UploadedFile() proofOfPayment: Express.Multer.File,
  ) {
    try {
      let proofUrl = '';
      if (proofOfPayment) {
        const timestamp = new Date().getTime();
        const filename = `proof_${body['School ID']}_${timestamp}.${proofOfPayment.originalname.split('.').pop()}`;
        await this.googleDriveService.uploadFile(
          proofOfPayment.buffer,
          filename,
          proofOfPayment.mimetype,
          this.PROOF_FOLDER_ID,
        );
        proofUrl = `${this.PROOF_FOLDER_NAME}/${filename}`;
      }
      const id = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();
      const rowData = {
        ID: id,
        'School ID': body['School ID'],
        'Referrer Name': body['Referrer Name'],
        'M Pesa Number': body['M Pesa Number'],
        'Referral Reward Paid?': body['Referral Reward Paid?'],
        'Date Paid': body['Date Paid'],
        'Amount Paid': body['Amount Paid'],
        'Proof of Payment': proofUrl,
        'Created At': now,
      };
      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);
      return {
        success: true,
        message: 'Referrer added successfully',
        data: rowData,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      this.logger.error('Error adding referrer:', error);
      return { success: false, error: errMsg };
    }
  }

  @Get('by-borrower/:borrowerId')
  async getReferrersByBorrower(@Param('borrowerId') borrowerId: string) {
    try {
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!rows || rows.length === 0) {
        return { success: true, count: 0, data: [] };
      }
      const headers = rows[0];
      const schoolIdIndex = headers.indexOf('School ID');
      const data = rows
        .slice(1)
        .filter((row) => row[schoolIdIndex] === borrowerId)
        .map((row) => {
          const obj = {};
          headers.forEach((header, idx) => {
            obj[header] = row[idx];
          });
          return obj;
        });

      const documentColumns = ['Proof of Payment'];
      const dataWithLinks = await Promise.all(
        data.map(async (director) => {
          const singelDataWithLinks = { ...director };
          for (const column of documentColumns) {
            if (director[column]) {
              const filename = director[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.PROOF_FOLDER_ID,
              );
              singelDataWithLinks[column] = fileLink;
            }
          }
          return singelDataWithLinks;
        }),
      );
      return {
        success: true,
        count: data.length,
        data: dataWithLinks,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      this.logger.error('Error fetching referrers:', error);
      return { success: false, error: errMsg };
    }
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('proofOfPayment'))
  async updateReferrer(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFile() proofOfPayment: Express.Multer.File,
  ) {
    try {
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!rows || rows.length === 0) {
        return { success: false, message: 'No referrers found' };
      }
      const headers = rows[0];
      const idIndex = headers.indexOf('ID');
      const rowIdx = rows.findIndex((row) => row[idIndex] === id);
      if (rowIdx === -1) {
        return { success: false, message: 'Referrer not found' };
      }
      let proofUrl = '';
      if (proofOfPayment) {
        const timestamp = new Date().getTime();
        const filename = `proof_${body['School ID'] || rows[rowIdx][headers.indexOf('School ID')]}_${timestamp}.${proofOfPayment.originalname.split('.').pop()}`;
        await this.googleDriveService.uploadFile(
          proofOfPayment.buffer,
          filename,
          proofOfPayment.mimetype,
          this.PROOF_FOLDER_ID,
        );
        proofUrl = `${this.PROOF_FOLDER_NAME}/${filename}`;
      }
      // Only update provided fields
      const updatedRowData = headers.map((header, idx) => {
        if (header === 'Proof of Payment' && proofUrl) {
          return proofUrl;
        }
        if (body[header] !== undefined) {
          return body[header];
        }
        return rows[rowIdx][idx] || '';
      });
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);
      const updatedObj = {};
      headers.forEach((header, idx) => {
        updatedObj[header] = updatedRowData[idx];
      });
      return {
        success: true,
        message: 'Referrer updated successfully',
        data: updatedObj,
      };
    } catch (error) {
      const errMsg =
        error instanceof Error && error.message
          ? error.message
          : 'Unknown error';
      this.logger.error('Error updating referrer:', error);
      return { success: false, error: errMsg };
    }
  }
}

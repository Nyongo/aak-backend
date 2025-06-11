import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  Logger,
  Put,
  Delete,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/asset-titles')
export class AssetTitlesController {
  private readonly logger = new Logger(AssetTitlesController.name);
  private readonly SHEET_NAME = 'Asset Titles';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'Logbook Photo', maxCount: 1 },
      { name: 'Title Deed Photo', maxCount: 1 },
      { name: 'Full Title Deed', maxCount: 1 },
      { name: "Evaluator's Report", maxCount: 1 },
    ]),
  )
  async createAssetTitle(
    @Body()
    createDto: {
      'Credit Application ID'?: string;
      Type?: string;
      'To Be Used As Security?': 'Y' | 'N';
      Description?: string;
      'Legal Owner'?: string;
      'User ID'?: string;
      'Full Owner Details'?: string;
      'Collateral owned by director of school?'?: 'Y' | 'N';
      'Plot Number'?: string;
      'School sits on land?'?: 'Y' | 'N';
      'Has Comprehensive Insurance'?: 'Y' | 'N';
      'Original Insurance Coverage'?: number;
      'Initial Estimated Value (KES)': number;
      'Approved by Legal Team or NTSA Agent for use as Security?'?: 'Y' | 'N';
      'Notes on Approval for Use'?: string;
      "Evaluator's Market Value"?: number;
      "Evaluator's Forced Value"?: number;
      'Money Owed on Asset (If Any)'?: number;
      'License Plate Number'?: string;
      'Engine CC'?: number;
      'Year of Manufacture'?: number;
    },
    @UploadedFiles()
    files: {
      'Logbook Photo'?: Express.Multer.File[];
      'Title Deed Photo'?: Express.Multer.File[];
      'Full Title Deed'?: Express.Multer.File[];
      "Evaluator's Report"?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the asset title
      const id = `AT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Upload files if provided
      const fileUrls = {
        'Logbook Photo': '',
        'Title Deed Photo': '',
        'Full Title Deed': '',
        "Evaluator's Report": '',
      };

      if (files['Logbook Photo']?.[0]) {
        fileUrls['Logbook Photo'] = await this.googleDriveService.uploadFile(
          files['Logbook Photo'][0].buffer,
          files['Logbook Photo'][0].originalname,
          files['Logbook Photo'][0].mimetype,
        );
      }

      if (files['Title Deed Photo']?.[0]) {
        fileUrls['Title Deed Photo'] = await this.googleDriveService.uploadFile(
          files['Title Deed Photo'][0].buffer,
          files['Title Deed Photo'][0].originalname,
          files['Title Deed Photo'][0].mimetype,
        );
      }

      if (files['Full Title Deed']?.[0]) {
        fileUrls['Full Title Deed'] = await this.googleDriveService.uploadFile(
          files['Full Title Deed'][0].buffer,
          files['Full Title Deed'][0].originalname,
          files['Full Title Deed'][0].mimetype,
        );
      }

      if (files["Evaluator's Report"]?.[0]) {
        fileUrls["Evaluator's Report"] =
          await this.googleDriveService.uploadFile(
            files["Evaluator's Report"][0].buffer,
            files["Evaluator's Report"][0].originalname,
            files["Evaluator's Report"][0].mimetype,
          );
      }

      // Get the current sheet headers to ensure we save all fields
      const sheetData = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      const headers = sheetData[0];

      // Create a map of all fields to save
      const rowData = {
        ID: id,
        'Created At': createdAt,
        'Logbook Photo': fileUrls['Logbook Photo'],
        'Title Deed Photo': fileUrls['Title Deed Photo'],
        'Full Title Deed': fileUrls['Full Title Deed'],
        "Evaluator's Report": fileUrls["Evaluator's Report"],
      };

      // Add all fields from the DTO to the rowData
      for (const [key, value] of Object.entries(createDto)) {
        rowData[key] = value;
      }

      // Ensure all headers from the sheet are included in the rowData
      for (const header of headers) {
        if (!(header in rowData)) {
          rowData[header] = '';
        }
      }

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData, true);

      return {
        success: true,
        message: 'Asset title record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating asset title record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getAssetTitlesByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      const assets = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!assets || assets.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = assets[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      const filteredData = assets
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const asset = {};
          headers.forEach((header, index) => {
            asset[header] = row[index];
          });
          return asset;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching asset titles for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getAssetTitleById(@Param('id') id: string) {
    try {
      const assets = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!assets || assets.length === 0) {
        return { success: false, message: 'No asset titles found' };
      }

      const headers = assets[0];
      const idIndex = headers.indexOf('ID');
      const assetRow = assets.find((row) => row[idIndex] === id);

      if (!assetRow) {
        return { success: false, message: 'Asset title not found' };
      }

      const asset = {};
      headers.forEach((header, index) => {
        asset[header] = assetRow[index];
      });

      return { success: true, data: asset };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching asset title ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllAssetTitles() {
    try {
      const assets = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );

      if (!assets || assets.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = assets[0];
      const data = assets.slice(1).map((row) => {
        const asset = {};
        headers.forEach((header, index) => {
          asset[header] = row[index];
        });
        return asset;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all asset titles: ${apiError.message}`);
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logbookPhoto', maxCount: 1 },
      { name: 'titleDeedPhoto', maxCount: 1 },
      { name: 'fullTitleDeed', maxCount: 1 },
      { name: 'evaluatorsReport', maxCount: 1 },
    ]),
  )
  async updateAssetTitle(
    @Param('id') id: string,
    @Body() updateDto: any,
    @UploadedFiles()
    files: {
      logbookPhoto?: Express.Multer.File[];
      titleDeedPhoto?: Express.Multer.File[];
      fullTitleDeed?: Express.Multer.File[];
      evaluatorsReport?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating asset title with ID: ${id}`);
      const assets = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!assets || assets.length === 0) {
        return { success: false, message: 'No asset titles found' };
      }
      const headers = assets[0];
      const idIndex = headers.indexOf('ID');
      const assetRow = assets.find((row) => row[idIndex] === id);
      if (!assetRow) {
        return { success: false, message: 'Asset title not found' };
      }
      // Handle file uploads
      const fileUrls = {
        logbookPhoto: assetRow[headers.indexOf('Logbook Photo')] || '',
        titleDeedPhoto: assetRow[headers.indexOf('Title Deed Photo')] || '',
        fullTitleDeed: assetRow[headers.indexOf('Full Title Deed')] || '',
        evaluatorsReport: assetRow[headers.indexOf("Evaluator's Report")] || '',
      };
      if (files.logbookPhoto?.[0]) {
        fileUrls.logbookPhoto = await this.googleDriveService.uploadFile(
          files.logbookPhoto[0].buffer,
          files.logbookPhoto[0].originalname,
          files.logbookPhoto[0].mimetype,
        );
      }
      if (files.titleDeedPhoto?.[0]) {
        fileUrls.titleDeedPhoto = await this.googleDriveService.uploadFile(
          files.titleDeedPhoto[0].buffer,
          files.titleDeedPhoto[0].originalname,
          files.titleDeedPhoto[0].mimetype,
        );
      }
      if (files.fullTitleDeed?.[0]) {
        fileUrls.fullTitleDeed = await this.googleDriveService.uploadFile(
          files.fullTitleDeed[0].buffer,
          files.fullTitleDeed[0].originalname,
          files.fullTitleDeed[0].mimetype,
        );
      }
      if (files.evaluatorsReport?.[0]) {
        fileUrls.evaluatorsReport = await this.googleDriveService.uploadFile(
          files.evaluatorsReport[0].buffer,
          files.evaluatorsReport[0].originalname,
          files.evaluatorsReport[0].mimetype,
        );
      }
      // Prepare updated row data
      const updatedRowData = headers.map((header, index) => {
        if (header === 'Logbook Photo') return fileUrls.logbookPhoto;
        if (header === 'Title Deed Photo') return fileUrls.titleDeedPhoto;
        if (header === 'Full Title Deed') return fileUrls.fullTitleDeed;
        if (header === "Evaluator's Report") return fileUrls.evaluatorsReport;
        if (header === 'ID') return id;
        if (header === 'Created At')
          return assetRow[headers.indexOf('Created At')];
        return updateDto[header] !== undefined
          ? updateDto[header]
          : assetRow[index] || '';
      });
      await this.sheetsService.updateRow(
        this.SHEET_NAME,
        id,
        updatedRowData,
        true,
      );
      // Build updated asset object
      const updatedAsset = {};
      headers.forEach((header, idx) => {
        updatedAsset[header] = updatedRowData[idx];
      });
      return {
        success: true,
        message: 'Asset title updated successfully',
        data: updatedAsset,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating asset title: ${apiError.message}`);
      throw error;
    }
  }

  @Delete(':id')
  async deleteAssetTitle(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting asset title with ID: ${id}`);
      const assets = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!assets || assets.length === 0) {
        return { success: false, message: 'No asset titles found' };
      }
      const headers = assets[0];
      const idIndex = headers.indexOf('ID');
      const assetRow = assets.find((row) => row[idIndex] === id);
      if (!assetRow) {
        return { success: false, message: 'Asset title not found' };
      }
      await this.sheetsService.deleteRow(this.SHEET_NAME, id, true);
      return {
        success: true,
        message: 'Asset title deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error deleting asset title: ${apiError.message}`);
      throw error;
    }
  }
}

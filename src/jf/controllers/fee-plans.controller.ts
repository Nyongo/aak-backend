import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  Logger,
  Put,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateFeePlanDto } from '../dto/create-fee-plan.dto';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/fee-plans')
export class FeePlansController {
  private readonly logger = new Logger(FeePlansController.name);
  private readonly SHEET_NAME = 'Fee Plan Documents';
  private readonly FeePLanDocFolder = 'Fee Plan Documents_Files_';
  private readonly FeePLanImageFolder = 'Fee Plan Documents_Images';
  private readonly FEE_PLAN_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FEE_PLANS_IMAGES_FOLDER_ID;
  private readonly FEE_PLAN_FILES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_FEE_PLANS_FILES_FOLDER_ID;

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('by-application/:creditApplicationId')
  async getFeePlansByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching fee plans for credit application: ${creditApplicationId}`,
      );
      const feePlans = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );

      if (!feePlans || feePlans.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = feePlans[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        throw new Error('Credit Application ID column not found in sheet');
      }

      const filteredData = feePlans
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const feePlan = {};
          headers.forEach((header, index) => {
            feePlan[header] = row[index];
          });
          return feePlan;
        });

      const documentColumns = ['Photo', 'File'];
      const datasWithLinks = await Promise.all(
        filteredData.map(async (director) => {
          const dataWithLinks = { ...director };
          for (const column of documentColumns) {
            if (director[column]) {
              let folderId = '';
              if (column == 'Photo') {
                folderId = this.FEE_PLAN_IMAGES_FOLDER_ID;
              } else if (column == 'File') {
                folderId = this.FEE_PLAN_FILES_FOLDER_ID;
              }
              const filename = director[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                folderId,
              );
              dataWithLinks[column] = fileLink;
            }
          }
          return dataWithLinks;
        }),
      );

      return {
        success: true,
        count: filteredData.length,
        data: datasWithLinks,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching fee plans for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  async addFeePlan(
    @Body() createDto: CreateFeePlanDto,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(
        `Adding new fee plan for application: ${createDto['Credit Application ID']}`,
      );

      // Handle photo upload
      let photoName = '';
      if (files.photo?.[0]) {
        const photo = files.photo[0];
        const timestamp = new Date().getTime();
        photoName = `fee_plan_photo_${createDto['Credit Application ID']}_${timestamp}.${photo.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          photo.buffer,
          photoName,
          photo.mimetype,
          this.FEE_PLAN_IMAGES_FOLDER_ID,
        );
      }

      // Handle file upload
      let filename = '';
      if (files.file?.[0]) {
        const file = files.file[0];
        const timestamp = new Date().getTime();
        filename = `fee_plan_file_${createDto['Credit Application ID']}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
          this.FEE_PLAN_FILES_FOLDER_ID,
        );
      }

      const id = `FP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();

      const rowData = {
        ID: id,
        'Credit Application ID': createDto['Credit Application ID'],
        'School Year': createDto['School Year'],
        Photo: photoName ? `${this.FeePLanImageFolder}/${photoName}` : '',
        File: filename ? `${this.FeePLanDocFolder}/${filename}` : '',
        'Created At': now,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData, true);

      return {
        success: true,
        message: 'Fee plan added successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error adding fee plan: ${apiError.message}`);
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'photo', maxCount: 1 },
      { name: 'file', maxCount: 1 },
    ]),
  )
  async updateFeePlan(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateFeePlanDto>,
    @UploadedFiles()
    files: {
      photo?: Express.Multer.File[];
      file?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating fee plan with ID: ${id}`);

      // First verify the fee plan exists
      const feePlans = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!feePlans || feePlans.length === 0) {
        return { success: false, message: 'No fee plans found' };
      }

      const headers = feePlans[0];
      const idIndex = headers.indexOf('ID');
      const feePlanRow = feePlans.find((row) => row[idIndex] === id);

      if (!feePlanRow) {
        return { success: false, message: 'Fee plan not found' };
      }

      // Handle photo upload if provided
      let photoname = '';
      if (files.photo?.[0]) {
        const photo = files.photo[0];
        const timestamp = new Date().getTime();
        photoname = `fee_plan_photo_${updateData['Credit Application ID'] || feePlanRow[headers.indexOf('Credit Application ID')]}_${timestamp}.${photo.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          photo.buffer,
          photoname,
          photo.mimetype,
          this.FEE_PLAN_IMAGES_FOLDER_ID,
        );
      }

      // Handle file upload if provided
      let filename = '';
      if (files.file?.[0]) {
        const file = files.file[0];
        const timestamp = new Date().getTime();
        filename = `fee_plan_file_${updateData['Credit Application ID'] || feePlanRow[headers.indexOf('Credit Application ID')]}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
          this.FEE_PLAN_FILES_FOLDER_ID,
        );
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (header === 'Photo' && photoname) {
          return `${this.FeePLanImageFolder}/${photoname}`;
        }
        if (header === 'File' && filename) {
          return `${this.FeePLanDocFolder}/${filename}`;
        }
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return feePlanRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(
        this.SHEET_NAME,
        id,
        updatedRowData,
        true,
      );

      // Get the updated fee plan
      const updatedFeePlan = {};
      headers.forEach((header, index) => {
        updatedFeePlan[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Fee plan updated successfully',
        data: updatedFeePlan,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating fee plan: ${apiError.message}`);
      throw error;
    }
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  Logger,
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
      const feePlans = await this.sheetsService.getSheetData(this.SHEET_NAME);

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

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
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
      let photoUrl = '';
      if (files.photo?.[0]) {
        const photo = files.photo[0];
        const timestamp = new Date().getTime();
        const filename = `fee_plan_photo_${createDto['Credit Application ID']}_${timestamp}.${photo.originalname.split('.').pop()}`;

        photoUrl = await this.googleDriveService.uploadFile(
          photo.buffer,
          filename,
          photo.mimetype,
        );
      }

      // Handle file upload
      let fileUrl = '';
      if (files.file?.[0]) {
        const file = files.file[0];
        const timestamp = new Date().getTime();
        const filename = `fee_plan_file_${createDto['Credit Application ID']}_${timestamp}.${file.originalname.split('.').pop()}`;

        fileUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
        );
      }

      const id = `FP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();

      const rowData = {
        ID: id,
        'Credit Application ID': createDto['Credit Application ID'],
        'School Year': createDto['School Year'],
        Photo: photoUrl,
        File: fileUrl,
        'Created At': now,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

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
}

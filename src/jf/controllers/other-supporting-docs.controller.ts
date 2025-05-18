import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  UseInterceptors,
  UploadedFiles,
  Body,
  Logger,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/supporting-docs')
export class OtherSupportingDocsController {
  private readonly logger = new Logger(OtherSupportingDocsController.name);
  private readonly SHEET_NAME = 'Other Supporting Documents';

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  async createSupportingDoc(
    @Body()
    createDto: {
      creditApplicationId: string;
      documentType: string;
      notes: string;
    },
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
  ) {
    try {
      // Generate unique ID for the document
      const id = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

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

      // Upload file to Google Drive if provided
      let fileUrl = '';
      if (files.file && files.file[0]) {
        const file = files.file[0];
        fileUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      }

      // Upload image to Google Drive if provided
      let imageUrl = '';
      if (files.image && files.image[0]) {
        const image = files.image[0];
        imageUrl = await this.googleDriveService.uploadFile(
          image.buffer,
          image.originalname,
          image.mimetype,
        );
      }

      const rowData = {
        ID: id,
        'Credit Application ID': createDto.creditApplicationId,
        'Document Type': createDto.documentType,
        Notes: createDto.notes || '',
        File: fileUrl,
        Image: imageUrl,
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Supporting document record created successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error creating supporting document record: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getDocsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching supporting documents for application ID: ${creditApplicationId}`,
      );

      const documents = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${documents?.length || 0} rows from sheet`);

      if (!documents || documents.length === 0) {
        this.logger.debug('No supporting documents found in sheet');
        return { success: true, count: 0, data: [] };
      }

      const headers = documents[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const applicationIdIndex = headers.indexOf('Credit Application ID');
      this.logger.debug(
        `Credit Application ID column index: ${applicationIdIndex}`,
      );

      if (applicationIdIndex === -1) {
        this.logger.warn('Credit Application ID column not found in sheet');
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = documents
        .slice(1)
        .filter((row) => {
          const matches = row[applicationIdIndex] === creditApplicationId;
          this.logger.debug(
            `Row ${row[0]} application ID: ${row[applicationIdIndex]}, matches: ${matches}`,
          );
          return matches;
        })
        .map((row) => {
          const document = {};
          headers.forEach((header, index) => {
            document[header] = row[index];
          });
          return document;
        });

      this.logger.debug(`Found ${filteredData.length} matching documents`);

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching supporting documents for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getDocById(@Param('id') id: string) {
    try {
      const documents = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!documents || documents.length === 0) {
        return { success: false, message: 'No supporting documents found' };
      }

      const headers = documents[0];
      const idIndex = headers.indexOf('ID');
      const documentRow = documents.find((row) => row[idIndex] === id);

      if (!documentRow) {
        return { success: false, message: 'Supporting document not found' };
      }

      const document = {};
      headers.forEach((header, index) => {
        document[header] = documentRow[index];
      });

      return { success: true, data: document };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching supporting document ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllDocs() {
    try {
      this.logger.debug('Fetching all supporting documents');

      const documents = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${documents?.length || 0} rows from sheet`);

      if (!documents || documents.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = documents[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const data = documents.slice(1).map((row) => {
        const document = {};
        headers.forEach((header, index) => {
          document[header] = row[index];
        });
        return document;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all supporting documents: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'file', maxCount: 1 },
      { name: 'image', maxCount: 1 },
    ]),
  )
  async updateSupportingDoc(
    @Param('id') id: string,
    @Body()
    updateDto: {
      creditApplicationId?: string;
      documentType?: string;
      notes?: string;
    },
    @UploadedFiles()
    files: {
      file?: Express.Multer.File[];
      image?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating supporting document with ID: ${id}`);

      // First verify the document exists
      const documents = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!documents || documents.length === 0) {
        return { success: false, message: 'No supporting documents found' };
      }

      const headers = documents[0];
      const idIndex = headers.indexOf('ID');
      const documentRow = documents.find((row) => row[idIndex] === id);

      if (!documentRow) {
        return { success: false, message: 'Supporting document not found' };
      }

      // Upload new file if provided
      let fileUrl = '';
      if (files.file && files.file[0]) {
        const file = files.file[0];
        fileUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
        );
      }

      // Upload new image if provided
      let imageUrl = '';
      if (files.image && files.image[0]) {
        const image = files.image[0];
        imageUrl = await this.googleDriveService.uploadFile(
          image.buffer,
          image.originalname,
          image.mimetype,
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
        if (header === 'Document Type' && updateDto.documentType) {
          return updateDto.documentType;
        }
        if (header === 'Notes' && updateDto.notes !== undefined) {
          return updateDto.notes;
        }
        if (header === 'File' && fileUrl) {
          return fileUrl;
        }
        if (header === 'Image' && imageUrl) {
          return imageUrl;
        }
        return documentRow[index] || '';
      });

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated document record
      const updatedDocument = {};
      headers.forEach((header, index) => {
        updatedDocument[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Supporting document updated successfully',
        data: updatedDocument,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error updating supporting document: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Delete(':id')
  async deleteSupportingDoc(@Param('id') id: string) {
    try {
      this.logger.log(`Deleting supporting document with ID: ${id}`);

      // First verify the document exists
      const documents = await this.sheetsService.getSheetData(this.SHEET_NAME);
      if (!documents || documents.length === 0) {
        return { success: false, message: 'No supporting documents found' };
      }

      const headers = documents[0];
      const idIndex = headers.indexOf('ID');
      const documentRow = documents.find((row) => row[idIndex] === id);

      if (!documentRow) {
        return { success: false, message: 'Supporting document not found' };
      }

      // Delete the row
      await this.sheetsService.deleteRow(this.SHEET_NAME, id);

      return {
        success: true,
        message: 'Supporting document deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error deleting supporting document: ${apiError.message}`,
      );
      throw error;
    }
  }
}

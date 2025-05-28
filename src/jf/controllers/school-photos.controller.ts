import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Logger,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { Response } from 'express';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/school-photos')
export class SchoolPhotosController {
  private readonly logger = new Logger(SchoolPhotosController.name);
  private readonly SHEET_NAME = 'School Photos';
  private readonly SCHOOL_IMAGES_FOLDER_NAME = 'School Photos_Images';
  private readonly SCHOOL_PHOTOS_FOLDER_ID =
    process.env.GOOGLE_DRIVE_SCHOOL_PHOTOS_FOLDER_ID;
  constructor(
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('proxy')
  async proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      this.logger.warn('Missing url parameter in proxy request');
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Missing url parameter' });
    }

    try {
      this.logger.debug(`Processing proxy request for URL: ${url}`);

      // Validate that the URL is from Google Drive
      if (!url.includes('drive.google.com')) {
        this.logger.warn(`Invalid image URL (not Google Drive): ${url}`);
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Invalid image URL' });
      }

      // Get the file ID from the Google Drive URL
      const fileId = this.extractFileIdFromUrl(url);
      this.logger.debug(`Extracted file ID: ${fileId}`);

      if (!fileId) {
        this.logger.warn(`Could not extract file ID from URL: ${url}`);
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Invalid Google Drive URL' });
      }

      // Get the file metadata and content from Google Drive
      this.logger.debug(`Fetching file metadata for ID: ${fileId}`);
      const fileMetadata =
        await this.googleDriveService.getFileMetadata(fileId);

      if (!fileMetadata) {
        this.logger.warn(`File metadata not found for ID: ${fileId}`);
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: 'File not found' });
      }

      this.logger.debug(`File metadata: ${JSON.stringify(fileMetadata)}`);

      // Get the file content
      this.logger.debug(`Fetching file content for ID: ${fileId}`);
      const fileContent = await this.googleDriveService.getFileContent(fileId);

      if (!fileContent) {
        this.logger.warn(`File content not found for ID: ${fileId}`);
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: 'File content not found' });
      }

      // Convert Buffer to string if it's not already a Buffer
      const contentBuffer = Buffer.isBuffer(fileContent)
        ? fileContent
        : Buffer.from(fileContent);

      this.logger.debug(`File content size: ${contentBuffer.length} bytes`);

      // Set appropriate headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', fileMetadata.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.setHeader('Content-Length', contentBuffer.length);

      this.logger.debug(
        `Sending file with headers: ${JSON.stringify({
          'Content-Type': fileMetadata.mimeType,
          'Content-Length': contentBuffer.length,
          'Cache-Control': 'public, max-age=31536000',
        })}`,
      );

      // Send the file content
      res.send(contentBuffer);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`Failed to proxy image: ${errorMessage}`);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        error: 'Failed to fetch image',
        details: errorMessage,
      });
    }
  }

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  async createSchoolPhoto(
    @Body()
    createDto: {
      'School Impact Survey ID': string;
      'Created By': string;
    },
    @UploadedFile() photo: Express.Multer.File,
  ) {
    try {
      this.logger.log(
        `Adding new school photo for survey: ${createDto['School Impact Survey ID']}`,
      );

      if (!photo) {
        return {
          success: false,
          error: 'Photo is required',
        };
      }

      const timestamp = new Date().getTime();
      const filename = `school_photo_${createDto['School Impact Survey ID']}_${timestamp}.${photo.originalname.split('.').pop()}`;

      await this.googleDriveService.uploadFile(
        photo.buffer,
        filename,
        photo.mimetype,
        this.SCHOOL_PHOTOS_FOLDER_ID,
      );

      const id = `SP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = new Date().toISOString();

      const rowData = {
        ID: id,
        'School Impact Survey ID': createDto['School Impact Survey ID'],
        Photo: `${this.SCHOOL_IMAGES_FOLDER_NAME}/${filename}`,
        'Created At': now,
        'Created By': createDto['Created By'],
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'School photo added successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to add school photo: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('photos', 10)) // Allow up to 10 photos
  async createMultipleSchoolPhotos(
    @Body()
    createDto: {
      'School Impact Survey ID': string;
      'Created By': string;
    },
    @UploadedFiles() photos: Express.Multer.File[],
  ) {
    try {
      this.logger.log(
        `Adding multiple school photos for survey: ${createDto['School Impact Survey ID']}`,
      );

      if (!photos || photos.length === 0) {
        return {
          success: false,
          error: 'At least one photo is required',
        };
      }

      const uploadedPhotos = [];
      const now = new Date().toISOString();

      for (const photo of photos) {
        const timestamp = new Date().getTime();
        const filename = `school_photo_${createDto['School Impact Survey ID']}_${timestamp}_${Math.random().toString(36).substr(2, 4)}.${photo.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          photo.buffer,
          filename,
          photo.mimetype,
          this.SCHOOL_PHOTOS_FOLDER_ID,
        );

        const id = `SP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

        const rowData = {
          ID: id,
          'School Impact Survey ID': createDto['School Impact Survey ID'],
          Photo: `${this.SCHOOL_IMAGES_FOLDER_NAME}/${filename}`,
          'Created At': now,
          'Created By': createDto['Created By'],
        };

        await this.sheetsService.appendRow(this.SHEET_NAME, rowData);
        uploadedPhotos.push(rowData);
      }

      return {
        success: true,
        message: `${photos.length} school photos added successfully`,
        data: uploadedPhotos,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Failed to add multiple school photos: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get()
  async getAllSchoolPhotos() {
    try {
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);
      return {
        success: true,
        data: rows,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to fetch school photos: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get(':id')
  async getSchoolPhotoById(@Param('id') id: string) {
    try {
      this.logger.debug(`Fetching school photo with ID: ${id}`);
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);
      this.logger.debug(`Retrieved ${rows?.length || 0} rows from sheet`);

      if (!rows || rows.length === 0) {
        this.logger.debug('No photos found in sheet');
        return {
          success: false,
          error: 'No photos found in sheet',
        };
      }

      const headers = rows[0];
      this.logger.debug(`Sheet headers: ${headers.join(', ')}`);

      const idIndex = headers.indexOf('ID');
      this.logger.debug(`ID column index: ${idIndex}`);

      if (idIndex === -1) {
        this.logger.warn('ID column not found in sheet');
        return {
          success: false,
          error: 'ID column not found in sheet',
        };
      }

      // Log all IDs for debugging
      const allIds = rows.slice(1).map((row) => row[idIndex]);
      this.logger.debug(`All IDs in sheet: ${JSON.stringify(allIds)}`);

      const photo = rows.slice(1).find((row) => {
        const rowId = row[idIndex];
        this.logger.debug(`Comparing row ID: ${rowId} with search ID: ${id}`);
        return rowId === id;
      });

      if (!photo) {
        this.logger.debug(
          `Photo with ID ${id} not found in sheet. Available IDs: ${allIds.join(', ')}`,
        );
        return {
          success: false,
          error: 'School photo not found',
        };
      }

      const photoData = {};
      headers.forEach((header, index) => {
        photoData[header] = photo[index];
      });

      // Get the filename from the Photo field
      const filename = photoData['Photo'].split('/').pop();
      this.logger.debug(`Getting file link for filename: ${filename}`);

      // Get the Google Drive URL for the file
      const fileLink = await this.googleDriveService.getFileLink(
        filename,
        this.SCHOOL_PHOTOS_FOLDER_ID,
      );
      this.logger.debug(`Retrieved file link: ${fileLink}`);

      // Add the file URL to the response
      photoData['fileUrl'] = fileLink;

      this.logger.debug(`Found photo: ${JSON.stringify(photoData)}`);
      return {
        success: true,
        data: photoData,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`Failed to fetch school photo: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Get('by-survey/:surveyId')
  async getSchoolPhotosBySurveyId(@Param('surveyId') surveyId: string) {
    try {
      this.logger.debug(`Fetching photos for survey ID: ${surveyId}`);
      const surveys = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!surveys || surveys.length === 0) {
        this.logger.debug('No photos found in sheet');
        return { success: true, count: 0, data: [] };
      }

      const headers = surveys[0];
      const surveyIdIndex = headers.indexOf('School Impact Survey ID');
      const photoIndex = headers.indexOf('Photo');

      if (surveyIdIndex === -1 || photoIndex === -1) {
        this.logger.warn('Required columns not found in sheet');
        return {
          success: false,
          error: 'Required columns not found in sheet',
        };
      }

      const filteredData = surveys
        .slice(1)
        .filter((row) => row[surveyIdIndex] === surveyId)
        .map((row) => {
          const photo = {};
          headers.forEach((header, index) => {
            photo[header] = row[index];
          });
          return photo;
        });

      this.logger.debug(
        `Found ${filteredData.length} photos for survey ${surveyId}`,
      );

      const recordsWithProxyUrls = await Promise.all(
        filteredData.map(async (record) => {
          const recordWithUrls = { ...record };

          // Get the filename from the Photo field
          const filename = record['Photo'].split('/').pop();
          this.logger.debug(`Getting file link for filename: ${filename}`);

          // Get the Google Drive URL
          const fileLink = await this.googleDriveService.getFileLink(
            filename,
            this.SCHOOL_PHOTOS_FOLDER_ID,
          );

          // Create proxy URL
          const proxyUrl = `/jf/school-photos/proxy?url=${encodeURIComponent(fileLink)}`;

          // Add both the original Google Drive URL and the proxy URL
          recordWithUrls['fileUrl'] = fileLink;
          recordWithUrls['proxyUrl'] = proxyUrl;

          return recordWithUrls;
        }),
      );

      return {
        success: true,
        count: recordsWithProxyUrls.length,
        data: recordsWithProxyUrls,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(
        `Error fetching photos for survey ${surveyId}: ${errorMessage}`,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Delete(':id')
  async deleteSchoolPhoto(@Param('id') id: string) {
    try {
      this.logger.debug(`Deleting school photo with ID: ${id}`);

      // First, get the photo details to get the filename
      const rows = await this.sheetsService.getSheetData(this.SHEET_NAME);

      if (!rows || rows.length === 0) {
        this.logger.debug('No photos found in sheet');
        return {
          success: false,
          error: 'No photos found in sheet',
        };
      }

      const headers = rows[0];
      const idIndex = headers.indexOf('ID');
      const photoIndex = headers.indexOf('Photo');

      if (idIndex === -1 || photoIndex === -1) {
        this.logger.warn('Required columns not found in sheet');
        return {
          success: false,
          error: 'Required columns not found in sheet',
        };
      }

      // Find the photo record
      const photo = rows.slice(1).find((row) => row[idIndex] === id);

      if (!photo) {
        this.logger.debug(`Photo with ID ${id} not found in sheet`);
        return {
          success: false,
          error: 'School photo not found',
        };
      }

      // Get the filename from the Photo field
      const filename = photo[photoIndex].split('/').pop();
      this.logger.debug(`Deleting file: ${filename}`);

      // Delete the file from Google Drive
      const fileLink = await this.googleDriveService.getFileLink(
        filename,
        this.SCHOOL_PHOTOS_FOLDER_ID,
      );

      if (fileLink) {
        const fileId = this.extractFileIdFromUrl(fileLink);
        if (fileId) {
          await this.googleDriveService.deleteFile(fileId);
          this.logger.debug(`Deleted file from Google Drive: ${fileId}`);
        }
      }

      // Delete the row from the Google Sheet
      await this.sheetsService.deleteRow(this.SHEET_NAME, id);
      this.logger.debug(`Deleted row from sheet for ID: ${id}`);

      return {
        success: true,
        message: 'School photo deleted successfully',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unknown error occurred';
      this.logger.error(`Failed to delete school photo: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private extractFileIdFromUrl(url: string): string | null {
    // Handle different Google Drive URL formats
    const patterns = [
      /\/d\/([a-zA-Z0-9-_]+)/, // Standard format: /d/FILE_ID
      /id=([a-zA-Z0-9-_]+)/, // Query parameter format: ?id=FILE_ID
      /\/file\/d\/([a-zA-Z0-9-_]+)/, // Alternative format: /file/d/FILE_ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

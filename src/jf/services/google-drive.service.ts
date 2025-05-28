import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import { GoogleAuthService } from './google-auth.service';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly drive;
  private readonly GOOGLE_DRIVE_ROOT_FOLDER_ID =
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  constructor(private readonly googleAuthService: GoogleAuthService) {
    this.drive = google.drive({
      version: 'v3',
      auth: this.googleAuthService.getAuth(),
    });
  }

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    folderId?: string,
  ): Promise<string> {
    const media = {
      mimeType,
      body: Readable.from(fileBuffer),
    };

    const fileMetadata = {
      name: filename,
      parents: [folderId || this.GOOGLE_DRIVE_ROOT_FOLDER_ID],
    };

    try {
      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id,webViewLink',
      });

      return response.data.webViewLink || response.data.id;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  async downloadFile(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        { responseType: 'stream' },
      );

      return response.data;
    } catch (error) {
      //  this.logger.error('Error downloading file from Google Drive:', error);
      throw new Error('Failed to download file from Google Drive');
    }
  }

  async parseExcelFromDrive(fileId: string): Promise<any> {
    try {
      const fileStream = await this.downloadFile(fileId);

      const chunks: any[] = [];
      fileStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      return new Promise((resolve, reject) => {
        fileStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const workbook = XLSX.read(buffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          resolve(data);
        });

        fileStream.on('error', reject);
      });
    } catch (error) {
      //  this.logger.error('Error parsing Excel file from Google Drive:', error);
      throw new Error('Failed to parse Excel file from Google Drive');
    }
  }

  async getFileLink(filename: string, folderId?: string): Promise<string> {
    try {
      // Escape special characters in filename for the query
      const escapedFilename = filename.replace(/'/g, "\\'");
      const searchQuery = `name = '${escapedFilename}' and '${folderId || this.GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and trashed = false`;
      console.log('Searching Google Drive with query:', searchQuery);

      const response = await this.drive.files.list({
        q: searchQuery,
        fields: 'files(id, webViewLink)',
        spaces: 'drive',
      });

      console.log('Google Drive response:', response.data);

      if (!response.data.files || response.data.files.length === 0) {
        console.log('No files found matching the search criteria');
        return null;
      }

      const fileLink = response.data.files[0].webViewLink;
      console.log('Found file link:', fileLink);
      return fileLink;
    } catch (error) {
      console.error('Error getting file link from Google Drive:', error);
      throw new Error('Failed to get file link from Google Drive');
    }
  }

  async getFileMetadata(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size',
      });

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get file metadata';
      this.logger.error(`Failed to get file metadata: ${errorMessage}`);
      return null;
    }
  }

  async getFileContent(fileId: string) {
    try {
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        {
          responseType: 'arraybuffer',
        },
      );

      // Ensure we return a Buffer
      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to get file content: ${error}`);
      return null;
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      this.logger.debug(`Successfully deleted file: ${fileId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file ${fileId}: ${error}`);
      throw new Error('Failed to delete file from Google Drive');
    }
  }
}

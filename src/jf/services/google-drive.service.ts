import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleDriveService {
  private drive;

  constructor(private readonly googleAuthService: GoogleAuthService) {
    this.drive = google.drive({
      version: 'v3',
      auth: this.googleAuthService.getOAuthClient(),
    });
  }

  async downloadFile(fileId: string): Promise<any> {
    const response = await this.drive.files.get(
      {
        fileId: fileId,
        alt: 'media', // This will return the file content directly
      },
      { responseType: 'stream' },
    );

    return response.data;
  }

  async parseExcelFromDrive(fileId: string): Promise<any> {
    const fileStream = await this.downloadFile(fileId);

    // Read the Excel file content from the stream
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
  }
}

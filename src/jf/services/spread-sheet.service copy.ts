import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as xlsx from 'xlsx';
import { Readable } from 'stream';

@Injectable()
export class SpreadsheetService {
  private drive;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      keyFile: 'keys/service-account.json', // 🔥 Update this path
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
  }

  async readExcelFile(fileId: string): Promise<any[]> {
    // 🔥 Export Google Sheets as Excel in memory (no temp file)
    const response = await this.drive.files.export(
      {
        fileId,
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      { responseType: 'arraybuffer' }, // Download as binary buffer
    );

    // Convert buffer to a workbook
    const workbook = xlsx.read(new Uint8Array(response.data), {
      type: 'array',
    });

    // Read ONLY the first sheet
    const sheetName = workbook.SheetNames[10];
    const worksheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON
    return xlsx.utils.sheet_to_json(worksheet);
  }
}

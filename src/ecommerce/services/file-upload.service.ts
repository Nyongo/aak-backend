import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(private readonly configService: ConfigService) {}

  async saveFile(
    file: Express.Multer.File,
    folder: string,
    customName?: string,
  ): Promise<string> {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(
        process.cwd(),
        'uploads',
        'ecommerce',
        folder,
      );
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const originalName = file.originalname;
      const extension = path.extname(originalName);

      let filename: string;
      if (customName) {
        filename = `${customName}_${timestamp}${extension}`;
      } else {
        filename = `${timestamp}_${Math.random().toString(36).substring(2)}${extension}`;
      }

      // Full path for the file
      const filePath = path.join(uploadsDir, filename);

      // Write file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Return the relative path for database storage
      const relativePath = `/uploads/ecommerce/${folder}/${filename}`;

      this.logger.log(`File saved locally: ${relativePath}`);
      return relativePath;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Failed to save file: ${errorMessage}`);
      throw new Error(`Failed to save file: ${errorMessage}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      if (!filePath) return;

      const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  getFileUrl(filePath: string): string {
    if (!filePath) return null;

    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${baseUrl}${filePath}`;
  }
}

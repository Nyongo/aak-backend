import { Injectable } from '@nestjs/common';
import { createReadStream, readFileSync } from 'fs';
import { join } from 'path';

/**
 * This service would probably download files from a file storage
 * like S3, minio etc.
 */
@Injectable()
export class DownloadService {
  constructor() {
    // create connection to your file storage
  }

  imageBuffer() {
    return readFileSync(join(process.cwd(), 'uploads', '1.png'));
  }

  imageStream() {
    // return createReadStream(join(process.cwd(), 'notiz.png'));
    return createReadStream(
      join(process.cwd(), 'uploads', '1677684499147-885092304.amr'),
    );
  }

  fileBuffer(file: string) {
    return readFileSync(join(process.cwd(), 'uploads', file));
  }

  fileStream(file: string) {
    return createReadStream(join(process.cwd(), 'uploads', file));
  }
}

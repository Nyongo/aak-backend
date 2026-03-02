import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp from 'sharp';

export interface BlogUploadResult {
  url: string;              // Cloudinary CDN URL
  publicId: string;         // Cloudinary public_id — store this for deletion
}

@Injectable()
export class BlogCloudinaryService {
  private readonly logger = new Logger(BlogCloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Converts incoming buffer to .webp (quality 85) then uploads to Cloudinary.
   * All blog images live under the "blogs/" folder in Cloudinary for organisation.
   *
   * @param buffer  - raw file buffer from multer
   * @param folder  - Cloudinary sub-folder, e.g. "blogs/hero", "blogs/inline"
   * @returns       - { url, publicId }
   */
  async uploadBlogImage(
    buffer: Buffer,
    folder: string = 'blogs',
  ): Promise<BlogUploadResult> {
    // 1. Convert to webp regardless of original format
    let webpBuffer: Buffer;
    try {
      webpBuffer = await sharp(buffer)
        .webp({ quality: 85 })
        .toBuffer();
    } catch (err) {
      this.logger.error('Sharp webp conversion failed', err);
      throw new InternalServerErrorException('Image conversion to webp failed');
    }

    // 2. Upload converted buffer to Cloudinary via upload_stream
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          format: 'webp',
        },
        (error, result: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload failed', error);
            return reject(
              new InternalServerErrorException('Cloudinary upload failed'),
            );
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(webpBuffer);
    });
  }

  /**
   * Deletes a single image from Cloudinary by its public_id.
   * Safe to call with null/undefined — it will simply do nothing.
   *
   * @param publicId - Cloudinary public_id stored in the database
   */
  async deleteBlogImage(publicId: string | null | undefined): Promise<void> {
    if (!publicId) return;

    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      this.logger.log(`Deleted Cloudinary image: ${publicId}`);
    } catch (err) {
      // Log but do not throw — a failed Cloudinary deletion should not
      // block a database delete operation.
      this.logger.error(`Failed to delete Cloudinary image: ${publicId}`, err);
    }
  }

  /**
   * Deletes multiple images from Cloudinary in parallel.
   * Used when deleting a blog post to clean up all inline images
   * that were stored inside Tiptap JSON sections.
   *
   * @param publicIds - array of Cloudinary public_ids
   */
  async deleteManyBlogImages(publicIds: (string | null | undefined)[]): Promise<void> {
    const validIds = publicIds.filter((id): id is string => !!id);
    if (validIds.length === 0) return;

    await Promise.allSettled(
      validIds.map((id) => this.deleteBlogImage(id)),
    );
  }
}

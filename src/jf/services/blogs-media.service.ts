import { Injectable } from '@nestjs/common';
import { BlogCloudinaryService, BlogUploadResult } from './blog-cloudinary.service';

@Injectable()
export class BlogsMediaService {
  constructor(private readonly blogCloudinary: BlogCloudinaryService) {}

  async upload(buffer: Buffer, folder: string): Promise<BlogUploadResult> {
    return this.blogCloudinary.uploadBlogImage(buffer, folder);
  }

  async delete(publicId: string): Promise<{ message: string }> {
    await this.blogCloudinary.deleteBlogImage(publicId);
    return { message: `Image ${publicId} deleted successfully` };
  }
}

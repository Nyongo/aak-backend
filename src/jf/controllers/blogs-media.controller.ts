import {
  Controller,
  Post,
  Delete,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BlogsMediaService } from '../services/blogs-media.service';

@Controller('blogs-media')
export class BlogsMediaController {
  constructor(private readonly blogsMediaService: BlogsMediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only image files are accepted (jpg, png, webp, gif, avif)'), false);
        }
      },
    }),
  )
  async uploadBlogImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const allowedFolders = ['blogs', 'blogs/hero', 'blogs/inline'];
    const targetFolder = allowedFolders.includes(folder) ? folder : 'blogs';

    return this.blogsMediaService.upload(file.buffer, targetFolder);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteBlogImage(@Query('publicId') publicId: string) {
    if (!publicId) throw new BadRequestException('publicId query param is required');
    return this.blogsMediaService.delete(publicId);
  }
}

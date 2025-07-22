import { Controller, Get, Put, Body, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PageBannerDto } from '../dto/page-banner.dto';
import { PageCtaDto } from '../dto/page-cta.dto';
import { NewsletterPageService } from '../services/newsletter-page.service';

@Controller('jf/page/newsletters')
export class NewsletterPageController {
  constructor(private readonly svc: NewsletterPageService) {}

  @Get('banner')
  getBanner() {
    return this.svc.getBanner();
  }

  @Put('banner')
  @UseInterceptors(FileInterceptor('imageFile', { limits: { fileSize: 5 * 1024 * 1024 } }))
  saveBanner(
    @UploadedFile() imageFile: Express.Multer.File,
    @Body() body: PageBannerDto
  ) {
    return this.svc.saveBanner(body, imageFile);
  }

  @Get('cta')
  getCta() {
    return this.svc.getCta();
  }

  @Put('cta')
  saveCta(@Body() body: PageCtaDto) {
    return this.svc.saveCta(body);
  }
}

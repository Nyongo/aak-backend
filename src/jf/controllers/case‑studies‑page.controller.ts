import { Body, Controller, Get, Put } from '@nestjs/common';
import {
  CaseStudiesPageService,
  PageBanner,
  PageCta,
} from '../services/case‑studies‑page.service';

@Controller('jf/page/case-studies')
export class CaseStudiesPageController {
  constructor(private readonly svc: CaseStudiesPageService) {}

  // --- Banner ---
  @Get('banner')
  getBanner(): Promise<PageBanner> {
    return this.svc.getBanner();
  }

  @Put('banner')
  saveBanner(@Body() body: PageBanner): Promise<PageBanner> {
    return this.svc.saveBanner(body);
  }

  // --- CTA ---
  @Get('cta')
  getCta(): Promise<PageCta> {
    return this.svc.getCta();
  }

  @Put('cta')
  saveCta(@Body() body: PageCta): Promise<PageCta> {
    return this.svc.saveCta(body);
  }
}

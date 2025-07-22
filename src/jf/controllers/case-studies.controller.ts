import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CaseStudiesService } from '../services/case-studies.service';
import { CreateCaseStudyDto } from '../dto/create-case-study.dto';
import { UpdateCaseStudyDto } from '../dto/update-case-study.dto';
import { CtaDto } from '../dto/cta.dto';
import { CaseStudy } from '../interfaces/case-study.interface';

@Controller('jf/case-studies')
export class CaseStudiesController {
  constructor(private readonly svc: CaseStudiesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('bannerFile', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async create(
    @UploadedFile() bannerFile: Express.Multer.File,
    @Body() body: Record<string, string>
  ): Promise<CaseStudy & { bannerDataUrl?: string }> {
    const dto = new CreateCaseStudyDto();
    dto.link = body.link;
    dto.order = Number(body.order);
    dto.title = body.title;
    dto.description = body.description;
    dto.isActive = body.isActive === 'false' ? false : true;

    let statsArr: any[];
    try {
      statsArr = JSON.parse(body.stats || '[]');
      if (!Array.isArray(statsArr)) throw new Error();
    } catch {
      throw new BadRequestException('`stats` must be a JSON array');
    }
    dto.stats = statsArr;

    const created = await this.svc.create({ ...dto, bannerFile });

    if (created.bannerBlob && created.bannerMime) {
      const b64 = Buffer.from(created.bannerBlob).toString('base64');
      (created as any).bannerDataUrl = `data:${created.bannerMime};base64,${b64}`;
    }
    return created as any;
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(5), ParseIntPipe) size: number
  ): Promise<{ items: CaseStudy[]; total: number }> {
    return this.svc.findAll(page, size);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CaseStudy> {
    return this.svc.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('bannerFile', { limits: { fileSize: 5 * 1024 * 1024 } }))
  async update(
    @Param('id') id: string,
    @UploadedFile() bannerFile: Express.Multer.File,
    @Body() body: Record<string, string>
  ): Promise<CaseStudy & { bannerDataUrl?: string }> {
    const dto: UpdateCaseStudyDto = {};
    if (body.slug) dto.link = body.link;
    if (body.order) dto.order = Number(body.order);
    if (body.title) dto.title = body.title;
    if (body.description) dto.description = body.description;
    if (body.isActive !== undefined) {
      dto.isActive = body.isActive === 'true';
    }
    if (body.stats) {
      let arr: any[];
      try {
        arr = JSON.parse(body.stats);
        if (!Array.isArray(arr)) throw new Error();
      } catch {
        throw new BadRequestException('`stats` must be a JSON array');
      }
      dto.stats = arr;
    }

    const updated = await this.svc.update(id, { ...dto, bannerFile });

    if (updated.bannerBlob && updated.bannerMime) {
      const b64 = Buffer.from(updated.bannerBlob).toString('base64');
      (updated as any).bannerDataUrl = `data:${updated.bannerMime};base64,${b64}`;
    }
    return updated as any;
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.svc.remove(id);
  }

  @Put(':id/cta')
  saveCta(
    @Param('id') id: string,
    @Body() body: CtaDto
  ): Promise<void> {
    return this.svc.saveCta(id, body);
  }
}

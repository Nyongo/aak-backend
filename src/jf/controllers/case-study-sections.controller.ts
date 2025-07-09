import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CaseStudySectionsService } from '../services/case-study-sections.service';
import { CreateCaseStudySectionDto } from '../dto/create-case-study-section.dto';
import { UpdateCaseStudySectionDto } from '../dto/update-case-study-section.dto';
import { SectionType } from '../interfaces/case-study-section.interface';

@Controller('jf/case-studies/:caseStudyId/sections')
export class CaseStudySectionsController {
  constructor(private readonly svc: CaseStudySectionsService) {}

  @Get()
  findAll(@Param('caseStudyId') csId: string) {
    return this.svc.findAll(csId);
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mediaFiles', maxCount: 10 },
    ]),
  )
  async create(
    @Param('caseStudyId') csId: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    // 1. Parse and validate fields from Form-Data
    const order = Number(body.order);
    if (isNaN(order)) {
      throw new BadRequestException('`order` must be a number');
    }

    let data: any;
    try {
      data = typeof body.data === 'string' 
        ? JSON.parse(body.data) 
        : body.data;
    } catch {
      throw new BadRequestException('`data` must be valid JSON');
    }

    if (![SectionType.banner, SectionType.content].includes(body.type)) {
      throw new BadRequestException('`type` must be "banner" or "content"');
    }

    // 2. Build our Create DTO
    const dto: CreateCaseStudySectionDto = {
      caseStudyId: csId,
      order,
      type: body.type as SectionType,
      data,
    };

    // 3. Delegate to service
    return this.svc.create(dto, files.mediaFiles || []);
  }

  @Put(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'mediaFiles', maxCount: 10 },
    ]),
  )
  async update(
    @Param('caseStudyId') csId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    // (Optional) you can reject if body.caseStudyId != csId

    // Parse order if present
    const dto: UpdateCaseStudySectionDto = {};
    if (body.order !== undefined) {
      const order = Number(body.order);
      if (isNaN(order)) {
        throw new BadRequestException('`order` must be a number');
      }
      dto.order = order;
    }

    // Parse data if present
    if (body.data !== undefined) {
      try {
        dto.data = typeof body.data === 'string' 
          ? JSON.parse(body.data) 
          : body.data;
      } catch {
        throw new BadRequestException('`data` must be valid JSON');
      }
    }

    // Parse type if present
    if (body.type !== undefined) {
      if (![SectionType.banner, SectionType.content].includes(body.type)) {
        throw new BadRequestException('`type` must be "banner" or "content"');
      }
      dto.type = body.type as SectionType;
    }

    return this.svc.update(id, dto, files.mediaFiles || []);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

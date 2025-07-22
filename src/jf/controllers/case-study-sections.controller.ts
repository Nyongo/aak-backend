import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { ReorderSectionsDto } from '../dto/reorder-sections.dto';
import { SectionType } from '../interfaces/case-study-section.interface';

@Controller('jf/case-studies/:caseStudyId/sections')
export class CaseStudySectionsController {
  constructor(private readonly svc: CaseStudySectionsService) {}

  @Get()
  findAll(@Param('caseStudyId') csId: string) {
    return this.svc.findAll(csId);
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'mediaFiles', maxCount: 10 }]))
  async create(
    @Param('caseStudyId') csId: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    // parse + validate
    const order = Number(body.order);
    if (isNaN(order)) throw new BadRequestException('`order` must be a number');

    let data: any;
    try {
      data = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
    } catch {
      throw new BadRequestException('`data` must be valid JSON');
    }

    if (![SectionType.banner, SectionType.content].includes(body.type)) {
      throw new BadRequestException('`type` must be banner|content');
    }

    const isActive = body.isActive !== undefined
      ? (body.isActive === 'true' || body.isActive === true)
      : true;

    const dto: CreateCaseStudySectionDto = {
      caseStudyId: csId,
      order,
      type: body.type,
      isActive,
      data,
    };

    return this.svc.create(dto, files.mediaFiles || []);
  }

  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'mediaFiles', maxCount: 10 }]))
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, any>,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    const dto: UpdateCaseStudySectionDto = {};

    if (body.order !== undefined) {
      const o = Number(body.order);
      if (isNaN(o)) throw new BadRequestException('`order` must be a number');
      dto.order = o;
    }
    if (body.type !== undefined) {
      if (![SectionType.banner, SectionType.content].includes(body.type)) {
        throw new BadRequestException('`type` must be banner|content');
      }
      dto.type = body.type;
    }
    if (body.data !== undefined) {
      try {
        dto.data = typeof body.data === 'string'
          ? JSON.parse(body.data)
          : body.data;
      } catch {
        throw new BadRequestException('`data` must be valid JSON');
      }
    }
    if (body.isActive !== undefined) {
      dto.isActive = body.isActive === 'true' || body.isActive === true;
    }

    return this.svc.update(id, dto, files.mediaFiles || []);
  }

  @Patch('reorder')
  reorder(@Body() dto: ReorderSectionsDto) {
    return this.svc.reorder(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}

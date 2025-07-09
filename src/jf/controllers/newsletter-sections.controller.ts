import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateNewsletterSectionDto } from '../dto/create-newsletter-section.dto';
import { UpdateNewsletterSectionDto } from '../dto/update-newsletter-section.dto';
import { NewsletterSectionsService } from '../services/newsletter-sections.service';

@Controller('jf/newsletters/:newsletterId/sections')
export class NewsletterSectionsController {
  constructor(private readonly svc: NewsletterSectionsService) {}

  @Get()
  findAll(@Param('newsletterId') nid: string) {
    return this.svc.findAll(nid);
  }

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'mediaFiles', maxCount: 10 }]))
  create(
    @Param('newsletterId') newsletterId: string,
    @Body() body: any,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    const dto: CreateNewsletterSectionDto = {
      newsletterId,
      type: body.type,
      order: Number(body.order),
      data: JSON.parse(body.data),
    };
    if (isNaN(dto.order)) throw new BadRequestException('order must be a number');
    return this.svc.create(dto, files.mediaFiles || []);
  }

  @Put(':id')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'mediaFiles', maxCount: 10 }]))
  update(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() files: { mediaFiles?: Express.Multer.File[] },
  ) {
    const dto: UpdateNewsletterSectionDto = {};
    if (body.type    !== undefined) dto.type  = body.type;
    if (body.order   !== undefined) dto.order = Number(body.order);
    if (body.data    !== undefined) dto.data  = JSON.parse(body.data);
    return this.svc.update(id, dto, files.mediaFiles || []);
  }

  @Delete(':sectionId')
  remove(@Param('sectionId') id: string) {
    return this.svc.remove(id);
  }
}

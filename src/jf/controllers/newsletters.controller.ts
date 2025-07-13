import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { NewslettersService } from '../services/newsletters.service';
import { CreateNewsletterDto } from '../dto/create-newsletter.dto';
import { UpdateNewsletterDto } from '../dto/update-newsletter.dto';
import { Newsletter } from '../interfaces/newsletter.interface';

@Controller('jf/newsletters')
export class NewslettersController {
  constructor(private readonly svc: NewslettersService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateNewsletterDto,
    @UploadedFile() image: Express.Multer.File,
  ): Promise<Newsletter> {
    return this.svc.create(dto, image);
  }

  @Get()
  findAll(): Promise<Newsletter[]> {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Newsletter> {
    return this.svc.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateNewsletterDto,
    @UploadedFile() image?: Express.Multer.File,
  ): Promise<Newsletter> {
    return this.svc.update(id, dto, image);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.svc.remove(id);
  }
}

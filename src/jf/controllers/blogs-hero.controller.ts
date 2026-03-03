import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BlogLanguage } from '@prisma/client';
import { BlogsHeroService } from '../services/blogs-hero.service';
import { UpsertBlogsHeroDto } from '../dto/upsert-blogs-hero.dto';

@Controller('blogs-hero')
export class BlogsHeroController {
  constructor(private readonly service: BlogsHeroService) {}

  @Get()
  get(@Query('lang') lang?: string) {
    const language = lang?.toUpperCase() === 'KIS' ? BlogLanguage.KIS : BlogLanguage.EN;
    return this.service.get(language);
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  upsert(@Body() dto: UpsertBlogsHeroDto) {
    return this.service.upsert(dto);
  }
}

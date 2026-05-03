import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { BlogLanguage } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AuthorsService } from '../services/authors.service';
import { CreateAuthorDto } from '../dto/create-author.dto';
import { UpdateAuthorDto } from '../dto/update-author.dto';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly service: AuthorsService) {}

  /** Public — CRM dropdown and author list */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Public — Angular author page. lang defaults to EN. */
  @Get(':slug')
  findBySlug(
    @Param('slug') slug: string,
    @Query('lang') lang: BlogLanguage = BlogLanguage.EN,
  ) {
    return this.service.findBySlug(slug, lang);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAuthorDto) {
    return this.service.create(dto);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  update(@Param('slug') slug: string, @Body() dto: UpdateAuthorDto) {
    return this.service.update(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BlogCategoriesService } from '../services/blog-categories.service';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';
import { UpdateBlogCategoryDto } from '../dto/update-blog-category.dto';

@Controller('blog-categories')
export class BlogCategoriesController {
  constructor(private readonly service: BlogCategoriesService) {}

  /** Public — returns all categories including meta fields */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** Public — single category by slug, used by Angular SEO category page */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.service.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBlogCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  update(@Param('slug') slug: string, @Body() dto: UpdateBlogCategoryDto) {
    return this.service.update(slug, dto);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug);
  }
}

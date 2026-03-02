import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BlogCategoriesService } from '../services/blog-categories.service';
import { CreateBlogCategoryDto } from '../dto/create-blog-category.dto';

@Controller('blog-categories')
export class BlogCategoriesController {
  constructor(private readonly service: BlogCategoriesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBlogCategoryDto) {
    return this.service.create(dto);
  }
}

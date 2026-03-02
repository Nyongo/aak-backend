import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { BlogLanguage } from '@prisma/client';
import { QueryBlogPostsDto } from '../dto/query-blog-posts.dto';
import { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import { UpdateBlogPostDto } from '../dto/update-blog-post.dto';
import { BlogsService } from '../services/blogs.service';

@Controller('blogs')
export class BlogsController {
  constructor(private readonly service: BlogsService) {}

  // ── Public endpoints ────────────────────────────────────────

  /** List published posts with filtering, search and pagination */
  @Get()
  findAll(@Query() query: QueryBlogPostsDto) {
    return this.service.findAll(query);
  }

  // ── CRM / admin endpoints (protected) ──────────────────────
  // IMPORTANT: @Get('admin/all') MUST be defined before @Get(':slug')
  // otherwise NestJS treats the literal word "admin" as a slug value
  // and this route is never reached.

  /** List ALL posts (including drafts) — for the CRM dashboard */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin(@Query() query: QueryBlogPostsDto) {
    return this.service.findAllAdmin(query);
  }

  /** Single published post by slug */
  @Get(':slug')
  findOne(
    @Param('slug') slug: string,
    @Query('lang') lang?: string,
  ) {
    const language =
      lang?.toUpperCase() === 'KIS' ? BlogLanguage.KIS : BlogLanguage.EN;
    return this.service.findOne(slug, language);
  }

  /** Create a new blog post */
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateBlogPostDto) {
    return this.service.create(dto);
  }

  /** Update a blog post (partial — only send fields that changed) */
  @Patch(':slug')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.service.update(slug, dto);
  }

  /** Toggle DRAFT ↔ PUBLISHED */
  @Patch(':slug/publish')
  @UseGuards(JwtAuthGuard)
  togglePublish(@Param('slug') slug: string) {
    return this.service.togglePublish(slug);
  }

  /** Delete a post and all its Cloudinary images */
  @Delete(':slug')
  @UseGuards(JwtAuthGuard)
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug);
  }
}

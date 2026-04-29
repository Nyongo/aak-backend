import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AcademyLanguage } from '@prisma/client';
import { AcademyGuidesService }    from '../services/academy-guides.service';
import { CreateAcademyGuideDto }   from '../dto/create-academy-guide.dto';
import { UpdateAcademyGuideDto }   from '../dto/update-academy-guide.dto';
import { QueryAcademyGuidesDto }   from '../dto/query-academy-guides.dto';
import { AcademySubscribeDto }     from '../dto/academy-subscribe.dto';

@Controller('academy-guides')
export class AcademyGuidesController {
  constructor(private readonly service: AcademyGuidesService) {}

  // ── Public ──────────────────────────────────────────────────

  @Get()
  findAll(@Query() query: QueryAcademyGuidesDto) {
    return this.service.findAll(query);
  }

  // IMPORTANT: named routes must come before :id
  @Get('featured')
  findFeatured(@Query('lang') lang?: string) {
    const language = lang?.toUpperCase() === 'KIS' ? AcademyLanguage.KIS : AcademyLanguage.EN;
    return this.service.findFeatured(language);
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  findAllAdmin(@Query() query: QueryAcademyGuidesDto) {
    return this.service.findAllAdmin(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('lang') lang?: string) {
    const language = lang?.toUpperCase() === 'KIS' ? AcademyLanguage.KIS : AcademyLanguage.EN;
    return this.service.findOne(id, language);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard)
  findOneAdmin(@Param('id') id: string) {
    return this.service.findOneAdmin(id);
  }

  // ── Admin ────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAcademyGuideDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAcademyGuideDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/feature')
  @UseGuards(JwtAuthGuard)
  toggleFeatured(@Param('id') id: string) {
    return this.service.toggleFeatured(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ── Public subscribe ─────────────────────────────────────────

  @Post(':id/subscribe')
  subscribe(@Param('id') id: string, @Body() dto: AcademySubscribeDto) {
    return this.service.subscribe(id, dto.email);
  }
}

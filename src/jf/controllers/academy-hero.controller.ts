import { Controller, Get, Patch, Delete, Query, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AcademyHeroService } from '../services/academy-hero.service';
import { AcademyLanguage }   from '@prisma/client';

@Controller('academy-hero')
export class AcademyHeroController {
  constructor(private readonly service: AcademyHeroService) {}

  @Get()
  get(@Query('lang') lang?: string) {
    const language = lang?.toUpperCase() === 'KIS' ? AcademyLanguage.KIS : AcademyLanguage.EN;
    return this.service.get(language);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard)
  getAll() { return this.service.getAll(); }

  @Patch()
  @UseGuards(JwtAuthGuard)
  upsert(@Body() dto: any) { return this.service.upsert(dto); }

  @Delete()
  @UseGuards(JwtAuthGuard)
  reset() { return this.service.reset(); }
}

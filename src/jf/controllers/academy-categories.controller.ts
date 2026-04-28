import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AcademyCategoriesService }    from '../services/academy-categories.service';
import { CreateAcademyCategoryDto }    from '../dto/create-academy-category.dto';
import { UpdateAcademyCategoryDto }    from '../dto/update-academy-category.dto';

@Controller('academy-categories')
export class AcademyCategoriesController {
  constructor(private readonly service: AcademyCategoriesService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAcademyCategoryDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAcademyCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}

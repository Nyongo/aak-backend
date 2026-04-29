import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AcademyTagsService }    from '../services/academy-tags.service';
import { CreateAcademyTagDto }   from '../dto/create-academy-tag.dto';
import { UpdateAcademyTagDto }   from '../dto/update-academy-tag.dto';

@Controller('academy-tags')
export class AcademyTagsController {
  constructor(private readonly service: AcademyTagsService) {}

  @Get()
  findAll() { return this.service.findAll(); }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.service.findOne(id); }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateAcademyTagDto) { return this.service.create(dto); }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdateAcademyTagDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) { return this.service.remove(id); }
}

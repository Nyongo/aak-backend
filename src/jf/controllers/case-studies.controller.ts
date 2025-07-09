import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from '@nestjs/common';
import { CaseStudiesService } from '../services/case-studies.service';
import { CreateCaseStudyDto } from '../dto/create-case-study.dto';
import { UpdateCaseStudyDto } from '../dto/update-case-study.dto';
import { CaseStudy } from '../interfaces/case-study.interface';

@Controller('jf/case-studies')
export class CaseStudiesController {
  constructor(private readonly svc: CaseStudiesService) {}

  @Post()
  create(@Body() dto: CreateCaseStudyDto): Promise<CaseStudy> {
    return this.svc.create(dto);
  }

  @Get()
  findAll(): Promise<CaseStudy[]> {
    return this.svc.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<CaseStudy> {
    return this.svc.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStudyDto,
  ): Promise<CaseStudy> {
    return this.svc.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.svc.remove(id);
  }
}

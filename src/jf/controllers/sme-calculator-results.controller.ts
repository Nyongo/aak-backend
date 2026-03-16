import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Patch,
  Query,
} from '@nestjs/common';
import { SmeCalculatorResultsService } from '../services/sme-calculator-results.service';
import { CreateSmeCalculatorResultDto } from '../dto/create-sme-calculator-result.dto';
import { UpdateSmeCalculatorResultDto } from '../dto/update-sme-calculator-result.dto';

@Controller('jf/sme-calculator-results')
export class SmeCalculatorResultsController {
  constructor(
    private readonly smeCalculatorResultsService: SmeCalculatorResultsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateSmeCalculatorResultDto) {
    return this.smeCalculatorResultsService.create(dto);
  }

  @Get()
  async findAll(
    @Query('clientName') clientName?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const parsedSkip = skip ? Number(skip) : 0;
    const parsedTake = take ? Number(take) : 50;

    return this.smeCalculatorResultsService.findAll({
      clientName,
      skip: Number.isNaN(parsedSkip) ? 0 : parsedSkip,
      take: Number.isNaN(parsedTake) ? 50 : parsedTake,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.smeCalculatorResultsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSmeCalculatorResultDto,
  ) {
    return this.smeCalculatorResultsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.smeCalculatorResultsService.remove(id);
  }
}


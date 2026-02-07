import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import { PipelineService } from '../services/pipeline.service';
import { CreatePipelineEntryDto } from '../dtos/create-pipeline-entry.dto';
import { UpdatePipelineEntryDto } from '../dtos/update-pipeline-entry.dto';
import {
  LOAN_STAGE_OPTIONS,
  REGION_OPTIONS,
  PRODUCT_OPTIONS,
} from '../constants/pipeline-options';

@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post()
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(@Body() dto: CreatePipelineEntryDto) {
    return this.pipelineService.create(dto);
  }

  @Get()
  async findAll(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('region') region?: string,
    @Query('sslStaffId') sslStaffId?: string,
    @Query('loanStage') loanStage?: string,
    @Query('product') product?: string,
    @Query('clientType') clientType?: string,
    @Query('estimatedClosingFrom') estimatedClosingFrom?: string,
    @Query('estimatedClosingTo') estimatedClosingTo?: string,
  ) {
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 50;
    return this.pipelineService.findAll(page, pageSize, {
      search,
      status,
      region,
      sslStaffId,
      loanStage,
      product,
      clientType,
      estimatedClosingFrom,
      estimatedClosingTo,
    });
  }

  @Get('options')
  getOptions() {
    return {
      response: { code: 200, message: 'Pipeline options retrieved successfully.' },
      data: {
        loanStages: [...LOAN_STAGE_OPTIONS],
        regions: [...REGION_OPTIONS],
        products: [...PRODUCT_OPTIONS],
      },
    };
  }

  @Get('metrics')
  async getMetrics(
    @Query('status') status?: string,
    @Query('region') region?: string,
    @Query('sslStaffId') sslStaffId?: string,
    @Query('product') product?: string,
    @Query('loanStage') loanStage?: string,
    @Query('clientType') clientType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('estimatedClosingFrom') estimatedClosingFrom?: string,
    @Query('estimatedClosingTo') estimatedClosingTo?: string,
  ) {
    const filters = {
      ...(status && { status }),
      ...(region && { region }),
      ...(sslStaffId && { sslStaffId }),
      ...(product && { product }),
      ...(loanStage && { loanStage }),
      ...(clientType && { clientType }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(estimatedClosingFrom && { estimatedClosingFrom }),
      ...(estimatedClosingTo && { estimatedClosingTo }),
    };
    const data = await this.pipelineService.getMetrics(filters);
    return {
      response: { code: 200, message: 'Pipeline metrics retrieved successfully.' },
      data,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pipelineService.findOne(id);
  }

  @Put(':id')
  @HttpCode(200)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePipelineEntryDto,
  ) {
    return this.pipelineService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.pipelineService.remove(id);
  }
}

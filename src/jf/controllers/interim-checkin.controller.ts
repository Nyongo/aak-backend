import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InterimCheckInService } from '../services/interim-checkin.service';
import { CreateInterimCheckInDto } from '../dto/create-interim-checkin.dto';
import { UpdateInterimCheckInDto } from '../dto/update-interim-checkin.dto';

@Controller('jf/interim-checkin')
export class InterimCheckInController {
  constructor(private readonly interimCheckInService: InterimCheckInService) {}

  @Get('by-application/:creditApplicationId')
  async byApplication(
    @Param('creditApplicationId') creditApplicationId: string,
    @Query('checkInKind') checkInKind?: string,
    @Query('termNumber') termNumber?: string,
  ) {
    const data = await this.interimCheckInService.findByApplication(
      creditApplicationId,
      { checkInKind, termNumber },
    );
    return {
      response: { code: 200, message: 'OK' },
      data,
    };
  }

  @Get('by-borrower/:borrowerId')
  async byBorrower(
    @Param('borrowerId') borrowerId: string,
    @Query('checkInKind') checkInKind?: string,
    @Query('termNumber') termNumber?: string,
  ) {
    const data = await this.interimCheckInService.findByBorrower(borrowerId, {
      checkInKind,
      termNumber,
    });
    return {
      response: { code: 200, message: 'OK' },
      data,
    };
  }

  @Get(':interimCheckInId')
  async findOne(@Param('interimCheckInId') interimCheckInId: string) {
    const data = await this.interimCheckInService.findOne(interimCheckInId);
    return {
      response: { code: 200, message: 'OK' },
      data,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateInterimCheckInDto) {
    const data = await this.interimCheckInService.create(dto);
    return {
      response: { code: 201, message: 'Created' },
      data,
    };
  }

  @Patch(':interimCheckInId')
  async update(
    @Param('interimCheckInId') interimCheckInId: string,
    @Body() dto: UpdateInterimCheckInDto,
  ) {
    const data = await this.interimCheckInService.update(interimCheckInId, dto);
    return {
      response: { code: 200, message: 'OK' },
      data,
    };
  }
}

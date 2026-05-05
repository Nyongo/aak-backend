import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ImpactSurveySubmissionsService } from '../services/impact-survey-submissions.service';
import { CreateImpactSurveySubmissionDto } from '../dto/create-impact-survey-submission.dto';
import { UpdateImpactSurveySubmissionDto } from '../dto/update-impact-survey-submission.dto';

@Controller('jf/impact-survey')
export class ImpactSurveySubmissionsController {
  constructor(
    private readonly impactSurveySubmissionsService: ImpactSurveySubmissionsService,
  ) {}

  @Post()
  async create(@Body() dto: CreateImpactSurveySubmissionDto) {
    const rec = await this.impactSurveySubmissionsService.create(dto);
    return { success: true, data: rec };
  }

  @Get('by-application/:creditApplicationId')
  async byApplication(@Param('creditApplicationId') creditApplicationId: string) {
    const recs =
      await this.impactSurveySubmissionsService.findByApplication(
        creditApplicationId,
      );
    return { success: true, count: recs.length, data: recs };
  }

  @Get('by-borrower/:borrowerId')
  async byBorrower(@Param('borrowerId') borrowerId: string) {
    const recs = await this.impactSurveySubmissionsService.findByBorrower(
      borrowerId,
    );
    return { success: true, count: recs.length, data: recs };
  }

  @Get(':impactSurveyId')
  async findOne(@Param('impactSurveyId') impactSurveyId: string) {
    const rec = await this.impactSurveySubmissionsService.findOne(
      impactSurveyId,
    );
    return { success: true, data: rec };
  }

  @Patch(':impactSurveyId')
  async update(
    @Param('impactSurveyId') impactSurveyId: string,
    @Body() dto: UpdateImpactSurveySubmissionDto,
  ) {
    const rec = await this.impactSurveySubmissionsService.update(
      impactSurveyId,
      dto,
    );
    return { success: true, data: rec };
  }
}


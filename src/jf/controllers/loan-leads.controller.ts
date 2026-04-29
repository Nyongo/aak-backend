import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from '../../common/services/mail.service';

@Controller('jf/loan-leads')
export class LoanLeadsController {
  constructor(private readonly mailService: MailService) {}

  @Post('sme')
  async submitSmeLoanLead(@Body() body: any) {
    await this.mailService.sendSmeLoanEmail(body);
    return { message: 'SME loan lead email sent successfully' };
  }

  @Post('school-finance')
  async submitSchoolFinanceLoanLead(@Body() body: any) {
    await this.mailService.sendSchoolFinanceLoanEmail(body);
    return { message: 'School finance loan lead email sent successfully' };
  }

  @Post('school-fees')
  async submitSchoolFeesLoanLead(@Body() body: any) {
    await this.mailService.sendSchoolFeesLoanEmail(body);
    return { message: 'School fees loan lead email sent successfully' };
  }
}

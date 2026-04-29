import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from '../../common/services/mail.service';

@Controller('jf/partner-enquiry')
export class PartnerApplicationEnquiryController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  async submitPartnerEnquiry(@Body() body: any) {
    await this.mailService.sendPartnerApplicationEmail(body);
    return { message: 'Partner enquiry submitted successfully' };
  }
}

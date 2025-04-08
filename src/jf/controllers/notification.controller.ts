import { Controller, Post, Body } from '@nestjs/common';
import { MailService } from '../../common/services/mail.service';

@Controller('jf/notification')
export class NotificationController {
  constructor(private readonly mailService: MailService) {}

  @Post('send-email')
  async sendEmail(@Body() emailData: any) {
    if (emailData.type === 'upskill-registration') {
      await this.mailService.sendUpskillRegistrationEmail(emailData);
    } else if (emailData.type === 'contact-us') {
      await this.mailService.sendContactUsEmail(emailData);
    }
    return { message: 'Email sent successfully' };
  }
}

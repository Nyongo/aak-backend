import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { NewsletterSubscriptionService } from '../services/newsletter-subscription.service';
import { CreateNewsletterSubscriptionDto } from '../dto/create-newsletter-subscription.dto';
import { UpdateNewsletterSubscriptionDto } from '../dto/update-newsletter-subscription.dto';


@Controller('jf/newsletter-subscription')
export class NewsletterSubscriptionController {
  constructor(private readonly service: NewsletterSubscriptionService) {}

  @Post('')
  create(@Body() dto: CreateNewsletterSubscriptionDto) {
    return this.service.create(dto);
  }

  @Get('')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNewsletterSubscriptionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

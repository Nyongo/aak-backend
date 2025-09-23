import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsletterSubscriptionDto } from './create-newsletter-subscription.dto';

export class UpdateNewsletterSubscriptionDto extends PartialType(CreateNewsletterSubscriptionDto) {}
// makes all fields optional by extending CreateNewsletterSubscriptionDto
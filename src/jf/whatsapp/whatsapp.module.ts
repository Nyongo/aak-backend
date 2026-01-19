import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ZohoCrmService } from '../services/zoho-crm.service';

@Module({
  imports: [HttpModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService, ConversationService, PrismaService, ZohoCrmService],
  exports: [WhatsAppService, ConversationService],
})
export class WhatsAppModule {}

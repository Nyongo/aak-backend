import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { ConversationService } from './conversation.service';

@Controller('whatsapp')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly conversationService: ConversationService,
  ) {}

  /**
   * Webhook verification endpoint (for Meta WhatsApp API)
   */
  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return HttpStatus.FORBIDDEN;
  }

  /**
   * Webhook endpoint to receive messages from WhatsApp (Meta API)
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any, @Headers('x-hub-signature-256') signature?: string) {
    try {
      // Meta WhatsApp API webhook format
      if (body.object === 'whatsapp_business_account') {
        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;

        // Handle incoming messages
        if (value?.messages) {
          const message = value.messages[0];
          const from = message.from;
          const text = message.text?.body;

          if (from && text) {
            this.logger.log(`📨 WhatsApp message from ${from}: ${text}`);
            // Process asynchronously
            this.conversationService
              .handleIncomingMessage(from, text)
              .catch((error) => {
                this.logger.error('Error processing WhatsApp message:', error);
              });
          }
        }

        // Handle status updates (message delivered, read, etc.)
        if (value?.statuses) {
          const status = value.statuses[0];
          this.logger.debug(
            `Message ${status.id} status: ${status.status} to ${status.recipient_id}`,
          );
        }
      }

      return { status: 'ok' };
    } catch (error) {
      this.logger.error('❌ Webhook error:', error);
      const message = error instanceof Error ? error.message : String(error);
      return { status: 'error', message };
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'whatsapp',
      timestamp: new Date().toISOString(),
    };
  }
}

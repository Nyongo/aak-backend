import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiVersion = 'v21.0';
  private readonly phoneNumberId: string;
  private readonly accessToken: string;
  private readonly apiUrl: string;

  constructor() {
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    if (!this.phoneNumberId || !this.accessToken) {
      this.logger.warn(
        'WhatsApp credentials not fully configured. Please set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN',
      );
    }
  }

  /**
   * Send a WhatsApp message using Meta WhatsApp Business API
   */
  async sendMessage(to: string, message: string): Promise<boolean> {
    try {
      // Validate configuration
      if (!this.phoneNumberId || !this.accessToken) {
        this.logger.error('WhatsApp credentials not configured');
        return false;
      }

      // Format phone number (remove + if present, ensure it's just digits)
      const phoneNumber = this.formatPhoneForApi(to);

      if (!phoneNumber) {
        this.logger.error(`Invalid phone number: ${to}`);
        return false;
      }

      // Send message via Meta WhatsApp API
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: {
            preview_url: false,
            body: message,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`✅ WhatsApp message sent to ${phoneNumber}`);
      return true;
    } catch (error: any) {
      this.logger.error(
        `❌ Error sending WhatsApp message: ${error.message}`,
        error.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Format phone number for Meta API (needs to be in international format without +)
   */
  private formatPhoneForApi(phone: string): string | null {
    // Remove whatsapp: prefix if present
    let cleaned = phone.replace(/^whatsapp:/, '');

    // Remove all non-digit characters except leading +
    cleaned = cleaned.replace(/[^\d+]/g, '');

    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }

    // Validate: should be 10-15 digits
    if (!/^\d{10,15}$/.test(cleaned)) {
      return null;
    }

    return cleaned;
  }

  /**
   * Format phone number for display
   */
  formatPhoneNumber(phone: string): string {
    // Remove whatsapp: prefix if present
    const cleaned = phone.replace(/^whatsapp:/, '');

    // Format Kenyan phone numbers (+254...)
    if (cleaned.startsWith('254')) {
      return cleaned.replace(
        /(\d{3})(\d{3})(\d{3})(\d{3})/,
        '+254 $1 $2 $3 $4',
      );
    }

    // Format other international numbers
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    return cleaned;
  }
}

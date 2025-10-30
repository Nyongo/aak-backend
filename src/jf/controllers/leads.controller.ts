import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateLeadDto } from '../dto/create-lead.dto';
import { ZohoCrmService } from '../services/zoho-crm.service';

@Controller('jf/leads')
export class LeadsController {
  constructor(private readonly zoho: ZohoCrmService) {}

  private verifyApiKey(apiKey?: string) {
    console.log('process.env.ZOHO_CRM_DRY_RUN', process.env.ZOHO_CRM_DRY_RUN);
    if (process.env.ZOHO_CRM_DRY_RUN === 'true') return true;
    const expected = process.env.WEBSITE_API_KEY;
    if (!expected) return true; // allow if not configured
    return expected === apiKey;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createLead(
    @Body() dto: CreateLeadDto,
    @Headers('x-website-api-key') apiKey?: string,
  ) {
    if (!this.verifyApiKey(apiKey)) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const result = await this.zoho.createLead(dto);
      const link = result.link; // service builds the CRM link with DC
      return {
        success: true,
        data: { id: result.id, status: result.status, link },
      };
    } catch (error: any) {
      const zohoData = error?.response?.data;
      const message =
        zohoData?.data?.[0]?.message ||
        zohoData?.message ||
        (error instanceof Error ? error.message : 'Failed to create lead');
      const url = error?.response?.config?.url;
      const status = error?.response?.status;
      return {
        success: false,
        error: message,
        details: { status, url, zoho: zohoData },
      };
    }
  }
}

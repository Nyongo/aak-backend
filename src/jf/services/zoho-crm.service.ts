import { Inject, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import type { CreateLeadDto } from '../dto/create-lead.dto';

@Injectable()
export class ZohoCrmService {
  private readonly logger = new Logger(ZohoCrmService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private getZohoDomains() {
    const dc = process.env.ZOHO_DC?.trim() || 'com';
    const accountsHost = `https://accounts.zoho.${dc}`;
    const apiHost = `https://www.zohoapis.${dc}`;
    const crmHost = `https://crm.zoho.${dc}`;
    return { accountsHost, apiHost, crmHost };
  }

  private async getAccessToken(): Promise<string> {
    if (process.env.ZOHO_CRM_DRY_RUN === 'true') {
      return 'dry-run-token';
    }
    const cacheKey = 'zoho_crm_access_token';
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return cached;

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Zoho OAuth env vars missing (ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN)',
      );
    }

    const { accountsHost } = this.getZohoDomains();
    const url = `${accountsHost}/oauth/v2/token`;
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    });

    this.logger.log('Refreshing Zoho CRM access token');
    const resp = await axios.post(url, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      validateStatus: (s) => s < 500,
    });

    if (resp.status !== 200 || !resp.data?.access_token) {
      throw new Error(
        `Failed to refresh Zoho token: ${resp.status} ${JSON.stringify(resp.data)}`,
      );
    }

    const token = resp.data.access_token as string;
    await this.cache.set(cacheKey, token, 50 * 60 * 1000);
    return token;
  }

  private buildLeadPayload(dto: CreateLeadDto) {
    // Prefer explicit lastName/firstName; fallback to splitting name
    let firstName = dto.firstName?.trim();
    let lastName = dto.lastName?.trim();
    if (!lastName) {
      const n = (dto.name || '').trim();
      if (n.includes(' ')) {
        const parts = n.split(/\s+/);
        firstName = firstName || parts.slice(0, -1).join(' ');
        lastName = parts[parts.length - 1];
      } else {
        lastName = n || 'Website Lead';
      }
    }
    const descriptionParts: string[] = [];
    if (dto.message) descriptionParts.push(`Message: ${dto.message}`);
    if (dto.utm) descriptionParts.push(`UTM: ${JSON.stringify(dto.utm)}`);
    if ((dto as any).timestamp)
      descriptionParts.push(`Timestamp: ${(dto as any).timestamp}`);

    const normalizeSource = (s?: string) => {
      if (!s) return undefined;
      const v = s.toLowerCase();
      if (v.includes('social')) return 'Social Media';
      if (v.includes('landing') || v.includes('website') || v.includes('web'))
        return 'Website';
      if (v.includes('advert') || v.includes('ad')) return 'Advertisement';
      if (v.includes('referral')) return 'External Referral';
      if (v.includes('email')) return 'Email';
      if (v.includes('chat')) return 'Chat';
      return s; // fallback to original
    };

    const payload: Record<string, any> = {
      Last_Name: lastName,
      Company: dto.company || 'Website',
    };
    // Map Company also to custom field "School Name" (API name typically School_Name)
    if (dto.company) payload.School_Name = dto.company;

    if (firstName) payload.First_Name = firstName;
    if (dto.email) payload.Email = dto.email;
    // Map mobile to both Phone and Mobile; prefer explicit phone if provided
    if (dto.mobile) {
      payload.Mobile = dto.mobile;
      payload.Phone = dto.phone || dto.mobile;
    } else if (dto.phone) {
      payload.Phone = dto.phone;
    }
    if (dto.source) payload.Lead_Source = normalizeSource(dto.source);
    if (dto.title) payload.Title = dto.title;
    if (dto.industry) payload.Industry = dto.industry;
    if (dto.annualRevenue) payload.Annual_Revenue = dto.annualRevenue;
    if (dto.website) payload.Website = dto.website;
    if (dto.leadStatus) payload.Lead_Status = dto.leadStatus;
    if (dto.street) payload.Street = dto.street;
    if (dto.city) payload.City = dto.city;
    if (dto.state) payload.State = dto.state;
    if (dto.zip) payload.Zip_Code = dto.zip;
    if (dto.country) payload.Country = dto.country;
    if (dto.ownerId) payload.Owner = { id: dto.ownerId };
    if (descriptionParts.length)
      payload.Description = descriptionParts.join(' | ');

    return { data: [payload] };
  }

  async createLead(
    dto: CreateLeadDto,
  ): Promise<{ id?: string; status?: string; link?: string }> {
    if (process.env.ZOHO_CRM_DRY_RUN === 'true') {
      const mockId = `DRY-${Date.now()}`;
      const { crmHost } = this.getZohoDomains();
      const orgId = process.env.ZOHO_ORG_ID || '000000000';
      const link = `${crmHost}/crm/org${orgId}/tab/Leads/${mockId}`;
      return { id: mockId, status: 'success', link };
    }
    const token = await this.getAccessToken();
    const { apiHost, crmHost } = this.getZohoDomains();
    const url = `${apiHost}/crm/v2/Leads`;

    const resp = await axios.post(url, this.buildLeadPayload(dto), {
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
      },
      validateStatus: (s) => s < 500,
    });

    if (resp.status !== 201 && resp.status !== 200) {
      const error = new Error('Zoho CRM lead creation failed') as any;
      error.response = {
        status: resp.status,
        data: resp.data,
        config: { url },
      };
      throw error;
    }

    const orgId = process.env.ZOHO_ORG_ID;
    const item = resp.data?.data?.[0];
    const id = item?.details?.id || item?.id;
    const link =
      id && orgId ? `${crmHost}/crm/org${orgId}/tab/Leads/${id}` : undefined;
    return { id, status: item?.status, link };
  }
}

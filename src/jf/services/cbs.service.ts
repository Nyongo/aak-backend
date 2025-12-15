import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface CreateCbsClientRequest {
  officeId: number;
  fullname: string;
  externalId?: string;
  dateFormat?: string;
  locale?: string;
  active?: boolean;
  activationDate?: string;
  submittedOnDate: string;
  savingsProductId?: string;
}

export interface CreateCbsClientResponse {
  officeId: number;
  clientId: number;
  resourceId: number;
}

@Injectable()
export class CbsService {
  private readonly logger = new Logger(CbsService.name);
  private readonly CBS_BASE_URL: string;
  private readonly CBS_TENANT: string;
  private readonly CBS_AUTH_HEADER: string;

  constructor(private readonly configService: ConfigService) {
    this.CBS_BASE_URL =
      this.configService.get<string>('CBS_BASE_URL') ||
      'https://uat.jackfruit.helaplus.com/fineract-provider/api/v1';
    this.CBS_TENANT =
      this.configService.get<string>('CBS_TENANT') || 'default';
    this.CBS_AUTH_HEADER =
      this.configService.get<string>('CBS_AUTH_HEADER') ||
      'Basic aGVsYXBsdXM6SjZja2ZydTF0MjAyNQ==';

    this.logger.log(`CBS Service initialized with base URL: ${this.CBS_BASE_URL}`);
  }

  /**
   * Creates a client in the CBS system
   * @param request - The client creation request
   * @returns The created client response with clientId and resourceId
   */
  async createClient(
    request: CreateCbsClientRequest,
  ): Promise<CreateCbsClientResponse> {
    try {
      this.logger.log(
        `Creating CBS client for: ${request.fullname}`,
      );

      const url = `${this.CBS_BASE_URL}/clients`;

      const payload = {
        officeId: request.officeId || 1,
        fullname: request.fullname,
        externalId: request.externalId || '',
        dateFormat: request.dateFormat || 'dd MMMM yyyy',
        locale: request.locale || 'en',
        active: request.active !== undefined ? request.active : false,
        activationDate: request.activationDate || '',
        submittedOnDate: request.submittedOnDate,
        savingsProductId: request.savingsProductId || '',
      };

      this.logger.debug(`CBS API Request: ${JSON.stringify(payload)}`);

      const response = await axios.post<CreateCbsClientResponse>(
        url,
        payload,
        {
          headers: {
            'MIFOS_TENANT': this.CBS_TENANT,
            'Content-Type': 'application/json',
            'Authorization': this.CBS_AUTH_HEADER,
          },
          timeout: 30000, // 30 seconds timeout
        },
      );

      this.logger.log(
        `CBS client created successfully. ClientId: ${response.data.clientId}, ResourceId: ${response.data.resourceId}`,
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const errorMessage =
          axiosError.response?.data ||
          axiosError.message ||
          'Unknown error creating CBS client';

        this.logger.error(
          `Failed to create CBS client: ${JSON.stringify(errorMessage)}`,
        );

        throw new HttpException(
          {
            message: 'Failed to create client in CBS',
            error: errorMessage,
            statusCode: axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
          },
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.error(`Unexpected error creating CBS client: ${error}`);
      throw new HttpException(
        {
          message: 'Unexpected error creating CBS client',
          error: error instanceof Error ? error.message : 'Unknown error',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Formats a date to the CBS required format (dd MMMM yyyy)
   * @param date - The date to format
   * @returns Formatted date string
   */
  formatDateForCbs(date: Date): string {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month} ${year}`;
  }
}






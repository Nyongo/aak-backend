import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
// import * as dotenv from 'dotenv';

// dotenv.config();

@Injectable()
export class AppsheetService {
  private readonly BASE_URL = 'https://api.appsheet.com/api/v2';
  private readonly API_KEY = process.env.APPSHEET_API_KEY;
  private readonly APP_ID = process.env.APPSHEET_APP_ID; // Add this in .env
  private readonly baseUrl = `https://api.appsheet.com/api/v2/apps/${process.env.APPSHEET_APP_ID}`;

  // async getTableData(tableName: string) {
  //   try {
  //     const response = await axios.get(
  //       `${this.BASE_URL}/apps/${this.APP_ID}/tables/${tableName}/data`,
  //       { headers: { ApplicationAccessKey: this.API_KEY } },
  //     );
  //     return response.data;
  //   } catch (error) {
  //     throw new HttpException(
  //       error || 'Failed to fetch data',
  //       HttpStatus.INTERNAL_SERVER_ERROR,
  //     );
  //   }
  // }

  async getTableData(tableName: string) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tables/${tableName}/Find`, // POST required
        {}, // AppSheet requires an empty body for this request
        {
          headers: { ApplicationAccessKey: process.env.APPSHEET_API_KEY },
        },
      );
      console.log('response', response);
      return response.data;
    } catch (error) {
      throw new HttpException(
        error || 'Error fetching data from AppSheet',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

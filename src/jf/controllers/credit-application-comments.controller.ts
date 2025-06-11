import { Controller, Post, Get, Param, Body, Logger } from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/credit-application-comments')
export class CreditApplicationCommentsController {
  private readonly logger = new Logger(
    CreditApplicationCommentsController.name,
  );
  private readonly SHEET_NAME = 'Credit Application Comments';

  constructor(private readonly sheetsService: SheetsService) {}

  @Post()
  async createComment(
    @Body()
    createDto: {
      creditApplicationId: string;
      comment: string;
      commentedBy?: string;
    },
  ) {
    try {
      // Generate unique ID for the comment
      const id = `COM-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Format current date as DD/MM/YYYY HH:mm:ss
      const now = new Date();
      const createdAt = now.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const rowData = {
        ID: id,
        'Commenter Type': 'SSL Submitting Application',
        'Credit Application ID': createDto.creditApplicationId,
        Comments: createDto.comment,
        'Commenter Name': createDto.commentedBy || '',
        'Created At': createdAt,
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData, true);

      return {
        success: true,
        message: 'Comment added successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating comment: ${apiError.message}`);
      throw error;
    }
  }

  @Get('by-application/:creditApplicationId')
  async getCommentsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching comments for credit application: ${creditApplicationId}`,
      );

      const comments = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );

      if (!comments || comments.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = comments[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        return {
          success: false,
          message: 'Credit Application ID column not found',
          data: [],
        };
      }

      const filteredData = comments
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const comment = {};
          headers.forEach((header, index) => {
            comment[header] = row[index];
          });
          return comment;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching comments for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getCommentById(@Param('id') id: string) {
    try {
      const comments = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );
      if (!comments || comments.length === 0) {
        return { success: false, message: 'No comments found' };
      }

      const headers = comments[0];
      const idIndex = headers.indexOf('ID');
      const commentRow = comments.find((row) => row[idIndex] === id);

      if (!commentRow) {
        return { success: false, message: 'Comment not found' };
      }

      const comment = {};
      headers.forEach((header, index) => {
        comment[header] = commentRow[index];
      });

      return { success: true, data: comment };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching comment ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Get()
  async getAllComments() {
    try {
      const comments = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
        true,
      );

      if (!comments || comments.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = comments[0];
      const data = comments.slice(1).map((row) => {
        const comment = {};
        headers.forEach((header, index) => {
          comment[header] = row[index];
        });
        return comment;
      });

      return {
        success: true,
        count: data.length,
        data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all comments: ${apiError.message}`);
      throw error;
    }
  }
}

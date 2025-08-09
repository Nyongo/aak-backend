import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SheetsService } from '../services/sheets.service';
import { CreditApplicationCommentsDbService } from '../services/credit-application-comments-db.service';
import { CreditApplicationCommentsSyncService } from '../services/credit-application-comments-sync.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { CreateCreditApplicationCommentDto } from '../dto/create-credit-application-comment.dto';

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

  constructor(
    private readonly sheetsService: SheetsService,
    private readonly creditApplicationCommentsDbService: CreditApplicationCommentsDbService,
    private readonly creditApplicationCommentsSyncService: CreditApplicationCommentsSyncService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      exceptionFactory: (errors) => {
        const errorMessages = errors.map((error) => {
          if (error.constraints) {
            return Object.values(error.constraints).join(', ');
          }
          return error.property;
        });
        return new Error(`Validation Error: ${errorMessages.join(', ')}`);
      },
    }),
  )
  async createComment(@Body() createDto: CreateCreditApplicationCommentDto) {
    try {
      // Generate unique ID for the comment
      const timestamp = Date.now();
      const random = Math.random().toString(36).substr(2, 8);
      const sheetId = `COM-${timestamp}-${random}`;

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

      const commentData = {
        ID: sheetId,
        sheetId: sheetId, // Add sheetId for database storage
        'Commenter Type': 'SSL Submitting Application',
        'Credit Application ID': createDto.creditApplicationId,
        Comments: createDto.comment || '',
        'Commenter Name': createDto.commentedBy || '',
        'Created At': createdAt,
      };

      // Create record in database
      const createdRecord =
        await this.creditApplicationCommentsDbService.create(commentData);

      // Trigger background sync - use the database ID
      this.triggerBackgroundSync(
        createdRecord.id,
        createDto.creditApplicationId,
        'create',
      );

      return {
        success: true,
        message: 'Comment added successfully',
        data: createdRecord,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error creating comment: ${apiError.message}`);
      throw error;
    }
  }

  private async triggerBackgroundSync(
    recordId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ): Promise<void> {
    setTimeout(async () => {
      try {
        await this.creditApplicationCommentsSyncService.syncCreditApplicationCommentById(
          recordId,
          operation,
        );
        this.logger.log(`Background sync completed for comment ${recordId}`);
      } catch (error) {
        this.logger.error(
          `Background sync failed for comment ${recordId}:`,
          error,
        );
      }
    }, 2000); // 2 second delay
  }

  @Get('by-application/:creditApplicationId')
  async getCommentsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching comments for credit application: ${creditApplicationId}`,
      );

      const comments =
        await this.creditApplicationCommentsDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      return {
        success: true,
        count: comments.length,
        data: comments,
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
      const comment =
        await this.creditApplicationCommentsDbService.findBySheetId(id);

      if (!comment) {
        return { success: false, message: 'Comment not found' };
      }

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
      const comments = await this.creditApplicationCommentsDbService.findAll();

      return {
        success: true,
        count: comments.length,
        data: comments,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching all comments: ${apiError.message}`);
      throw error;
    }
  }
}

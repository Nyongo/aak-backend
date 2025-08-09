import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateStudentBreakdownDto } from '../dto/create-student-breakdown.dto';
import { StudentBreakdownDbService } from '../services/student-breakdown-db.service';
import { StudentBreakdownSyncService } from '../services/student-breakdown-sync.service';
import { SheetsService } from '../services/sheets.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/student-breakdown')
export class StudentBreakdownController {
  private readonly logger = new Logger(StudentBreakdownController.name);

  constructor(
    private readonly studentBreakdownDbService: StudentBreakdownDbService,
    private readonly studentBreakdownSyncService: StudentBreakdownSyncService,
    private readonly sheetsService: SheetsService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createStudentBreakdown(@Body() createDto: CreateStudentBreakdownDto) {
    try {
      this.logger.log(
        `Creating new student breakdown for application: ${createDto.creditApplicationId}`,
      );

      if (!createDto.creditApplicationId) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      // Calculate total revenue
      const totalRevenue = createDto.numberOfStudents * createDto.fee;

      // Prepare student breakdown data for Postgres
      const studentBreakdownDataForDb = {
        sheetId: `SB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        creditApplicationId: createDto.creditApplicationId,
        feeType: createDto.feeType,
        term: createDto.term,
        grade: createDto.grade,
        numberOfStudents: createDto.numberOfStudents,
        fee: createDto.fee,
        totalRevenue: totalRevenue,
        synced: false,
        createdAt: new Date().toISOString(),
      };

      const result = await this.studentBreakdownDbService.create(
        studentBreakdownDataForDb,
      );
      this.logger.log(`Student breakdown added successfully via Postgres`);

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'create',
      );

      return {
        success: true,
        data: result,
        message: 'Student breakdown added successfully',
        sync: {
          triggered: true,
          status: 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `========Failed to add student breakdown: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for student breakdown
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for student breakdown ${dbId} (${operation})`,
      );
      await this.studentBreakdownSyncService.syncStudentBreakdownById(
        dbId,
        operation,
      );
      this.logger.log(
        `Background sync triggered successfully for student breakdown ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for student breakdown ${dbId}: ${error}`,
      );
    }
  }

  @Get('by-application/:creditApplicationId')
  async getBreakdownsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.debug(
        `Fetching student breakdowns for application ID: ${creditApplicationId}`,
      );

      const studentBreakdowns =
        await this.studentBreakdownDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const studentBreakdownsWithOriginalKeys = studentBreakdowns.map(
        (breakdown) => {
          const convertedBreakdown = {
            ID: breakdown.sheetId || '',
            'Credit Application': breakdown.creditApplicationId || '',
            'Fee Type': breakdown.feeType || '',
            'Term ID': breakdown.term || '',
            Grade: breakdown.grade || '',
            'Number of Students': breakdown.numberOfStudents?.toString() || '',
            Fee: breakdown.fee?.toString() || '',
            'Total Revenue': breakdown.totalRevenue?.toString() || '',
            'Created At': breakdown.createdAt?.toISOString() || '',
            Synced: breakdown.synced || false,
          };
          return convertedBreakdown;
        },
      );

      this.logger.debug(
        `Found ${studentBreakdownsWithOriginalKeys.length} matching student breakdowns`,
      );

      return {
        success: true,
        count: studentBreakdownsWithOriginalKeys.length,
        data: studentBreakdownsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching student breakdowns for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getBreakdownById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching student breakdown with ID: ${id}`);
      const studentBreakdown =
        await this.studentBreakdownDbService.findById(id);

      if (!studentBreakdown) {
        return { success: false, message: 'Student breakdown not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const studentBreakdownWithOriginalKeys = {
        ID: studentBreakdown.sheetId || '',
        'Credit Application': studentBreakdown.creditApplicationId || '',
        'Fee Type': studentBreakdown.feeType || '',
        'Term ID': studentBreakdown.term || '',
        Grade: studentBreakdown.grade || '',
        'Number of Students':
          studentBreakdown.numberOfStudents?.toString() || '',
        Fee: studentBreakdown.fee?.toString() || '',
        'Total Revenue': studentBreakdown.totalRevenue?.toString() || '',
        'Created At': studentBreakdown.createdAt?.toISOString() || '',
        Synced: studentBreakdown.synced || false,
      };

      return { success: true, data: studentBreakdownWithOriginalKeys };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching student breakdown ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllBreakdowns() {
    try {
      this.logger.debug('Fetching all student breakdowns');

      const studentBreakdowns = await this.studentBreakdownDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const studentBreakdownsWithOriginalKeys = studentBreakdowns.map(
        (breakdown) => {
          const convertedBreakdown = {
            ID: breakdown.sheetId || '',
            'Credit Application': breakdown.creditApplicationId || '',
            'Fee Type': breakdown.feeType || '',
            'Term ID': breakdown.term || '',
            Grade: breakdown.grade || '',
            'Number of Students': breakdown.numberOfStudents?.toString() || '',
            Fee: breakdown.fee?.toString() || '',
            'Total Revenue': breakdown.totalRevenue?.toString() || '',
            'Created At': breakdown.createdAt?.toISOString() || '',
            Synced: breakdown.synced || false,
          };
          return convertedBreakdown;
        },
      );

      return {
        success: true,
        count: studentBreakdownsWithOriginalKeys.length,
        data: studentBreakdownsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all student breakdowns: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateStudentBreakdown(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateStudentBreakdownDto>,
  ) {
    try {
      this.logger.log(`Updating student breakdown with ID: ${id}`);

      // Find the existing student breakdown by sheetId (since the id parameter is the sheetId)
      const existingStudentBreakdown =
        await this.studentBreakdownDbService.findBySheetId(id);
      if (!existingStudentBreakdown) {
        return { success: false, error: 'Student breakdown not found' };
      }

      this.logger.log(
        `Updating student breakdown with sheetId: ${id}, database ID: ${existingStudentBreakdown.id}`,
      );

      // Calculate total revenue if numberOfStudents or fee is being updated
      let totalRevenue = existingStudentBreakdown.totalRevenue;
      if (
        updateDto.numberOfStudents !== undefined ||
        updateDto.fee !== undefined
      ) {
        const students =
          updateDto.numberOfStudents !== undefined
            ? updateDto.numberOfStudents
            : existingStudentBreakdown.numberOfStudents;
        const fee =
          updateDto.fee !== undefined
            ? updateDto.fee
            : existingStudentBreakdown.fee;
        totalRevenue = students * fee;
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateDto.creditApplicationId ||
          existingStudentBreakdown.creditApplicationId,
        feeType: updateDto.feeType || existingStudentBreakdown.feeType,
        term: updateDto.term || existingStudentBreakdown.term,
        grade: updateDto.grade || existingStudentBreakdown.grade,
        numberOfStudents:
          updateDto.numberOfStudents !== undefined
            ? updateDto.numberOfStudents
            : existingStudentBreakdown.numberOfStudents,
        fee:
          updateDto.fee !== undefined
            ? updateDto.fee
            : existingStudentBreakdown.fee,
        totalRevenue: totalRevenue,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.studentBreakdownDbService.update(
        id,
        updateDataForDb,
      );
      this.logger.log(`Student breakdown updated successfully via Postgres`);

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'update',
      );

      return {
        success: true,
        data: result,
        message: 'Student breakdown updated successfully',
        sync: {
          triggered: true,
          status: 'immediate',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to update student breakdown: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  // Sync endpoints
  @Post('sync/:id')
  async syncStudentBreakdownById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for student breakdown: ${id}`);
      const result =
        await this.studentBreakdownSyncService.syncStudentBreakdownById(
          parseInt(id),
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync student breakdown ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllStudentBreakdowns() {
    try {
      this.logger.log('Manual sync requested for all student breakdowns');
      const result = await this.studentBreakdownSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all student breakdowns: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncStudentBreakdownsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for student breakdowns by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.studentBreakdownSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync student breakdowns for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}

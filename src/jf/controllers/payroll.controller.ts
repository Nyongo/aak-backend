import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreatePayrollDto } from '../dto/create-payroll.dto';
import { PayrollDbService } from '../services/payroll-db.service';
import { PayrollSyncService } from '../services/payroll-sync.service';
import { SheetsService } from '../services/sheets.service';
import * as moment from 'moment';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/payroll')
export class PayrollController {
  private readonly logger = new Logger(PayrollController.name);

  constructor(
    private readonly payrollDbService: PayrollDbService,
    private readonly payrollSyncService: PayrollSyncService,
    private readonly sheetsService: SheetsService,
  ) {}

  @Get('by-application/:creditApplicationId')
  async getPayrollByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching payroll records for credit application: ${creditApplicationId}`,
      );
      const payrollRecords =
        await this.payrollDbService.findByCreditApplicationId(
          creditApplicationId,
        );

      // Convert database records to original sheet format for frontend compatibility
      const payrollRecordsWithOriginalKeys = payrollRecords.map((payroll) => {
        const convertedPayroll = {
          ID: payroll.sheetId || '',
          'Credit Application ID': payroll.creditApplicationId || '',
          Role: payroll.role || '',
          'Number of Employees in Role':
            payroll.numberOfEmployeesInRole?.toString() || '',
          'Monthly Salary': payroll.monthlySalary?.toString() || '',
          'Months per Year the Role is Paid':
            payroll.monthsPerYearTheRoleIsPaid?.toString() || '',
          Notes: payroll.notes || '',
          'Total Annual Cost': payroll.totalAnnualCost?.toString() || '',
          'Created At': payroll.createdAt?.toISOString() || '',
          Synced: payroll.synced || false,
        };
        return convertedPayroll;
      });

      return {
        success: true,
        count: payrollRecordsWithOriginalKeys.length,
        data: payrollRecordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching payroll records for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addPayrollRecord(@Body() createDto: CreatePayrollDto) {
    try {
      this.logger.log(
        `Adding new payroll record for application: ${createDto['Credit Application ID']}`,
      );

      if (!createDto['Credit Application ID']) {
        return {
          success: false,
          error: 'Credit Application ID is required',
        };
      }

      const now = moment.utc().format('DD/MM/YYYY HH:mm:ss');

      // Calculate total annual cost
      const totalAnnualCost =
        createDto['Number of Employees in Role'] *
        createDto['Monthly Salary'] *
        createDto['Months per Year the Role is Paid'];

      // Prepare payroll data for Postgres
      const payrollDataForDb = {
        sheetId: `PR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, // Generate temporary sheetId
        creditApplicationId: createDto['Credit Application ID'],
        role: createDto['Role'],
        numberOfEmployeesInRole: createDto['Number of Employees in Role'],
        monthlySalary: createDto['Monthly Salary'],
        monthsPerYearTheRoleIsPaid:
          createDto['Months per Year the Role is Paid'],
        notes: createDto['Notes'] || '',
        totalAnnualCost: totalAnnualCost,
        synced: false,
        createdAt: new Date(now),
      };

      const result = await this.payrollDbService.create(payrollDataForDb);
      this.logger.log(`Payroll record added successfully via Postgres`);

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'create',
      );

      return {
        success: true,
        data: result,
        message: 'Payroll record added successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to add payroll record: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  /**
   * Trigger background sync for payroll record
   */
  private async triggerBackgroundSync(
    dbId: number,
    creditApplicationId: string,
    operation: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for payroll record ${dbId} (${operation})`,
      );
      await this.payrollSyncService.syncPayrollById(dbId);
      this.logger.log(
        `Background sync triggered successfully for payroll record ${dbId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger background sync for payroll record ${dbId}: ${error}`,
      );
    }
  }

  @Get('total-monthly-cost/:creditApplicationId')
  async getTotalMonthlyCost(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Calculating total monthly cost for credit application: ${creditApplicationId}`,
      );

      const result =
        await this.payrollDbService.calculateTotalMonthlyCost(
          creditApplicationId,
        );

      return {
        success: true,
        totalMonthlyCost: result.totalMonthlyCost,
        annualCost: result.annualCost,
        data: result.data,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error calculating total monthly cost for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get()
  async getAllPayrollRecords() {
    try {
      this.logger.log('Fetching all payroll records');
      const payrollRecords = await this.payrollDbService.findAll();

      // Convert database records to original sheet format for frontend compatibility
      const payrollRecordsWithOriginalKeys = payrollRecords.map((payroll) => {
        const convertedPayroll = {
          ID: payroll.sheetId || '',
          'Credit Application ID': payroll.creditApplicationId || '',
          Role: payroll.role || '',
          'Number of Employees in Role':
            payroll.numberOfEmployeesInRole?.toString() || '',
          'Monthly Salary': payroll.monthlySalary?.toString() || '',
          'Months per Year the Role is Paid':
            payroll.monthsPerYearTheRoleIsPaid?.toString() || '',
          Notes: payroll.notes || '',
          'Total Annual Cost': payroll.totalAnnualCost?.toString() || '',
          'Created At': payroll.createdAt?.toISOString() || '',
          Synced: payroll.synced || false,
        };
        return convertedPayroll;
      });

      return {
        success: true,
        count: payrollRecordsWithOriginalKeys.length,
        data: payrollRecordsWithOriginalKeys,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching all payroll records: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getPayrollRecordById(@Param('id') id: string) {
    try {
      this.logger.log(`Fetching payroll record with ID: ${id}`);
      const payroll = await this.payrollDbService.findById(id);

      if (!payroll) {
        return { success: false, message: 'Payroll record not found' };
      }

      // Convert database record to original sheet format for frontend compatibility
      const payrollWithOriginalKeys = {
        ID: payroll.sheetId || '',
        'Credit Application ID': payroll.creditApplicationId || '',
        Role: payroll.role || '',
        'Number of Employees in Role':
          payroll.numberOfEmployeesInRole?.toString() || '',
        'Monthly Salary': payroll.monthlySalary?.toString() || '',
        'Months per Year the Role is Paid':
          payroll.monthsPerYearTheRoleIsPaid?.toString() || '',
        Notes: payroll.notes || '',
        'Total Annual Cost': payroll.totalAnnualCost?.toString() || '',
        'Created At': payroll.createdAt?.toISOString() || '',
        Synced: payroll.synced || false,
      };

      return { success: true, data: payrollWithOriginalKeys };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching payroll record ${id}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Post('sync/:id')
  async syncPayrollRecordById(@Param('id') id: string) {
    try {
      this.logger.log(`Manual sync requested for payroll record: ${id}`);
      const result = await this.payrollSyncService.syncPayrollById(
        parseInt(id),
      );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync payroll record ${id}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-all')
  async syncAllPayrollRecords() {
    try {
      this.logger.log('Manual sync requested for all payroll records');
      const result = await this.payrollSyncService.syncAllToSheets();
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync all payroll records: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post('sync-by-application/:creditApplicationId')
  async syncPayrollRecordsByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Manual sync requested for payroll records by credit application: ${creditApplicationId}`,
      );
      const result =
        await this.payrollSyncService.syncByCreditApplicationId(
          creditApplicationId,
        );
      return result;
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(
        `Failed to sync payroll records for credit application ${creditApplicationId}: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePayrollRecord(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePayrollDto>,
  ) {
    try {
      this.logger.log(`Updating payroll record with ID: ${id}`);

      // Find the existing payroll record by sheetId (since the id parameter is the sheetId)
      const existingPayroll = await this.payrollDbService.findBySheetId(id);
      if (!existingPayroll) {
        return { success: false, error: 'Payroll record not found' };
      }

      this.logger.log(
        `Updating payroll record with sheetId: ${id}, database ID: ${existingPayroll.id}`,
      );

      // Calculate total annual cost if any of the relevant fields are updated
      let totalAnnualCost = existingPayroll.totalAnnualCost;
      if (
        updateData['Number of Employees in Role'] !== undefined ||
        updateData['Monthly Salary'] !== undefined ||
        updateData['Months per Year the Role is Paid'] !== undefined
      ) {
        const employees =
          Number(
            updateData['Number of Employees in Role'] ||
              existingPayroll.numberOfEmployeesInRole,
          ) || 0;
        const salary =
          Number(
            updateData['Monthly Salary'] || existingPayroll.monthlySalary,
          ) || 0;
        const months =
          Number(
            updateData['Months per Year the Role is Paid'] ||
              existingPayroll.monthsPerYearTheRoleIsPaid,
          ) || 12;
        totalAnnualCost = employees * salary * months;
      }

      // Prepare update data
      const updateDataForDb = {
        creditApplicationId:
          updateData['Credit Application ID'] ||
          existingPayroll.creditApplicationId,
        role: updateData['Role'] || existingPayroll.role,
        numberOfEmployeesInRole:
          updateData['Number of Employees in Role'] ||
          existingPayroll.numberOfEmployeesInRole,
        monthlySalary:
          updateData['Monthly Salary'] || existingPayroll.monthlySalary,
        monthsPerYearTheRoleIsPaid:
          updateData['Months per Year the Role is Paid'] ||
          existingPayroll.monthsPerYearTheRoleIsPaid,
        notes: updateData['Notes'] || existingPayroll.notes,
        totalAnnualCost: totalAnnualCost,
        synced: false, // Mark as unsynced to trigger sync
      };

      const result = await this.payrollDbService.update(id, updateDataForDb);
      this.logger.log(`Payroll record updated successfully via Postgres`);

      // Trigger background sync
      this.triggerBackgroundSync(
        result.id,
        result.creditApplicationId,
        'update',
      );

      return {
        success: true,
        data: result,
        message: 'Payroll record updated successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error: unknown) {
      const apiError = error as any;
      this.logger.error(`Failed to update payroll record: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}

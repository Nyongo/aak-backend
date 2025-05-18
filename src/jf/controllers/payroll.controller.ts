import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
  Put,
} from '@nestjs/common';
import { CreatePayrollDto } from '../dto/create-payroll.dto';
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
  private readonly SHEET_NAME = 'Payroll';

  constructor(private readonly sheetsService: SheetsService) {}

  @Get('by-application/:creditApplicationId')
  async getPayrollByApplication(
    @Param('creditApplicationId') creditApplicationId: string,
  ) {
    try {
      this.logger.log(
        `Fetching payroll records for credit application: ${creditApplicationId}`,
      );
      const payrollRecords = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );

      if (!payrollRecords || payrollRecords.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = payrollRecords[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');

      if (applicationIdIndex === -1) {
        throw new Error('Credit Application ID column not found in sheet');
      }

      const filteredData = payrollRecords
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const payroll = {};
          headers.forEach((header, index) => {
            payroll[header] = row[index];
          });
          return payroll;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
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
  async addPayrollRecord(@Body() createDto: CreatePayrollDto) {
    try {
      this.logger.log(
        `Adding new payroll record for application: ${createDto['Credit Application ID']}`,
      );

      const id = `PR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const now = moment.utc().format('DD/MM/YYYY HH:mm:ss');

      const rowData = {
        ID: id,
        'Credit Application ID': createDto['School ID'],
        Role: createDto['Role'],
        'Number of Employees in Role': createDto['Number of Employees in Role'],
        'Monthly Salary': createDto['Monthly Salary'],
        'Months per Year the Role is Paid':
          createDto['Months per Year the Role is Paid'],
        Notes: createDto['Notes'] || '',
        'Created At': now,
        'Total Annual Cost':
          createDto['Number of Employees in Role'] *
          createDto['Monthly Salary'] *
          createDto['Months per Year the Role is Paid'],
      };

      await this.sheetsService.appendRow(this.SHEET_NAME, rowData);

      return {
        success: true,
        message: 'Payroll record added successfully',
        data: rowData,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error adding payroll record: ${apiError.message}`);
      throw error;
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
      const payrollRecords = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );

      if (!payrollRecords || payrollRecords.length === 0) {
        return {
          success: true,
          totalMonthlyCost: 0,
          annualCost: 0,
        };
      }

      const headers = payrollRecords[0];
      const applicationIdIndex = headers.indexOf('Credit Application ID');
      const employeesIndex = headers.indexOf('Number of Employees in Role');
      const salaryIndex = headers.indexOf('Monthly Salary');
      const monthsIndex = headers.indexOf('Months per Year the Role is Paid');

      if (
        applicationIdIndex === -1 ||
        employeesIndex === -1 ||
        salaryIndex === -1 ||
        monthsIndex === -1
      ) {
        throw new Error('Required columns not found in sheet');
      }

      const records = payrollRecords
        .slice(1)
        .filter((row) => row[applicationIdIndex] === creditApplicationId);

      const totalMonthlyCost = records.reduce((total, row) => {
        const employees = Number(row[employeesIndex]) || 0;
        const salary = Number(row[salaryIndex]) || 0;
        return total + employees * salary;
      }, 0);

      const annualCost = records.reduce((total, row) => {
        const employees = Number(row[employeesIndex]) || 0;
        const salary = Number(row[salaryIndex]) || 0;
        const months = Number(row[monthsIndex]) || 12;
        return total + employees * salary * months;
      }, 0);

      return {
        success: true,
        totalMonthlyCost,
        annualCost,
        data: records.map((row) => ({
          role: row[headers.indexOf('Role')],
          employees: row[employeesIndex],
          monthlySalary: row[salaryIndex],
          monthsPerYear: row[monthsIndex],
          monthlyCost: Number(row[employeesIndex]) * Number(row[salaryIndex]),
          annualCost:
            Number(row[employeesIndex]) *
            Number(row[salaryIndex]) *
            Number(row[monthsIndex]),
        })),
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error calculating total monthly cost for application ${creditApplicationId}: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Put(':id')
  async updatePayrollRecord(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePayrollDto>,
  ) {
    try {
      this.logger.log(`Updating payroll record with ID: ${id}`);

      // First verify the payroll record exists
      const payrollRecords = await this.sheetsService.getSheetData(
        this.SHEET_NAME,
      );
      if (!payrollRecords || payrollRecords.length === 0) {
        return { success: false, message: 'No payroll records found' };
      }

      const headers = payrollRecords[0];
      const idIndex = headers.indexOf('ID');
      const payrollRow = payrollRecords.find((row) => row[idIndex] === id);

      if (!payrollRow) {
        return { success: false, message: 'Payroll record not found' };
      }

      // Create updated row data, only updating fields that are provided
      const updatedRowData = headers.map((header, index) => {
        if (updateData[header] !== undefined) {
          return updateData[header];
        }
        return payrollRow[index] || '';
      });

      // Recalculate total annual cost if any of the relevant fields are updated
      const employeesIndex = headers.indexOf('Number of Employees in Role');
      const salaryIndex = headers.indexOf('Monthly Salary');
      const monthsIndex = headers.indexOf('Months per Year the Role is Paid');
      const totalCostIndex = headers.indexOf('Total Annual Cost');

      if (
        updateData['Number of Employees in Role'] !== undefined ||
        updateData['Monthly Salary'] !== undefined ||
        updateData['Months per Year the Role is Paid'] !== undefined
      ) {
        const employees =
          Number(
            updateData['Number of Employees in Role'] ||
              payrollRow[employeesIndex],
          ) || 0;
        const salary =
          Number(updateData['Monthly Salary'] || payrollRow[salaryIndex]) || 0;
        const months =
          Number(
            updateData['Months per Year the Role is Paid'] ||
              payrollRow[monthsIndex],
          ) || 12;
        updatedRowData[totalCostIndex] = employees * salary * months;
      }

      // Update the row
      await this.sheetsService.updateRow(this.SHEET_NAME, id, updatedRowData);

      // Get the updated payroll record
      const updatedPayroll = {};
      headers.forEach((header, index) => {
        updatedPayroll[header] = updatedRowData[index];
      });

      return {
        success: true,
        message: 'Payroll record updated successfully',
        data: updatedPayroll,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error updating payroll record: ${apiError.message}`);
      throw error;
    }
  }
}

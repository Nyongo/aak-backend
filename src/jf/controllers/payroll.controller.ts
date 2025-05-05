import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
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
        'Credit Application ID': createDto['Credit Application ID'],
        Role: createDto['Role'],
        'Number of Employees in Role': createDto['Number of Employees in Role'],
        'Monthly Salary': createDto['Monthly Salary'],
        'Months per Year the Role is Paid':
          createDto['Months per Year the Role is Paid'],
        Notes: createDto['Notes'] || '',
        'Created At': now,
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
}

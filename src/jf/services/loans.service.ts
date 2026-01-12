import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { UpdateLoanDto } from '../dto/update-loan.dto';
import { LoanFilters } from '../interfaces/loan-filters.interface';

@Injectable()
export class LoansService {
  private readonly logger = new Logger(LoansService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createLoanDto: CreateLoanDto) {
      // Clean the data to ensure types match Prisma schema
      // Declare outside try block so it's accessible in catch block for error logging
    let data: any = {};
    
    try {
      // Initialize data object
      data = {};
      
      // Define numeric and integer field lists for type checking
      const floatFields = ['principalAmount', 'outstandingPrincipalBalance', 'outstandingInterestBalance'];
      const intFields = ['numberOfMonths', 'daysLate', 'hasFemaleDirector'];
      
      // Copy all fields and convert types as needed
      for (const [key, value] of Object.entries(createLoanDto)) {
        if (value === undefined) {
          // Skip undefined values - Prisma doesn't like undefined
          continue;
        }
        
        // Handle numeric fields (Float)
        if (floatFields.includes(key)) {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else if (typeof value === 'string') {
            // Clean string: remove currency symbols, commas, spaces, etc.
            const cleaned = String(value).replace(/[^0-9.-]/g, '').trim();
            if (cleaned === '' || cleaned === '-') {
              data[key] = null;
            } else {
              const parsed = parseFloat(cleaned);
              data[key] = isNaN(parsed) || !isFinite(parsed) ? null : parsed;
            }
          } else if (typeof value === 'number') {
            data[key] = isNaN(value) || !isFinite(value) ? null : value;
          } else {
            // Invalid type - set to null
            data[key] = null;
          }
        }
        // Handle integer fields (Int)
        else if (intFields.includes(key)) {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else if (typeof value === 'string') {
            // Clean string: remove non-numeric characters except minus
            const cleaned = String(value).replace(/[^0-9-]/g, '').trim();
            if (cleaned === '' || cleaned === '-') {
              data[key] = null;
            } else {
              const parsed = parseInt(cleaned, 10);
              data[key] = isNaN(parsed) || !isFinite(parsed) ? null : parsed;
            }
          } else if (typeof value === 'number') {
            const intValue = Number.isInteger(value) ? value : Math.floor(value);
            data[key] = isNaN(intValue) || !isFinite(intValue) ? null : intValue;
          } else if (typeof value === 'boolean') {
            // Convert boolean to int (0 or 1)
            data[key] = value ? 1 : 0;
          } else {
            // Invalid type - set to null
            data[key] = null;
          }
        }
        // Handle all other fields (strings, etc.)
        else {
          // Convert to string or null
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else {
            // Ensure string fields are actually strings
            data[key] = String(value);
          }
        }
      }

      // Log the cleaned data for debugging (first few fields only)
      const sampleData = Object.keys(data).slice(0, 10).reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {} as any);
      this.logger.debug(`Creating loan with cleaned data (sample):`, sampleData);

      // Final validation: Ensure numeric and integer fields are correct types
      // This is a safety check to catch any remaining type issues
      if (data.principalAmount !== null && data.principalAmount !== undefined) {
        data.principalAmount = typeof data.principalAmount === 'number' ? data.principalAmount : null;
      }
      if (data.outstandingPrincipalBalance !== null && data.outstandingPrincipalBalance !== undefined) {
        data.outstandingPrincipalBalance = typeof data.outstandingPrincipalBalance === 'number' ? data.outstandingPrincipalBalance : null;
      }
      if (data.outstandingInterestBalance !== null && data.outstandingInterestBalance !== undefined) {
        data.outstandingInterestBalance = typeof data.outstandingInterestBalance === 'number' ? data.outstandingInterestBalance : null;
      }
      if (data.numberOfMonths !== null && data.numberOfMonths !== undefined) {
        data.numberOfMonths = typeof data.numberOfMonths === 'number' && Number.isInteger(data.numberOfMonths) ? data.numberOfMonths : null;
      }
      if (data.daysLate !== null && data.daysLate !== undefined) {
        data.daysLate = typeof data.daysLate === 'number' && Number.isInteger(data.daysLate) ? data.daysLate : null;
      }
      if (data.hasFemaleDirector !== null && data.hasFemaleDirector !== undefined) {
        data.hasFemaleDirector = typeof data.hasFemaleDirector === 'number' && Number.isInteger(data.hasFemaleDirector) ? data.hasFemaleDirector : null;
      }

      // Log all numeric fields specifically to catch type issues
      const numericFields = {
        principalAmount: { value: data.principalAmount, type: typeof data.principalAmount, isNumber: typeof data.principalAmount === 'number' },
        outstandingPrincipalBalance: { value: data.outstandingPrincipalBalance, type: typeof data.outstandingPrincipalBalance, isNumber: typeof data.outstandingPrincipalBalance === 'number' },
        outstandingInterestBalance: { value: data.outstandingInterestBalance, type: typeof data.outstandingInterestBalance, isNumber: typeof data.outstandingInterestBalance === 'number' },
        numberOfMonths: { value: data.numberOfMonths, type: typeof data.numberOfMonths, isInteger: typeof data.numberOfMonths === 'number' && Number.isInteger(data.numberOfMonths) },
        daysLate: { value: data.daysLate, type: typeof data.daysLate, isInteger: typeof data.daysLate === 'number' && Number.isInteger(data.daysLate) },
        hasFemaleDirector: { value: data.hasFemaleDirector, type: typeof data.hasFemaleDirector, isInteger: typeof data.hasFemaleDirector === 'number' && Number.isInteger(data.hasFemaleDirector) },
      };
      this.logger.debug(`Numeric fields check (after final validation):`, JSON.stringify(numericFields, null, 2));

      // Remove any undefined values one more time (safety check)
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      const result = await this.prisma.loan.create({
        data,
      });
      this.logger.log(`Created loan with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating loan:`, error);
      
      // Log the cleaned data that was sent to Prisma (if data was populated)
      if (data && Object.keys(data).length > 0) {
        this.logger.error(`Cleaned data sent to Prisma (first 60 fields):`, 
          JSON.stringify(
            Object.keys(data).slice(0, 60).reduce((obj, key) => {
              obj[key] = {
                value: data[key],
                type: typeof data[key],
                isNull: data[key] === null,
                isUndefined: data[key] === undefined
              };
              return obj;
            }, {} as any),
            null,
            2
          )
        );
        
        // Count fields to help identify parameter 57
        const fieldCount = Object.keys(data).length;
        this.logger.error(`Total fields being sent to Prisma: ${fieldCount}`);
        if (fieldCount > 56) {
          this.logger.error(`Parameter 57 would be field at index 56 (0-based): ${Object.keys(data)[56]} = ${data[Object.keys(data)[56]]}`);
        }
      } else {
        this.logger.error(`Data was not populated when error occurred. Original DTO (first 20 fields):`, 
          JSON.stringify(
            Object.keys(createLoanDto).slice(0, 20).reduce((obj, key) => {
              obj[key] = {
                value: (createLoanDto as any)[key],
                type: typeof (createLoanDto as any)[key]
              };
              return obj;
            }, {} as any),
            null,
            2
          )
        );
      }
      
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.loan.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching all loans:', error);
      throw error;
    }
  }

  async findAllWithFilters(filters: LoanFilters) {
    try {
      const where: any = {};

      // Apply filters
      if (filters.borrowerId) {
        where.borrowerId = filters.borrowerId;
      }

      if (filters.sslId) {
        where.sslId = filters.sslId;
      }

      if (filters.status) {
        where.loanStatus = filters.status;
      }

      if (filters.riskCategory) {
        where.loanRiskCategory = filters.riskCategory;
      }

      if (filters.region) {
        where.region = filters.region;
      }

      if (filters.loanType) {
        where.loanType = filters.loanType;
      }

      if (filters.par) {
        let parField: string;
        switch (filters.par) {
          case 14:
            parField = 'par14';
            break;
          case 30:
            parField = 'par30';
            break;
          case 60:
            parField = 'par60';
            break;
          case 90:
            parField = 'par90';
            break;
          case 120:
            parField = 'par120';
            break;
          default:
            throw new Error(`Invalid PAR days: ${filters.par}`);
        }
        where[parField] = 'TRUE';
      }

      if (filters.overdue !== undefined) {
        where.loanOverdue = filters.overdue ? 'TRUE' : 'FALSE';
      }

      if (filters.fullyPaid !== undefined) {
        where.loanFullyPaid = filters.fullyPaid ? 'TRUE' : 'FALSE';
      }

      if (filters.restructured !== undefined) {
        where.restructured = filters.restructured ? 'TRUE' : 'FALSE';
      }

      if (filters.referral !== undefined) {
        where.referral = filters.referral ? 'TRUE' : 'FALSE';
      }

      if (filters.catalyzeEligible !== undefined) {
        where.loanQualifiesForCatalyzeProgram = filters.catalyzeEligible
          ? 'TRUE'
          : 'FALSE';
      }

      if (filters.highRisk) {
        where.OR = [
          { loanRiskCategory: 'Red' },
          { loanRiskCategory: 'Orange' },
          { loanOverdue: 'TRUE' },
        ];
      }

      const loans = await this.prisma.loan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return {
        data: loans,
        total: loans.length,
        filters: Object.keys(filters).filter(
          (key) => filters[key] !== undefined,
        ),
      };
    } catch (error) {
      this.logger.error('Error fetching loans with filters:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const loan = await this.prisma.loan.findUnique({
        where: { id },
      });

      if (!loan) {
        throw new NotFoundException(`Loan with ID ${id} not found`);
      }

      return loan;
    } catch (error) {
      this.logger.error(`Error fetching loan with ID ${id}:`, error);
      throw error;
    }
  }

  async update(id: number, updateLoanDto: UpdateLoanDto) {
    try {
      // Clean the data to ensure types match Prisma schema
      const data: any = { ...updateLoanDto };
      
      // Convert numeric fields if they exist in the update
      if (data.principalAmount !== undefined && data.principalAmount !== null) {
        data.principalAmount = typeof data.principalAmount === 'string' 
          ? parseFloat(data.principalAmount) || null 
          : data.principalAmount;
      }
      
      if (data.outstandingPrincipalBalance !== undefined && data.outstandingPrincipalBalance !== null) {
        data.outstandingPrincipalBalance = typeof data.outstandingPrincipalBalance === 'string'
          ? parseFloat(data.outstandingPrincipalBalance) || null
          : data.outstandingPrincipalBalance;
      }
      
      if (data.outstandingInterestBalance !== undefined && data.outstandingInterestBalance !== null) {
        data.outstandingInterestBalance = typeof data.outstandingInterestBalance === 'string'
          ? parseFloat(data.outstandingInterestBalance) || null
          : data.outstandingInterestBalance;
      }
      
      // Convert integer fields if they exist in the update
      if (data.numberOfMonths !== undefined && data.numberOfMonths !== null) {
        data.numberOfMonths = typeof data.numberOfMonths === 'string'
          ? parseInt(data.numberOfMonths, 10) || null
          : data.numberOfMonths;
      }
      
      if (data.daysLate !== undefined && data.daysLate !== null) {
        data.daysLate = typeof data.daysLate === 'string'
          ? parseInt(data.daysLate, 10) || null
          : data.daysLate;
      }
      
      if (data.hasFemaleDirector !== undefined && data.hasFemaleDirector !== null) {
        data.hasFemaleDirector = typeof data.hasFemaleDirector === 'string'
          ? parseInt(data.hasFemaleDirector, 10) || null
          : data.hasFemaleDirector;
      }
      
      // Remove undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      const result = await this.prisma.loan.update({
        where: { id },
        data,
      });
      this.logger.log(`Updated loan with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error updating loan with ID ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const result = await this.prisma.loan.delete({
        where: { id },
      });
      this.logger.log(`Deleted loan with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error deleting loan with ID ${id}:`, error);
      throw error;
    }
  }

  // Specialized query methods
  async findOverdueLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: { loanOverdue: 'TRUE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching overdue loans:', error);
      throw error;
    }
  }

  async findActiveLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: { loanFullyPaid: 'FALSE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching active loans:', error);
      throw error;
    }
  }

  async findFullyPaidLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: { loanFullyPaid: 'TRUE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching fully paid loans:', error);
      throw error;
    }
  }

  async findByBorrowerId(borrowerId: string) {
    try {
      return await this.prisma.loan.findMany({
        where: { borrowerId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching loans for borrower ${borrowerId}:`,
        error,
      );
      throw error;
    }
  }

  async findBySslId(sslId: string) {
    try {
      return await this.prisma.loan.findMany({
        where: { sslId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching loans for SSL ID ${sslId}:`, error);
      throw error;
    }
  }

  async findByStatus(status: string) {
    try {
      return await this.prisma.loan.findMany({
        where: { loanStatus: status },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching loans with status ${status}:`, error);
      throw error;
    }
  }

  async findByRiskCategory(category: string) {
    try {
      return await this.prisma.loan.findMany({
        where: { loanRiskCategory: category },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching loans with risk category ${category}:`,
        error,
      );
      throw error;
    }
  }

  async findByRegion(region: string) {
    try {
      return await this.prisma.loan.findMany({
        where: { region },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching loans in region ${region}:`, error);
      throw error;
    }
  }

  async findByLoanType(type: string) {
    try {
      return await this.prisma.loan.findMany({
        where: { loanType: type },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching loans of type ${type}:`, error);
      throw error;
    }
  }

  async findParLoans(days: number) {
    try {
      let parField: string;
      switch (days) {
        case 14:
          parField = 'par14';
          break;
        case 30:
          parField = 'par30';
          break;
        case 60:
          parField = 'par60';
          break;
        case 90:
          parField = 'par90';
          break;
        case 120:
          parField = 'par120';
          break;
        default:
          throw new Error(`Invalid PAR days: ${days}`);
      }

      return await this.prisma.loan.findMany({
        where: { [parField]: 'TRUE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching PAR ${days} loans:`, error);
      throw error;
    }
  }

  async findHighRiskLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: {
          OR: [
            { loanRiskCategory: 'Red' },
            { loanRiskCategory: 'Orange' },
            { loanOverdue: 'TRUE' },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching high risk loans:', error);
      throw error;
    }
  }

  async findRestructuredLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: { restructured: 'TRUE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching restructured loans:', error);
      throw error;
    }
  }

  async findReferralLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: { referral: 'TRUE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching referral loans:', error);
      throw error;
    }
  }

  async findCatalyzeEligibleLoans() {
    try {
      return await this.prisma.loan.findMany({
        where: { loanQualifiesForCatalyzeProgram: 'TRUE' },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching catalyze eligible loans:', error);
      throw error;
    }
  }

  async getLoansSummary() {
    try {
      const [
        totalLoans,
        activeLoans,
        overdueLoans,
        fullyPaidLoans,
        highRiskLoans,
        restructuredLoans,
      ] = await Promise.all([
        this.prisma.loan.count(),
        this.prisma.loan.count({ where: { loanFullyPaid: 'FALSE' } }),
        this.prisma.loan.count({ where: { loanOverdue: 'TRUE' } }),
        this.prisma.loan.count({ where: { loanFullyPaid: 'TRUE' } }),
        this.prisma.loan.count({
          where: {
            OR: [{ loanRiskCategory: 'Red' }, { loanRiskCategory: 'Orange' }],
          },
        }),
        this.prisma.loan.count({ where: { restructured: 'TRUE' } }),
      ]);

      return {
        totalLoans,
        activeLoans,
        overdueLoans,
        fullyPaidLoans,
        highRiskLoans,
        restructuredLoans,
        summary: {
          activePercentage:
            totalLoans > 0
              ? ((activeLoans / totalLoans) * 100).toFixed(2)
              : '0',
          overduePercentage:
            totalLoans > 0
              ? ((overdueLoans / totalLoans) * 100).toFixed(2)
              : '0',
          fullyPaidPercentage:
            totalLoans > 0
              ? ((fullyPaidLoans / totalLoans) * 100).toFixed(2)
              : '0',
          highRiskPercentage:
            totalLoans > 0
              ? ((highRiskLoans / totalLoans) * 100).toFixed(2)
              : '0',
        },
      };
    } catch (error) {
      this.logger.error('Error fetching loans summary:', error);
      throw error;
    }
  }

  async getLoansCount(): Promise<number> {
    try {
      return await this.prisma.loan.count();
    } catch (error) {
      this.logger.error('Error getting loans count:', error);
      return 0;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.loan.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(`Error finding loan by sheet ID ${sheetId}:`, error);
      throw error;
    }
  }
}

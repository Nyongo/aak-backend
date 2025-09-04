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
    try {
      const result = await this.prisma.loan.create({
        data: createLoanDto,
      });
      this.logger.log(`Created loan with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Error creating loan:`, error);
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
      const result = await this.prisma.loan.update({
        where: { id },
        data: updateLoanDto,
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

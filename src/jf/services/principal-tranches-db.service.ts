import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePrincipalTrancheDto } from '../dto/create-principal-tranche.dto';
import { UpdatePrincipalTrancheDto } from '../dto/update-principal-tranche.dto';

@Injectable()
export class PrincipalTranchesDbService {
  private readonly logger = new Logger(PrincipalTranchesDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createPrincipalTrancheDto: CreatePrincipalTrancheDto) {
    try {
      const result = await this.prisma.principalTranche.create({
        data: createPrincipalTrancheDto,
      });
      this.logger.log(`Created principal tranche with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating principal tranche:', error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.principalTranche.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching all principal tranches:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.principalTranche.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranche with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.principalTranche.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranche with sheet ID ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async findByLoanId(loanId: string) {
    try {
      return await this.prisma.principalTranche.findMany({
        where: { directLoanId: loanId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranches for loan ${loanId}:`,
        error,
      );
      throw error;
    }
  }

  async findByDirectLoanId(directLoanId: string) {
    try {
      return await this.prisma.principalTranche.findMany({
        where: { directLoanId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranches for direct loan ${directLoanId}:`,
        error,
      );
      throw error;
    }
  }

  async findBySslId(sslId: string) {
    try {
      return await this.prisma.principalTranche.findMany({
        where: { sslId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranches for SSL ID ${sslId}:`,
        error,
      );
      throw error;
    }
  }

  async update(
    id: number,
    updatePrincipalTrancheDto: UpdatePrincipalTrancheDto,
  ) {
    try {
      const result = await this.prisma.principalTranche.update({
        where: { id },
        data: updatePrincipalTrancheDto,
      });
      this.logger.log(`Updated principal tranche with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error updating principal tranche with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const result = await this.prisma.principalTranche.delete({
        where: { id },
      });
      this.logger.log(`Deleted principal tranche with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Error deleting principal tranche with ID ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findByRegion(region: string) {
    try {
      return await this.prisma.principalTranche.findMany({
        where: { region },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranches for region ${region}:`,
        error,
      );
      throw error;
    }
  }

  async findByLoanType(loanType: string) {
    try {
      return await this.prisma.principalTranche.findMany({
        where: { loanType },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranches for loan type ${loanType}:`,
        error,
      );
      throw error;
    }
  }

  async findByTeamLeader(teamLeader: string) {
    try {
      return await this.prisma.principalTranche.findMany({
        where: { teamLeader },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching principal tranches for team leader ${teamLeader}:`,
        error,
      );
      throw error;
    }
  }

  async findPar30Tranches() {
    try {
      return await this.prisma.principalTranche.findMany({
        where: {
          dateTrancheHasGonePar30: {
            not: null,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching PAR 30 principal tranches:', error);
      throw error;
    }
  }

  // Helper method to safely get a value from sheet record, handling multiple column name variations
  private getSheetValue(
    sheetRecord: any,
    ...possibleKeys: string[]
  ): string | null {
    for (const key of possibleKeys) {
      const value = sheetRecord[key];
      if (value !== undefined && value !== null && value !== '') {
        // Convert to string and trim
        const stringValue = String(value).trim();
        if (stringValue !== '') {
          return stringValue;
        }
      }
    }
    return null;
  }

  convertSheetToDb(sheetRecord: any): CreatePrincipalTrancheDto {
    // Log all available keys in the sheet record for debugging (only if logging is enabled)
    const availableKeys = Object.keys(sheetRecord).filter(
      (key) => sheetRecord[key] !== undefined && sheetRecord[key] !== null && sheetRecord[key] !== '',
    );
    if (availableKeys.length > 0) {
      this.logger.debug(
        `Converting sheet record. Available non-empty keys: ${availableKeys.join(', ')}`,
      );
    }

    // Map the actual column names from the sheet to database fields
    // Based on actual columns from the sheet:
    // ID, Direct Loan ID, Contract Signing Date, Amount, SSL ID,
    // Initial Disbursement Date in Contract, Date Tranche Has Gone Par 30,
    // Created At, Created By, Has Female Director?, Loan Type,
    // Reassigned?, Team Leader, Region
    const dbRecord: CreatePrincipalTrancheDto = {
      // ID field - exact column name from sheet
      sheetId: this.getSheetValue(
        sheetRecord,
        'ID',
        'Sheet ID',
        'sheetId',
        'Id',
        'id',
      ),

      // Direct Loan ID - exact column name from sheet
      directLoanId: this.getSheetValue(
        sheetRecord,
        'Direct Loan ID',
        'directLoanId',
        'Loan ID',
        'loanId',
        'direct_loan_id',
      ),

      // Contract Signing Date - exact column name from sheet
      contractSigningDate: this.getSheetValue(
        sheetRecord,
        'Contract Signing Date',
        'contractSigningDate',
        'Signing Date',
        'contract_signing_date',
      ),

      // Amount - exact column name from sheet, parse as currency
      amount: this.parseCurrency(
        this.getSheetValue(
          sheetRecord,
          'Amount',
          'amount',
          'Principal Amount',
          'principalAmount',
        ),
      ),

      // SSL ID - exact column name from sheet
      sslId: this.getSheetValue(
        sheetRecord,
        'SSL ID',
        'sslId',
        'Ssl ID',
        'ssl_id',
      ),

      // Initial Disbursement Date in Contract - exact column name from sheet, format to Month DD, YYYY
      initialDisbursementDateInContract: this.formatDateToMonthDDYYYY(
        this.getSheetValue(
          sheetRecord,
          'Initial Disbursement Date in Contract',
          'initialDisbursementDateInContract',
          'Initial Disbursement Date',
          'initial_disbursement_date_in_contract',
          'Disbursement Date',
        ),
      ),

      // Date Tranche Has Gone Par 30 - exact column name from sheet
      dateTrancheHasGonePar30: this.getSheetValue(
        sheetRecord,
        'Date Tranche Has Gone Par 30',
        'dateTrancheHasGonePar30',
        'Date Gone Par 30',
        'date_tranche_has_gone_par_30',
        'PAR 30 Date',
      ),

      // Created By - exact column name from sheet (Created At is handled by Prisma default)
      createdBy: this.getSheetValue(
        sheetRecord,
        'Created By',
        'createdBy',
        'created_by',
      ),

      // Has Female Director? - exact column name from sheet (note the question mark)
      hasFemaleDirector: this.getSheetValue(
        sheetRecord,
        'Has Female Director?',
        'hasFemaleDirector',
        'Has Female Director',
        'has_female_director',
        'Female Director',
      ),

      // Loan Type - exact column name from sheet
      loanType: this.getSheetValue(
        sheetRecord,
        'Loan Type',
        'loanType',
        'loan_type',
        'Type',
      ),

      // Reassigned? - exact column name from sheet (note the question mark)
      reassigned: this.getSheetValue(
        sheetRecord,
        'Reassigned?',
        'reassigned',
        'Reassigned',
        'Is Reassigned',
      ),

      // Team Leader - exact column name from sheet
      teamLeader: this.getSheetValue(
        sheetRecord,
        'Team Leader',
        'teamLeader',
        'team_leader',
        'Leader',
      ),

      // Region - exact column name from sheet
      region: this.getSheetValue(
        sheetRecord,
        'Region',
        'region',
        'Area',
      ),
    };

    // Remove null/undefined values to keep the record clean
    Object.keys(dbRecord).forEach((key) => {
      if (dbRecord[key] === null || dbRecord[key] === undefined) {
        delete dbRecord[key];
      }
    });

    return dbRecord;
  }

  /**
   * Parse currency value from Google Sheets format to number
   * Handles formats like: "1,234.56", "KSh 1,234.56", "1,234", "$1,234.56", etc.
   */
  private parseCurrency(value: string | null): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Handle "#VALUE!" and other Excel errors
      if (value.includes('#') || value.includes('VALUE') || value.includes('ERROR')) {
        return null;
      }
      // Remove currency symbols, spaces, and common prefixes
      let cleaned = value
        .replace(/[KSh$€£¥,\s]/g, '') // Remove currency symbols and commas
        .trim();
      
      // Handle empty strings after cleaning
      if (cleaned === '' || cleaned === '(empty)') return null;
      
      // Parse to float
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  /**
   * Format date to "Month DD, YYYY" format (e.g., "May 5, 2022")
   * Handles various input formats and converts to Month DD, YYYY
   */
  private formatDateToMonthDDYYYY(value: string | null): string | null {
    if (value === null || value === undefined || value === '' || value === '(empty)') {
      return null;
    }
    
    if (typeof value === 'string') {
      // If already in "Month DD, YYYY" format, return as is
      if (/^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/.test(value.trim())) {
        return value.trim();
      }
      
      // Try to parse various date formats
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ];
          const month = months[date.getMonth()];
          const day = date.getDate();
          const year = date.getFullYear();
          return `${month} ${day}, ${year}`;
        }
      } catch (e) {
        // If parsing fails, return the original value
        return value;
      }
    }
    
    return value;
  }
}

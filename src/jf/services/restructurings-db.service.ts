import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRestructuringDto } from '../dto/create-restructuring.dto';
import { UpdateRestructuringDto } from '../dto/update-restructuring.dto';

@Injectable()
export class RestructuringsDbService {
  private readonly logger = new Logger(RestructuringsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createRestructuringDto: CreateRestructuringDto) {
    // Clean the data to ensure types match Prisma schema
    let data: any = {};
    
    try {
      data = {};
      
      // Define numeric, integer, boolean, and date field lists for type checking
      const floatFields = ['previousPrincipalAmount', 'newPrincipalAmount', 'previousMonthlyPayment', 'newMonthlyPayment'];
      const intFields = ['previousNumberOfMonths', 'newNumberOfMonths'];
      const booleanFields = ['synced'];
      const dateFields = ['date'];
      
      // Copy all fields and convert types as needed
      for (const [key, value] of Object.entries(createRestructuringDto)) {
        if (value === undefined) {
          continue;
        }
        
        // Handle numeric fields (Float)
        if (floatFields.includes(key)) {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else if (typeof value === 'string') {
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
            data[key] = null;
          }
        }
        // Handle integer fields (Int)
        else if (intFields.includes(key)) {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else if (typeof value === 'string') {
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
          } else {
            data[key] = null;
          }
        }
        // Handle date fields (DateTime)
        else if (dateFields.includes(key)) {
          data[key] = this.parseDate(value);
        }
        // Handle boolean fields (Boolean)
        else if (booleanFields.includes(key)) {
          if (value === null || value === undefined) {
            data[key] = null;
          } else if (typeof value === 'boolean') {
            data[key] = value;
          } else if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue === 'true' || lowerValue === '1') {
              data[key] = true;
            } else if (lowerValue === 'false' || lowerValue === '0') {
              data[key] = false;
            } else {
              data[key] = null;
            }
          } else if (typeof value === 'number') {
            data[key] = value !== 0;
          } else {
            data[key] = null;
          }
        }
        // Handle all other fields (strings, etc.)
        else {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else {
            data[key] = String(value);
          }
        }
      }
      
      // Remove any undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      return await this.prisma.restructuring.create({
        data,
      });
    } catch (error) {
      this.logger.error(`Error creating restructuring:`, error);
      throw error;
    }
  }

  async findAll() {
    try {
      return await this.prisma.restructuring.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching all restructurings:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.restructuring.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error fetching restructuring with ID ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.restructuring.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(`Error finding restructuring by sheet ID ${sheetId}:`, error);
      throw error;
    }
  }

  async findByLoanId(loanId: string) {
    try {
      return await this.prisma.restructuring.findMany({
        where: { loanId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching restructurings for loanId ${loanId}:`, error);
      throw error;
    }
  }

  async update(id: number, updateRestructuringDto: UpdateRestructuringDto) {
    // Clean the data to ensure types match Prisma schema
    let data: any = {};
    
    try {
      data = {};
      
      const floatFields = ['previousPrincipalAmount', 'newPrincipalAmount', 'previousMonthlyPayment', 'newMonthlyPayment'];
      const intFields = ['previousNumberOfMonths', 'newNumberOfMonths'];
      const booleanFields = ['synced'];
      const dateFields = ['date'];
      
      for (const [key, value] of Object.entries(updateRestructuringDto)) {
        if (value === undefined) {
          continue;
        }
        
        if (floatFields.includes(key)) {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else if (typeof value === 'string') {
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
            data[key] = null;
          }
        }
        else if (intFields.includes(key)) {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else if (typeof value === 'string') {
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
          } else {
            data[key] = null;
          }
        }
        else if (dateFields.includes(key)) {
          data[key] = this.parseDate(value);
        }
        else if (booleanFields.includes(key)) {
          if (value === null || value === undefined) {
            data[key] = null;
          } else if (typeof value === 'boolean') {
            data[key] = value;
          } else if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue === 'true' || lowerValue === '1') {
              data[key] = true;
            } else if (lowerValue === 'false' || lowerValue === '0') {
              data[key] = false;
            } else {
              data[key] = null;
            }
          } else if (typeof value === 'number') {
            data[key] = value !== 0;
          } else {
            data[key] = null;
          }
        }
        else {
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else {
            data[key] = String(value);
          }
        }
      }
      
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      return await this.prisma.restructuring.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Error updating restructuring with ID ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.restructuring.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting restructuring with ID ${id}:`, error);
      throw error;
    }
  }

  async getRestructuringsCount(): Promise<number> {
    try {
      // Check if restructuring model exists in Prisma client
      if (!this.prisma.restructuring) {
        this.logger.error('Prisma client does not have restructuring model. Please regenerate Prisma client with: npx prisma generate');
        throw new Error('Prisma client is out of sync. Please run: npx prisma generate');
      }
      return await this.prisma.restructuring.count();
    } catch (error) {
      this.logger.error('Error counting restructurings:', error);
      if (error instanceof Error && error.message.includes('Prisma client is out of sync')) {
        throw error;
      }
      // If it's a table doesn't exist error, provide helpful message
      if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('undefined'))) {
        this.logger.error('Restructuring table may not exist in database. Please run: npx prisma migrate dev or npx prisma db push');
        throw new Error('Restructuring table does not exist. Please create the database table first.');
      }
      throw error;
    }
  }

  convertSheetToDb(sheetRecord: any): CreateRestructuringDto {
    return {
      sheetId: sheetRecord['ID'] || sheetRecord['Sheet ID'] || null,
      loanId: sheetRecord['Direct Loan ID'] || sheetRecord['Loan ID'] || null,
      date: sheetRecord['Date'] || null,
      restructuringDate: sheetRecord['Restructuring Date'] || null,
      reason: sheetRecord['Reason'] || null,
      previousLoanTerms: sheetRecord['Previous Loan Terms'] || null,
      newLoanTerms: sheetRecord['New Loan Terms'] || null,
      previousPrincipalAmount: this.parseCurrency(sheetRecord['Previous Principal Amount'] || null),
      newPrincipalAmount: this.parseCurrency(sheetRecord['New Principal Amount'] || null),
      previousInterestRate: sheetRecord['Previous Interest Rate'] || null,
      newInterestRate: sheetRecord['New Interest Rate'] || null,
      previousNumberOfMonths: this.parseInt(sheetRecord['Previous Number of Months'] || null),
      newNumberOfMonths: this.parseInt(sheetRecord['New Number of Months'] || null),
      previousMonthlyPayment: this.parseCurrency(sheetRecord['Previous Monthly Payment'] || null),
      newMonthlyPayment: this.parseCurrency(sheetRecord['New Monthly Payment'] || null),
      approvedBy: sheetRecord['Approved By'] || null,
      approvalDate: sheetRecord['Approval Date'] || null,
      createdAtSheet: sheetRecord['Created At'] || null,
      createdBy: sheetRecord['Created By'] || null,
      region: sheetRecord['Region'] || null,
      sslId: sheetRecord['SSL ID'] || null,
      notes: sheetRecord['Notes'] || null,
    };
  }

  /**
   * Parse date value from Google Sheets format to Date object
   * Handles DD/MM/YYYY format (from Restructurings sheet)
   * Returns Date object for Prisma DateTime field
   */
  private parseDate(value: any): Date | null {
    if (value === null || value === undefined || value === '' || value === '(empty)') {
      return null;
    }
    
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    if (typeof value === 'string') {
      try {
        // Handle DD/MM/YYYY format (common in Restructurings sheet, e.g., "01/07/2023")
        const ddmmyyyyMatch = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyyMatch) {
          const day = parseInt(ddmmyyyyMatch[1], 10);
          const month = parseInt(ddmmyyyyMatch[2], 10) - 1; // Month is 0-indexed
          const year = parseInt(ddmmyyyyMatch[3], 10);
          const date = new Date(year, month, day);
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
        
        // Try to parse other formats (ISO, "May 13, 2022", etc.)
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        // If parsing fails, return null
        return null;
      }
    }
    
    return null;
  }

  private parseCurrency(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      if (value.includes('#') || value.includes('VALUE') || value.includes('ERROR')) {
        return null;
      }
      let cleaned = value.replace(/[KSh$€£¥,\s]/g, '').trim();
      if (cleaned === '' || cleaned === '(empty)') return null;
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  private parseInt(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      if (value.includes('#') || value.includes('VALUE') || value.includes('ERROR')) {
        return null;
      }
      let cleaned = value.replace(/[,\s]/g, '').trim();
      if (cleaned === '' || cleaned === '(empty)') return null;
      const parsed = parseInt(cleaned, 10);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }
}

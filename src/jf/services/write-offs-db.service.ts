import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWriteOffDto } from '../dto/create-write-off.dto';
import { UpdateWriteOffDto } from '../dto/update-write-off.dto';

@Injectable()
export class WriteOffsDbService {
  private readonly logger = new Logger(WriteOffsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createWriteOffDto: CreateWriteOffDto) {
    // Clean the data to ensure types match Prisma schema
    let data: any = {};
    
    try {
      // Initialize data object
      data = {};
      
      // Define numeric and boolean field lists for type checking
      const floatFields = ['principalAmountWrittenOff', 'interestAmountWrittenOff', 'vehicleInsuranceAmountWrittenOff', 'totalAmount', 'penaltyAmountWrittenOff'];
      const booleanFields = ['synced'];
      
      // Copy all fields and convert types as needed
      for (const [key, value] of Object.entries(createWriteOffDto)) {
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
          // Convert to string or null
          if (value === null || value === '' || value === '(empty)') {
            data[key] = null;
          } else {
            // Ensure string fields are actually strings
            data[key] = String(value);
          }
        }
      }
      
      // Final validation: Ensure numeric fields are correct types
      if (data.principalAmountWrittenOff !== null && data.principalAmountWrittenOff !== undefined) {
        data.principalAmountWrittenOff = typeof data.principalAmountWrittenOff === 'number' ? data.principalAmountWrittenOff : null;
      }
      if (data.interestAmountWrittenOff !== null && data.interestAmountWrittenOff !== undefined) {
        data.interestAmountWrittenOff = typeof data.interestAmountWrittenOff === 'number' ? data.interestAmountWrittenOff : null;
      }
      if (data.vehicleInsuranceAmountWrittenOff !== null && data.vehicleInsuranceAmountWrittenOff !== undefined) {
        data.vehicleInsuranceAmountWrittenOff = typeof data.vehicleInsuranceAmountWrittenOff === 'number' ? data.vehicleInsuranceAmountWrittenOff : null;
      }
      if (data.totalAmount !== null && data.totalAmount !== undefined) {
        data.totalAmount = typeof data.totalAmount === 'number' ? data.totalAmount : null;
      }
      
      // Remove any undefined values one more time (safety check)
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });

      // Check if writeOff model exists in Prisma client
      if (!this.prisma.writeOff) {
        this.logger.error('Prisma client does not have writeOff model. Please regenerate Prisma client with: npx prisma generate');
        throw new Error('Prisma client is out of sync. Please run: npx prisma generate and restart the application');
      }

      const result = await this.prisma.writeOff.create({
        data,
      });
      this.logger.log(`Created write off with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error('Error creating write off:', error);
      if (data && Object.keys(data).length > 0) {
        this.logger.error(`Data sent to Prisma (first 30 fields):`, 
          JSON.stringify(
            Object.keys(data).slice(0, 30).reduce((obj, key) => {
              obj[key] = {
                value: data[key],
                type: typeof data[key],
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
      return await this.prisma.writeOff.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error('Error fetching all write offs:', error);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      return await this.prisma.writeOff.findUnique({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error fetching write off with ID ${id}:`, error);
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.writeOff.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(`Error fetching write off with sheetId ${sheetId}:`, error);
      throw error;
    }
  }

  async findByLoanId(loanId: string) {
    try {
      return await this.prisma.writeOff.findMany({
        where: { loanId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching write offs for loanId ${loanId}:`, error);
      throw error;
    }
  }

  async findByPaymentScheduleId(paymentScheduleId: string) {
    try {
      return await this.prisma.writeOff.findMany({
        where: { paymentScheduleId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching write offs for paymentScheduleId ${paymentScheduleId}:`, error);
      throw error;
    }
  }

  async findBySslId(sslId: string) {
    try {
      return await this.prisma.writeOff.findMany({
        where: { sslId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching write offs for sslId ${sslId}:`, error);
      throw error;
    }
  }

  async findByRegion(region: string) {
    try {
      return await this.prisma.writeOff.findMany({
        where: { region },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(`Error fetching write offs for region ${region}:`, error);
      throw error;
    }
  }

  async update(id: number, updateWriteOffDto: UpdateWriteOffDto) {
    // Clean the data to ensure types match Prisma schema
    let data: any = {};
    
    try {
      // Initialize data object
      data = {};
      
      // Define numeric and boolean field lists for type checking
      const floatFields = ['principalAmountWrittenOff', 'interestAmountWrittenOff', 'vehicleInsuranceAmountWrittenOff', 'totalAmount', 'penaltyAmountWrittenOff'];
      const booleanFields = ['synced'];
      
      // Copy all fields and convert types as needed
      for (const [key, value] of Object.entries(updateWriteOffDto)) {
        if (value === undefined) {
          // Skip undefined values - Prisma doesn't like undefined
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
        // Handle all other fields
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

      return await this.prisma.writeOff.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.logger.error(`Error updating write off with ID ${id}:`, error);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.writeOff.delete({
        where: { id },
      });
    } catch (error) {
      this.logger.error(`Error deleting write off with ID ${id}:`, error);
      throw error;
    }
  }

  async getWriteOffsCount(): Promise<number> {
    try {
      // Check if writeOff model exists in Prisma client
      if (!this.prisma.writeOff) {
        this.logger.error('Prisma client does not have writeOff model. Please regenerate Prisma client with: npx prisma generate');
        throw new Error('Prisma client is out of sync. Please run: npx prisma generate');
      }
      return await this.prisma.writeOff.count();
    } catch (error) {
      this.logger.error('Error counting write offs:', error);
      if (error instanceof Error && error.message.includes('Prisma client is out of sync')) {
        throw error;
      }
      // If it's a table doesn't exist error, provide helpful message
      if (error instanceof Error && (error.message.includes('does not exist') || error.message.includes('relation') || error.message.includes('undefined'))) {
        this.logger.error('WriteOff table may not exist in database. Please run: npx prisma migrate dev or npx prisma db push');
        throw new Error('WriteOff table does not exist. Please create the database table first.');
      }
      throw error;
    }
  }

  /**
   * Convert sheet data format to database format
   */
  convertSheetToDb(sheetRecord: any) {
    return {
      sheetId: sheetRecord['ID'] || null,
      date: sheetRecord['Date'] || null,
      loanId: sheetRecord['Loan ID'] || null,
      paymentScheduleId: sheetRecord['Payment Schedule ID'] || null,
      principalAmountWrittenOff: this.parseCurrency(
        sheetRecord['Principal Amount Written Off'] || null,
      ),
      interestAmountWrittenOff: this.parseCurrency(
        sheetRecord['Interest Amount Written Off'] || null,
      ),
      vehicleInsuranceAmountWrittenOff: this.parseCurrency(
        sheetRecord['Vehicle Insurance Amount Written Off'] || null,
      ),
      totalAmount: this.parseCurrency(
        sheetRecord['Total Amount'] || null,
      ),
      createdAtSheet: sheetRecord['Created At'] || null,
      createdBy: sheetRecord['Created By'] || null,
      region: sheetRecord['Region'] || null,
      sslId: sheetRecord['SSL ID'] || null,
      loanOrPaymentLevel: sheetRecord['Loan or Payment Level'] || null,
      penaltyAmountWrittenOff: this.parseCurrency(
        sheetRecord['Penalty Amount Written Off'] || null,
      ),
    };
  }

  /**
   * Parse currency value from Google Sheets format to number
   * Handles formats like: "1,234.56", "KSh 1,234.56", "1,234", "$1,234.56", etc.
   */
  private parseCurrency(value: any): number | null {
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
}

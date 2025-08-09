import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorDisbursementDetailsDbService {
  private readonly logger = new Logger(VendorDisbursementDetailsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    try {
      return await this.prisma.vendorDisbursementDetail.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error finding all vendor disbursement details:',
        error,
      );
      throw error;
    }
  }

  async findByCreditApplicationId(creditApplicationId: string) {
    try {
      return await this.prisma.vendorDisbursementDetail.findMany({
        where: { creditApplicationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        `Error finding vendor disbursement details for credit application ${creditApplicationId}:`,
        error,
      );
      throw error;
    }
  }

  async findUnsynced() {
    try {
      return await this.prisma.vendorDisbursementDetail.findMany({
        where: { synced: false },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error finding unsynced vendor disbursement details:',
        error,
      );
      throw error;
    }
  }

  async findSynced() {
    try {
      return await this.prisma.vendorDisbursementDetail.findMany({
        where: { synced: true },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      this.logger.error(
        'Error finding synced vendor disbursement details:',
        error,
      );
      throw error;
    }
  }

  async findById(id: string) {
    try {
      return await this.prisma.vendorDisbursementDetail.findUnique({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(
        `Error finding vendor disbursement detail ${id}:`,
        error,
      );
      throw error;
    }
  }

  async findBySheetId(sheetId: string) {
    try {
      return await this.prisma.vendorDisbursementDetail.findUnique({
        where: { sheetId },
      });
    } catch (error) {
      this.logger.error(
        `Error finding vendor disbursement detail by sheetId ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async create(data: any) {
    try {
      return await this.prisma.vendorDisbursementDetail.create({
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error('Error creating vendor disbursement detail:', error);
      throw error;
    }
  }

  async update(sheetId: string, data: any) {
    try {
      return await this.prisma.vendorDisbursementDetail.update({
        where: { sheetId },
        data: this.convertSheetDataToDb(data),
      });
    } catch (error) {
      this.logger.error(
        `Error updating vendor disbursement detail ${sheetId}:`,
        error,
      );
      throw error;
    }
  }

  async updateById(id: number, data: any) {
    try {
      return await this.prisma.vendorDisbursementDetail.update({
        where: { id },
        data: data, // Data is already in database format
      });
    } catch (error) {
      this.logger.error(
        `Error updating vendor disbursement detail by id ${id}:`,
        error,
      );
      throw error;
    }
  }

  async updateSyncStatus(id: number, synced: boolean) {
    try {
      return await this.prisma.vendorDisbursementDetail.update({
        where: { id },
        data: { synced },
      });
    } catch (error) {
      this.logger.error(
        `Error updating sync status for vendor disbursement detail ${id}:`,
        error,
      );
      throw error;
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.vendorDisbursementDetail.delete({
        where: { id: parseInt(id) },
      });
    } catch (error) {
      this.logger.error(
        `Error deleting vendor disbursement detail ${id}:`,
        error,
      );
      throw error;
    }
  }

  // Mapping between database fields and Google Sheets columns
  private sheetToDbMapping = {
    ID: 'sheetId',
    'Credit Application ID': 'creditApplicationId',
    'Vendor Payment Method': 'vendorPaymentMethod',
    'Phone Number for M Pesa Payment': 'phoneNumberForMPesaPayment',
    'Manager Verification of Payment Account': 'managerVerification',
    'Document Verifying Payment Account': 'documentVerifyingPaymentAccount',
    'Bank Name': 'bankName',
    'Account Name': 'accountName',
    'Account Number': 'accountNumber',
    'Phone Number for Bank Account': 'phoneNumberForBankAccount',
    'Paybill Number and Account': 'paybillNumberAndAccount',
    'Buy Goods Till ': 'buyGoodsTill',
  };

  private dbToSheetMapping = {
    sheetId: 'ID',
    creditApplicationId: 'Credit Application ID',
    vendorPaymentMethod: 'Vendor Payment Method',
    phoneNumberForMPesaPayment: 'Phone Number for M Pesa Payment',
    managerVerification: 'Manager Verification of Payment Account',
    documentVerifyingPaymentAccount: 'Document Verifying Payment Account',
    bankName: 'Bank Name',
    accountName: 'Account Name',
    accountNumber: 'Account Number',
    phoneNumberForBankAccount: 'Phone Number for Bank Account',
    paybillNumberAndAccount: 'Paybill Number and Account',
    buyGoodsTill: 'Buy Goods Till ',
  };

  convertSheetDataToDb(sheetData: any) {
    const dbData: any = {};
    Object.keys(this.dbToSheetMapping).forEach((dbKey) => {
      const sheetKey = this.dbToSheetMapping[dbKey];
      if (sheetData[sheetKey] !== undefined) {
        dbData[dbKey] = sheetData[sheetKey];
      }
    });
    return dbData;
  }

  convertDbDataToSheet(dbData: any) {
    const sheetData: any = {};
    Object.keys(this.sheetToDbMapping).forEach((sheetKey) => {
      const dbKey = this.sheetToDbMapping[sheetKey];
      if (dbData[dbKey] !== undefined) {
        sheetData[sheetKey] = dbData[dbKey];
      }
    });
    return sheetData;
  }
}

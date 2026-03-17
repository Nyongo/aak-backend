import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollateralLoansDbService {
  private readonly logger = new Logger(CollateralLoansDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async countAll() {
    return this.prisma.collateralLoan.count();
  }

  extractSheetId(record: any): string | null {
    return (
      record['ID'] ||
      record['Sheet ID'] ||
      record['sheetId'] ||
      record['Id'] ||
      null
    );
  }

  convertSheetToDb(record: any) {
    return {
      sheetId: this.extractSheetId(record),
      collateralId: record['Collateral ID'] || null,
      loanId: record['Loan ID'] || null,
      school: record['School'] || null,
      rawData: record,
    };
  }

  async findBySheetId(sheetId: string) {
    return this.prisma.collateralLoan.findUnique({
      where: { sheetId },
    });
  }

  async create(data: any) {
    return this.prisma.collateralLoan.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.collateralLoan.update({
      where: { id },
      data,
    });
  }
}


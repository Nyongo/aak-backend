import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollateralsDbService {
  private readonly logger = new Logger(CollateralsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async countAll() {
    return this.prisma.collateral.count();
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
      loanId: record['Loan ID'] || record['loanId'] || null,
      borrowerId: record['Borrower ID'] || record['borrowerId'] || null,
      rawData: record,
    };
  }

  async findBySheetId(sheetId: string) {
    return this.prisma.collateral.findUnique({
      where: { sheetId },
    });
  }

  async create(data: any) {
    return this.prisma.collateral.create({ data });
  }

  async update(id: number, data: any) {
    return this.prisma.collateral.update({
      where: { id },
      data,
    });
  }
}


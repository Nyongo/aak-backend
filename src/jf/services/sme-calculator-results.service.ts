import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateSmeCalculatorResultDto } from '../dto/create-sme-calculator-result.dto';
import { UpdateSmeCalculatorResultDto } from '../dto/update-sme-calculator-result.dto';

@Injectable()
export class SmeCalculatorResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSmeCalculatorResultDto) {
    const { results, ...rest } = dto;

    const baseData: any = {
      clientName: rest.clientName,
      sales: rest.sales,
      verifiedSales: rest.verifiedSales,
      costOfSales: rest.costOfSales,
      rent: rest.rent,
      utilities: rest.utilities,
      labour: rest.labour,
      transport: rest.transport,
      tradingLicense: rest.tradingLicense,
      otherExpenses: rest.otherExpenses,
      otherIncome: rest.otherIncome,
      householdExpenses: rest.householdExpenses,
      otherDebtPayments: rest.otherDebtPayments,
      selectedProduct: rest.selectedProduct,
      proposedLoan: rest.proposedLoan,
      tenor: rest.tenor,
      applyStress: rest.applyStress,
    };

    if (results) {
      baseData.effectiveRevenues = results.effectiveRevenues ?? 0;
      baseData.grossProfit = results.grossProfit ?? 0;
      baseData.operatingExpenses = results.operatingExpenses ?? 0;
      baseData.netBusinessIncome = results.netBusinessIncome ?? 0;
      baseData.householdDeduction = results.householdDeduction ?? 0;
      baseData.netDisposableIncome = results.netDisposableIncome ?? 0;
      baseData.monthlyInstallment = results.monthlyInstallment ?? 0;
      baseData.debtServiceRatio = results.debtServiceRatio ?? 0;
      baseData.maxMonthlyPayment = results.maxMonthlyPayment ?? 0;
      baseData.maxLoanAffordability = results.maxLoanAffordability ?? 0;
      baseData.rawResults = results as any;
    } else {
      baseData.effectiveRevenues = 0;
      baseData.grossProfit = 0;
      baseData.operatingExpenses = 0;
      baseData.netBusinessIncome = 0;
      baseData.householdDeduction = 0;
      baseData.netDisposableIncome = 0;
      baseData.monthlyInstallment = 0;
      baseData.debtServiceRatio = 0;
      baseData.maxMonthlyPayment = 0;
      baseData.maxLoanAffordability = 0;
      baseData.rawResults = {};
    }

    return this.prisma.smeCalculatorResult.create({
      data: baseData,
    });
  }

  async findAll(params?: {
    clientName?: string;
    skip?: number;
    take?: number;
  }) {
    const { clientName, skip = 0, take = 50 } = params ?? {};

    const where = clientName ? { clientName } : {};

    const [items, total] = await Promise.all([
      this.prisma.smeCalculatorResult.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.smeCalculatorResult.count({ where }),
    ]);

    return {
      data: items,
      pagination: {
        total,
        skip,
        take,
      },
    };
  }

  async findByClientName(clientName: string) {
    return this.prisma.smeCalculatorResult.findMany({
      where: { clientName },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.smeCalculatorResult.findUnique({
      where: { id },
    });
  }

  async update(id: number, dto: UpdateSmeCalculatorResultDto) {
    const { results, ...rest } = dto as UpdateSmeCalculatorResultDto & {
      results?: any;
    };

    const data: any = { ...rest };

    if (results) {
      data.effectiveRevenues = results.effectiveRevenues;
      data.grossProfit = results.grossProfit;
      data.operatingExpenses = results.operatingExpenses;
      data.netBusinessIncome = results.netBusinessIncome;
      data.householdDeduction = results.householdDeduction;
      data.netDisposableIncome = results.netDisposableIncome;
      data.monthlyInstallment = results.monthlyInstallment;
      data.debtServiceRatio = results.debtServiceRatio;
      data.maxMonthlyPayment = results.maxMonthlyPayment;
      data.maxLoanAffordability = results.maxLoanAffordability;
      data.rawResults = results as any;
    }

    return this.prisma.smeCalculatorResult.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.smeCalculatorResult.delete({
      where: { id },
    });
  }
}


import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InterimCheckIn } from '@prisma/client';
import { CreateInterimCheckInDto } from '../dto/create-interim-checkin.dto';
import { UpdateInterimCheckInDto } from '../dto/update-interim-checkin.dto';

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

@Injectable()
export class InterimCheckInService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicRow(rec: InterimCheckIn): InterimCheckIn {
    return rec;
  }

  private assertKindAndTerm(dto: {
    checkInKind: string;
    termNumber?: number | null;
  }) {
    if (!['annual', 'termly'].includes(dto.checkInKind)) {
      throw new BadRequestException(`Invalid checkInKind: ${dto.checkInKind}`);
    }
    if (dto.checkInKind === 'annual') {
      if (dto.termNumber != null && dto.termNumber !== undefined) {
        throw new BadRequestException('termNumber must be null for annual check-ins');
      }
    } else {
      if (![1, 2, 3].includes(dto.termNumber as number)) {
        throw new BadRequestException(
          'termNumber must be 1, 2, or 3 when checkInKind is termly',
        );
      }
    }
  }

  private validateResponsesForKind(
    checkInKind: string,
    termNumber: number | null,
    responses: Record<string, unknown>,
  ) {
    if (checkInKind === 'termly') {
      const t = responses['termNumber'];
      if (t !== undefined && t !== null && termNumber != null && toNum(t) !== termNumber) {
        throw new BadRequestException(
          'responses.termNumber must match top-level termNumber when both are set',
        );
      }
    }

    const pctFields = [
      ['A4_pctStudentsOnSponsorship', 'annual'],
      ['L2_teacherRetentionPct', 'annual'],
      ['T4_studentAttendanceRatePct', 'termly'],
    ] as const;
    for (const [key, kind] of pctFields) {
      if (kind !== checkInKind) continue;
      const v = toNum(responses[key]);
      if (v !== null && (v < 0 || v > 100)) {
        throw new BadRequestException(`${key} must be between 0 and 100`);
      }
    }

    for (const key of ['Fac1_classroomQualityLikert', 'Fac2_washroomQualityLikert']) {
      const v = toNum(responses[key]);
      if (v !== null && (!Number.isInteger(v) || v < 1 || v > 5)) {
        throw new BadRequestException(`${key} must be an integer from 1 to 5`);
      }
    }

    const l3 = responses['L3_scoresByExam'] as Record<string, unknown> | undefined;
    if (l3 && typeof l3 === 'object') {
      for (const exam of ['KCPE', 'KCSE']) {
        const band = l3[exam] as Record<string, unknown> | undefined;
        if (!band || typeof band !== 'object') continue;
        const a = toNum(band['belowPct']);
        const b = toNum(band['atAvgPct']);
        const c = toNum(band['abovePct']);
        const parts = [a, b, c].filter((x) => x !== null) as number[];
        for (const p of parts) {
          if (p < 0 || p > 100) {
            throw new BadRequestException(`L3_scoresByExam.${exam} percentages must be 0–100`);
          }
        }
        if (parts.length === 3) {
          const sum = (a ?? 0) + (b ?? 0) + (c ?? 0);
          if (sum > 100.0001) {
            throw new BadRequestException(
              `L3_scoresByExam.${exam}: belowPct + atAvgPct + abovePct must not exceed 100`,
            );
          }
        }
      }
    }
  }

  private async assertBorrowerAndApplicationLinked(
    borrowerId: string,
    creditApplicationId: string,
  ) {
    const borrower = await this.prisma.borrower.findFirst({
      where: {
        OR: [
          { sheetId: borrowerId },
          {
            id: Number.isFinite(Number(borrowerId))
              ? Number(borrowerId)
              : -1,
          },
        ],
      },
      select: { sheetId: true, id: true },
    });
    if (!borrower) {
      throw new NotFoundException(`Borrower not found: ${borrowerId}`);
    }

    const app = await this.prisma.creditApplication.findFirst({
      where: {
        OR: [
          { sheetId: creditApplicationId },
          {
            id: Number.isFinite(Number(creditApplicationId))
              ? Number(creditApplicationId)
              : -1,
          },
        ],
      },
      select: { id: true, sheetId: true, borrowerId: true },
    });
    if (!app) {
      throw new NotFoundException(
        `Credit application not found: ${creditApplicationId}`,
      );
    }

    const borrowerSheetId = borrower.sheetId ?? String(borrower.id);
    if (app.borrowerId && app.borrowerId !== borrowerSheetId) {
      throw new BadRequestException(
        `creditApplicationId "${creditApplicationId}" is not linked to borrowerId "${borrowerId}"`,
      );
    }

    return { borrowerSheetId, appSheetId: app.sheetId ?? String(app.id) };
  }

  private async resolveStoredCreditApplicationId(
    creditApplicationId: string,
  ): Promise<string | null> {
    const app = await this.prisma.creditApplication.findFirst({
      where: {
        OR: [
          { sheetId: creditApplicationId },
          {
            id: Number.isFinite(Number(creditApplicationId))
              ? Number(creditApplicationId)
              : -1,
          },
        ],
      },
      select: { id: true, sheetId: true },
    });
    return app ? app.sheetId ?? String(app.id) : null;
  }

  private async resolveStoredBorrowerId(borrowerId: string): Promise<string | null> {
    const borrower = await this.prisma.borrower.findFirst({
      where: {
        OR: [
          { sheetId: borrowerId },
          {
            id: Number.isFinite(Number(borrowerId)) ? Number(borrowerId) : -1,
          },
        ],
      },
      select: { sheetId: true, id: true },
    });
    return borrower ? borrower.sheetId ?? String(borrower.id) : null;
  }

  async create(dto: CreateInterimCheckInDto) {
    this.assertKindAndTerm(dto);

    const link = await this.assertBorrowerAndApplicationLinked(
      dto.borrowerId,
      dto.creditApplicationId,
    );

    const responses = dto.responses as Record<string, unknown>;
    this.validateResponsesForKind(
      dto.checkInKind,
      dto.checkInKind === 'annual' ? null : dto.termNumber!,
      responses,
    );

    const year = dto.year ?? new Date().getFullYear();

    const rec = await this.prisma.interimCheckIn.create({
      data: {
        borrowerId: link.borrowerSheetId,
        creditApplicationId: link.appSheetId,
        submittedBySslUserId: dto.submittedBySslUserId,
        checkInKind: dto.checkInKind,
        termNumber: dto.checkInKind === 'annual' ? null : dto.termNumber!,
        year,
        surveyVersion: dto.surveyVersion,
        responses: responses as object,
      },
    });
    return this.toPublicRow(rec);
  }

  async findByApplication(
    creditApplicationId: string,
    filters?: { checkInKind?: string; termNumber?: string },
  ) {
    const storedAppId =
      (await this.resolveStoredCreditApplicationId(creditApplicationId)) ??
      creditApplicationId;

    const where: Record<string, unknown> = { creditApplicationId: storedAppId };
    if (filters?.checkInKind && ['annual', 'termly'].includes(filters.checkInKind)) {
      where['checkInKind'] = filters.checkInKind;
    }
    if (filters?.termNumber !== undefined && filters.termNumber !== '') {
      const tn = Number(filters.termNumber);
      if ([1, 2, 3].includes(tn)) where['termNumber'] = tn;
    }

    const recs = await this.prisma.interimCheckIn.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        borrowerId: true,
        creditApplicationId: true,
        submittedBySslUserId: true,
        checkInKind: true,
        termNumber: true,
        surveyVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return recs;
  }

  async findByBorrower(
    borrowerId: string,
    filters?: { checkInKind?: string; termNumber?: string },
  ) {
    const storedBorrowerId =
      (await this.resolveStoredBorrowerId(borrowerId)) ?? borrowerId;

    const where: Record<string, unknown> = { borrowerId: storedBorrowerId };
    if (filters?.checkInKind && ['annual', 'termly'].includes(filters.checkInKind)) {
      where['checkInKind'] = filters.checkInKind;
    }
    if (filters?.termNumber !== undefined && filters.termNumber !== '') {
      const tn = Number(filters.termNumber);
      if ([1, 2, 3].includes(tn)) where['termNumber'] = tn;
    }

    return this.prisma.interimCheckIn.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        borrowerId: true,
        creditApplicationId: true,
        submittedBySslUserId: true,
        checkInKind: true,
        termNumber: true,
        surveyVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(id: string) {
    const rec = await this.prisma.interimCheckIn.findUnique({ where: { id } });
    if (!rec) throw new NotFoundException(`Interim check-in not found: ${id}`);
    return this.toPublicRow(rec);
  }

  async update(id: string, dto: UpdateInterimCheckInDto) {
    const existing = await this.prisma.interimCheckIn.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Interim check-in not found: ${id}`);

    const data: Record<string, unknown> = {};
    if (dto.surveyVersion !== undefined) data['surveyVersion'] = dto.surveyVersion;
    if (dto.submittedBySslUserId !== undefined) {
      data['submittedBySslUserId'] = dto.submittedBySslUserId;
    }
    if (dto.responses !== undefined) {
      this.validateResponsesForKind(
        existing.checkInKind,
        existing.termNumber,
        dto.responses as Record<string, unknown>,
      );
      data['responses'] = dto.responses as object;
    }

    if (Object.keys(data).length === 0) {
      return this.toPublicRow(existing);
    }

    const rec = await this.prisma.interimCheckIn.update({
      where: { id },
      data: data as any,
    });
    return this.toPublicRow(rec);
  }
}

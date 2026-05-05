import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateImpactSurveySubmissionDto } from '../dto/create-impact-survey-submission.dto';
import { UpdateImpactSurveySubmissionDto } from '../dto/update-impact-survey-submission.dto';

type StudentLevel = { male?: number; female?: number; withDisability?: number };

function toInt(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

@Injectable()
export class ImpactSurveySubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  private deriveFields(responses: Record<string, any>) {
    // These follow the API spec structure. If frontend sends a different shape,
    // we still store the raw JSON; derived fields will just be null.
    const s1 = responses?.s1 ?? responses?.S1 ?? responses?.schoolProfile ?? {};
    const s2 = responses?.s2 ?? responses?.S2 ?? {};

    const schoolType = s1.schoolType ?? null;
    const areaType = s1.areaType ?? null;
    const isRepeatBorrower =
      typeof s1.isRepeatBorrower === 'boolean' ? s1.isRepeatBorrower : null;

    const students = s2.students ?? {};
    const levels: StudentLevel[] = [
      students.playschool,
      students.prePrimary,
      students.primary,
      students.secondary,
    ].filter(Boolean);

    let totalStudentsMale = 0;
    let totalStudentsFemale = 0;
    let totalStudentsWithDisability = 0;
    let anyStudentCounts = false;

    for (const lvl of levels) {
      const m = toInt(lvl.male);
      const f = toInt(lvl.female);
      const d = toInt(lvl.withDisability);
      if (m !== null) {
        totalStudentsMale += m;
        anyStudentCounts = true;
      }
      if (f !== null) {
        totalStudentsFemale += f;
        anyStudentCounts = true;
      }
      if (d !== null) {
        totalStudentsWithDisability += d;
        anyStudentCounts = true;
      }
    }

    const totalStudents = anyStudentCounts
      ? totalStudentsMale + totalStudentsFemale
      : null;

    // Staff counts – spec defines roles with male/female counts.
    // roles: certifiedTeachers, uncertifiedTeachers, adminStaff
    const roles = s2.staff ?? s2.staffing ?? {};
    const roleKeys = ['certifiedTeachers', 'uncertifiedTeachers', 'adminStaff'];
    let staffMaleSum = 0;
    let staffFemaleSum = 0;
    let anyStaffCounts = false;
    for (const k of roleKeys) {
      const r = roles?.[k];
      if (!r) continue;
      const m = toInt(r.male);
      const f = toInt(r.female);
      if (m !== null) {
        staffMaleSum += m;
        anyStaffCounts = true;
      }
      if (f !== null) {
        staffFemaleSum += f;
        anyStaffCounts = true;
      }
    }
    const totalStaffMale = anyStaffCounts ? staffMaleSum : null;
    const totalStaffFemale = anyStaffCounts ? staffFemaleSum : null;
    const totalStaff = anyStaffCounts ? staffMaleSum + staffFemaleSum : null;

    return {
      schoolType: schoolType ? String(schoolType) : null,
      areaType: areaType ? String(areaType) : null,
      isRepeatBorrower,
      totalStudentsMale: anyStudentCounts ? totalStudentsMale : null,
      totalStudentsFemale: anyStudentCounts ? totalStudentsFemale : null,
      totalStudentsWithDisability: anyStudentCounts
        ? totalStudentsWithDisability
        : null,
      totalStudents,
      totalStaffMale,
      totalStaffFemale,
      totalStaff,
    };
  }

  private validateBusinessRules(responses: Record<string, any>) {
    const s2 = responses?.s2 ?? responses?.S2 ?? {};
    const students = s2.students ?? {};
    const levelKeys = ['playschool', 'prePrimary', 'primary', 'secondary'];
    for (const k of levelKeys) {
      const lvl = students?.[k];
      if (!lvl) continue;
      const m = toInt(lvl.male) ?? 0;
      const f = toInt(lvl.female) ?? 0;
      const d = toInt(lvl.withDisability);
      if (d !== null && d > m + f) {
        throw new BadRequestException(
          `Invalid students.${k}.withDisability: must be <= male + female`,
        );
      }
    }
  }

  private async assertBorrowerAndApplicationLinked(
    borrowerId: string,
    creditApplicationId: string,
  ) {
    const borrower = await this.prisma.borrower.findFirst({
      where: {
        OR: [{ sheetId: borrowerId }, { id: Number.isFinite(Number(borrowerId)) ? Number(borrowerId) : -1 }],
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
          { id: Number.isFinite(Number(creditApplicationId)) ? Number(creditApplicationId) : -1 },
        ],
      },
      select: { id: true, sheetId: true, borrowerId: true },
    });
    if (!app) {
      throw new NotFoundException(
        `Credit application not found: ${creditApplicationId}`,
      );
    }

    // In this codebase, CreditApplication.borrowerId typically stores the Borrower.sheetId
    const borrowerSheetId = borrower.sheetId ?? String(borrower.id);
    if (app.borrowerId && app.borrowerId !== borrowerSheetId) {
      throw new BadRequestException(
        `creditApplicationId "${creditApplicationId}" is not linked to borrowerId "${borrowerId}"`,
      );
    }

    return { borrowerSheetId, appSheetId: app.sheetId ?? String(app.id) };
  }

  async create(dto: CreateImpactSurveySubmissionDto) {
    const link = await this.assertBorrowerAndApplicationLinked(
      dto.borrowerId,
      dto.creditApplicationId,
    );

    this.validateBusinessRules(dto.responses);
    const derived = this.deriveFields(dto.responses);

    return this.prisma.impactSurveySubmission.create({
      data: {
        borrowerId: link.borrowerSheetId,
        creditApplicationId: link.appSheetId,
        submittedBySslUserId: dto.submittedBySslUserId,
        submittedAt: new Date(),
        surveyVersion: dto.surveyVersion,
        responses: dto.responses as any,
        ...derived,
      },
    });
  }

  async findByApplication(creditApplicationId: string) {
    return this.prisma.impactSurveySubmission.findMany({
      where: { creditApplicationId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findByBorrower(borrowerId: string) {
    return this.prisma.impactSurveySubmission.findMany({
      where: { borrowerId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const rec = await this.prisma.impactSurveySubmission.findUnique({
      where: { id },
    });
    if (!rec) throw new NotFoundException(`Impact survey not found: ${id}`);
    return rec;
  }

  async update(id: string, dto: UpdateImpactSurveySubmissionDto) {
    // If borrowerId/applicationId are being changed, enforce linkage again
    if (dto.borrowerId && dto.creditApplicationId) {
      await this.assertBorrowerAndApplicationLinked(dto.borrowerId, dto.creditApplicationId);
    }

    const data: any = { ...dto };

    if (dto.responses) {
      this.validateBusinessRules(dto.responses as any);
      const derived = this.deriveFields(dto.responses as any);
      data.responses = dto.responses as any;
      Object.assign(data, derived);
    }

    // Don't allow changing immutable timestamps directly
    delete data.createdAt;
    delete data.updatedAt;

    return this.prisma.impactSurveySubmission.update({
      where: { id },
      data,
    });
  }
}


import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';

@Injectable()
export class SspScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async generateSlots(
    sspId: number,
    startDate: string,
    endDate: string,
    startHour = 9,
    endHour = 17,
    duration = 60,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const slots = [];

    for (
      let date = new Date(start);
      date <= end;
      date.setDate(date.getDate() + 1)
    ) {
      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + duration);

        slots.push({ sspId, date: new Date(date), startTime, endTime });
      }
    }

    const result = await this.prisma.sspSchedule.createMany({ data: slots });
    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Schedules Generated Successfully',
      result,
    );
  }

  async getSchedules(sspId: number, startDate: string, endDate: string) {
    const startOfDay = new Date(startDate);
    startOfDay.setUTCHours(0, 0, 0, 0); // Ensure start of the day in UTC

    const endOfDay = new Date(endDate);
    endOfDay.setUTCHours(23, 59, 59, 999); // Ensure end of the day in UTC

    const schedules = await this.prisma.sspSchedule.findMany({
      where: {
        sspId: sspId,
        date: {
          gte: startDate, // Greater than or equal to start of day
          lte: endDate, // Less than or equal to end of day
        },
      },
      orderBy: { date: 'asc' },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Schedules fetched',
      schedules,
    );
  }
}

import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Injectable()
export class SspScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async generateSlots(
    sspId: number,
    startHour = 9,
    endHour = 17,
    duration = 60,
  ) {
    const today = new Date();
    const slots = [];

    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(today.getDate() + day);

      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(startTime.getMinutes() + duration);

        slots.push({
          sspId,
          date: date,
          startTime,
          endTime,
        });
      }
      console.log(slots);
    }

    // Save slots to the database
    const result = await this.prisma.sspSchedule.createMany({ data: slots });
    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Schedules Generated Successfully',
      result,
    );
  }

  async findAllSspSchedules(sspId: number) {
    const data = await this.prisma.sspSchedule.findMany({
      where: { sspId },
      include: { ssp: true, appointments: true },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Records Retrieved',
      data,
    );
  }

  async findOne(
    id: number,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const record = await this.prisma.sspSchedule.findUnique({
        where: { id },
        include: { ssp: true, appointments: true },
      });
      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'No record found',
          null,
        );
      }
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Retrieved Successfully',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(
    id: number,
    updateDto: any,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const updatedRecord = await this.prisma.sspSchedule.update({
        where: { id },
        data: updateDto,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Updated Successfully',
        updatedRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(
    id: number,
  ): Promise<{ response: { code: number; message: string }; data: any }> {
    try {
      const record = await this.prisma.sspSchedule.findUnique({
        where: { id },
      });
      return this.commonFunctions.returnFormattedResponse(
        200,
        'Deleted Successfully',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}

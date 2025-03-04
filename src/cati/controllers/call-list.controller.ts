import {
  Controller,
  HttpCode,
  Post,
  Body,
  UseGuards,
  UseFilters,
  UploadedFile,
} from '@nestjs/common';
import { formidable } from 'formidable';
import { UseInterceptors } from '@nestjs/common/decorators/core/use-interceptors.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import readXlsxFile from 'read-excel-file/node';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as moment from 'moment';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { PrismaService } from 'src/prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';

@Controller('call-list')
export class CallListController {
  constructor(
    private prismaService: PrismaService,
    private commonService: CommonFunctionsService,
  ) {}

  @Post('add')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async create(@Body() body: any): Promise<any> {
    try {
      const data = await this.prismaService.callList.create({
        data: {
          userId: body.userId,
          name: body.name,
          description: body.description,
        },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'Record Added Successfully',
        data,
      );
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('view')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async findOne(@Body() body: any): Promise<any> {
    try {
      const data = await this.prismaService.callList.findFirst({
        where: { id: body.id },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'Record Retrieved Successfully',
        data,
      );
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('delete')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async deleteOne(@Body() body: any): Promise<any> {
    try {
      const data = await this.prismaService.callList.delete({
        where: { id: body.id },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'Record Deleted Successfully',
        data,
      );
    } catch (error) {
      return this.commonService.returnFormattedResponse(404, 'Error', error);
    } finally {
    }
  }
  /** Call List Agent View*/
  @Post('list')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async findAllLists(@Body() payload: any): Promise<any> {
    console.log('Identity');
    console.log(payload.identity.id);
    try {
      let data: any = await this.prismaService.callList.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          isActive: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        where: {
          isActive: true,
          userId: payload.identity.id,
        },
        // skip: 0,
        // take: 10,
        orderBy: { createdAt: 'desc' },
      });
      for (let i = 0; i < data.length; i++) {
        data[i].total_contacts = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id },
        });
        data[i].pending = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'pending' },
        });
        data[i].answered = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'answered' },
        });
        data[i].no_answer = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'no_answer' },
        });
        data[i].disconnected = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'disconnected' },
        });
        data[i].voicemail = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'voicemail' },
        });
        data[i].call_back = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'call_back' },
        });
      }

      return this.commonService.returnFormattedResponse(
        200,
        'List retrieved successfully',
        data,
      );
    } catch (error) {
      throw error;
    } finally {
    }
  }

  /** Call List Admin View*/
  @Post('call-list-view')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async findAll(@Body() payload: any): Promise<any> {
    try {
      const data: any = await this.prismaService.callList.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          isActive: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        where: {
          isActive: true,
        },
        // skip: 0,
        // take: 10,
        orderBy: { createdAt: 'desc' },
      });
      for (let i = 0; i < data.length; i++) {
        data[i].total_contacts = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id },
        });
        data[i].pending = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'pending' },
        });
        data[i].answered = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'answered' },
        });
        data[i].no_answer = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'no_answer' },
        });
        data[i].disconnected = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'disconnected' },
        });
        data[i].voicemail = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'voicemail' },
        });
        data[i].call_back = await this.prismaService.callListItem.count({
          where: { callListId: data[i].id, status: 'call_back' },
        });
      }
      return this.commonService.returnFormattedResponse(
        200,
        'List retrieved successfully',
        data,
      );
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('add-call-to-list')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async addCall(@Body() body: any): Promise<any> {
    try {
      const list = await this.getSingleCallList(body?.listId);
      const data = await this.prismaService.callListItem.create({
        data: {
          userId: list.userId,
          callListId: body?.listId,
          phoneNumber: body.phoneNumber,
          name: body?.name,
          gender: body?.gender,
          status: 'pending',
          description: body?.description,
          callScheduledOn: new Date('2023-01-29 03:14:07'),
        },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'Record Added Successfully',
        data,
      );
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('scheduled-call/delete')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async deleteContact(@Body() body: any): Promise<any> {
    try {
      const data = await this.prismaService.callListItem.delete({
        where: {
          id: body.id,
        },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'Record Deleted Successfully',
        data,
      );
    } catch (error) {
      return error;
    } finally {
    }
  }

  @Post('import-contacts')
  @HttpCode(200)
  // @UseGuards(AuthGuard)
  @UseFilters(new HttpExceptionFilter())
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './tmp',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const fileName = `${uniqueSuffix}${ext}`;
          callback(null, fileName);
        },
      }),
    }),
  )
  async importContacts(
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<any> {
    try {
      const list = await this.getSingleCallList(body?.listId);
      readXlsxFile(`./tmp/${file.filename}`).then((rows) => {
        const contacts = rows
          .map((row, index) => {
            let record: any = {};
            record.userId = list.userId;
            record.callListId = body?.listId;
            record.phoneNumber = String(row[0]);
            record.name = row[1];
            record.gender = row[2];
            record.status = 'pending';
            record.description = row[3];
            record.callScheduledOn = new Date('2023-01-29 03:14:07');
            return record;
          })
          .filter((rec, index) => index !== 0);

        this.prismaService.callListItem
          .createMany({ data: contacts })
          .then((res) => {
            return this.commonService.returnFormattedResponse(
              200,
              'Recors Imported Successfully',
              {},
            );
          });
      });
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('scheduled-calls')
  @HttpCode(200)
  @UseFilters(new HttpExceptionFilter())
  async findAllCalls(@Body() payload: any): Promise<any> {
    const list = await this.getSingleCallList(payload?.listId);
    console.log('list');
    console.log(list);
    try {
      if (!list)
        return this.commonService.returnFormattedResponse(
          404,
          'List does not exist',
          [],
        );
      const data = await this.prismaService.callListItem.findMany({
        select: {
          id: true,
          callListId: true,
          phoneNumber: true,
          name: true,
          gender: true,
          description: true,
          status: true,
          callScheduledOn: true,
          createdAt: true,
          isActive: true,
          userId: true,
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        where: {
          isActive: true,
          callListId: list.id,
        },
        // skip: 0,
        // take: 10,
        orderBy: { createdAt: 'desc' },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'List retrieved successfully',
        data,
      );
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('recordings')
  @HttpCode(200)
  //  @UseGuards(AuthGuard)
  @UseFilters(new HttpExceptionFilter())
  async recordings(@Body() payload: any): Promise<any> {
    const contact = await this.getSingleContact(payload?.contactId);
    try {
      if (!contact) {
        return this.commonService.returnFormattedResponse(
          404,
          'Contact does not exist',
          [],
        );
      } else {
        let data: any = await this.prismaService.callRecording.findMany({
          select: {
            id: true,
            contactId: true,
            recording: true,
            description: true,
            status: true,
            createdAt: true,
          },
          where: {
            contactId: contact.id,
          },
          orderBy: { createdAt: 'desc' },
        });
        data = data.map((rec: any) => {
          rec.recording = `${process.env.HOST}:${process.env.PORT}/download/streamable?id=${rec.recording}`;
          return rec;
        });
        return this.commonService.returnFormattedResponse(
          200,
          'List retrieved successfully',
          data,
        );
      }
    } catch (error) {
      throw error;
    } finally {
    }
  }

  @Post('update-call-status')
  @HttpCode(200)
  // @UseGuards(AuthGuard)
  @UseFilters(new HttpExceptionFilter())
  async updateCallStatus(@Body() body: any): Promise<any> {
    console.log('------------------update call status--------------');
    console.log(body);
    const contact = await this.getSingleContact(body.id);

    try {
      const updatedRecord = await this.prismaService.callListItem.update({
        where: {
          id: body.id,
        },
        data: {
          status: body.status,
          callResultsNarration: body.callResultsNarration,
          callScheduledOn: body.callScheduledOn,
        },
      });
      // Add record to events table
      const event = await this.prismaService.callListItemEvents.create({
        data: {
          callListItemId: body.id,
          userId: contact.userId,
          status: body.status,
          narration: body.callResultsNarration,
          callStartTime: body.callStartTime,
          callEndTime: body.callEndTime,
        },
      });
      return this.commonService.returnFormattedResponse(
        200,
        'Status Updated Successfully',
        updatedRecord,
      );
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
    }
  }

  @Post('calls')
  @HttpCode(200)
  //  @UseGuards(AuthGuard)
  @UseFilters(new HttpExceptionFilter())
  async calls(@Body() payload: any): Promise<any> {
    const contact = await this.getSingleContact(payload?.contactId);
    try {
      if (!contact) {
        return this.commonService.returnFormattedResponse(
          404,
          'Contact does not exist',
          [],
        );
      } else {
        let data: any = await this.prismaService.callListItemEvents.findMany({
          select: {
            id: true,
            callListItemId: true,
            callStartTime: true,
            callEndTime: true,
            narration: true,
            status: true,
            createdAt: true,
          },
          where: {
            callListItemId: payload.id,
          },
          orderBy: { createdAt: 'desc' },
        });
        return this.commonService.returnFormattedResponse(
          200,
          'List retrieved successfully',
          data,
        );
      }
    } catch (error) {
      throw error;
    } finally {
      console.log('Error');
    }
  }
  getSingleCallList(id: number): any {
    return this.prismaService.callList.findFirst({ where: { id: id } });
  }
  getSingleContact(id: number): any {
    return this.prismaService.callListItem.findFirst({ where: { id: id } });
  }
}

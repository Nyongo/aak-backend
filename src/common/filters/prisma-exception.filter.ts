import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Response } from 'express';

@Catch(PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let message = 'An unknown database error occurred';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (exception.code) {
      case 'P2002':
        message = 'A record with this field already exists.';
        status = HttpStatus.BAD_REQUEST;
        break;
      case 'P2003':
        message = 'Foreign key constraint failed.';
        status = HttpStatus.BAD_REQUEST;
        break;
      case 'P2025':
        message = 'Record not found.';
        status = HttpStatus.NOT_FOUND;
        break;
    }

    response.status(200).json({
      response: {
        code: status,
        message: message,
      },
      data: {
        errors: exception.meta,
      },
    });
  }
}

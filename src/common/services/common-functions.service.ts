import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { Logger } from '@nestjs/common';

@Injectable()
export class CommonFunctionsService {
  constructor() {}

  // Unified response formatter
  returnFormattedResponse = (code: number, message: string, data: any): any => {
    return {
      response: { code, message },
      data: data,
    };
  };

  // Handle known Prisma errors and format the response
  handlePrismaError = (error: PrismaClientKnownRequestError): any => {
    let code: number;
    let message: string;

    switch (error.code) {
      case 'P2002': // Unique constraint violation
        code = HttpStatus.BAD_REQUEST;
        message = `The ${error.meta?.target} already exists.`;
        break;
      case 'P2003': // Foreign key constraint violation
        code = HttpStatus.BAD_REQUEST;
        message = 'Foreign key constraint failed.';
        break;
      case 'P2025': // Record not found
        code = HttpStatus.NOT_FOUND;
        message =
          'The record you are trying to update or delete does not exist.';
        break;
      default:
        code = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'An unexpected database error occurred.';
    }

    // Always return a 200 HTTP status with a properly formatted response
    return this.returnFormattedResponse(code, message, { error: message });
  };

  // General error handler for unknown errors
  handleUnknownError = (error: any): any => {
    Logger.error(error); // Log the error for debugging
    return this.returnFormattedResponse(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'An unexpected error occurred.',
      { error: error.message || 'Internal Server Error' },
    );
  };
}

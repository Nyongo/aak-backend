import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Logger,
  Query,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../services/users.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { CreateDirectorDto } from '../dto/create-director.dto';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('jf/directors')
export class DirectorsController {
  private readonly logger = new Logger(DirectorsController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('by-borrower/:borrowerId')
  async getDirectorsByBorrower(@Param('borrowerId') borrowerId: string) {
    try {
      this.logger.log(`Fetching directors for borrower: ${borrowerId}`);
      const directors =
        await this.usersService.getDirectorsByBorrowerId(borrowerId);

      return {
        success: true,
        count: directors.length,
        data: directors,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to fetch directors: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFront', maxCount: 1 },
      { name: 'kraPinPhoto', maxCount: 1 },
    ]),
  )
  async addDirector(
    @Body() directorData: CreateDirectorDto,
    @UploadedFiles()
    files: {
      nationalIdFront?: Express.Multer.File[];
      kraPinPhoto?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log('Adding new director');

      if (!directorData.borrowerId) {
        return {
          success: false,
          error: 'Borrower ID is required',
        };
      }

      // Upload National ID Front if provided
      let nationalIdFrontUrl = '';
      if (files.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const timestamp = new Date().getTime();
        const filename = `national_id_front_${directorData.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        nationalIdFrontUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
        );
      }

      // Upload KRA PIN Photo if provided
      let kraPinPhotoUrl = '';
      if (files.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const timestamp = new Date().getTime();
        const filename = `kra_pin_photo_${directorData.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        kraPinPhotoUrl = await this.googleDriveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
        );
      }

      // Add director with file URLs
      const director = await this.usersService.addDirector({
        ...directorData,
        'Borrower ID': directorData.borrowerId,
        'National ID Front': nationalIdFrontUrl,
        'KRA Pin Photo': kraPinPhotoUrl,
        'Created At': new Date().toISOString(),
      });

      return {
        success: true,
        data: director,
        message: 'Director added successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to add director: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':userId')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFront', maxCount: 1 },
      { name: 'kraPinPhoto', maxCount: 1 },
    ]),
  )
  async updateDirector(
    @Param('userId') userId: string,
    @Body() updateData: any,
    @UploadedFiles()
    files: {
      nationalIdFront?: Express.Multer.File[];
      kraPinPhoto?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating director: ${userId}`);

      // Handle file uploads if provided
      if (files.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const timestamp = new Date().getTime();
        const filename = `national_id_front_${userId}_${timestamp}.${file.originalname.split('.').pop()}`;

        updateData['National ID Front'] =
          await this.googleDriveService.uploadFile(
            file.buffer,
            filename,
            file.mimetype,
          );
      }

      if (files.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const timestamp = new Date().getTime();
        const filename = `kra_pin_photo_${userId}_${timestamp}.${file.originalname.split('.').pop()}`;

        updateData['KRA Pin Photo'] = await this.googleDriveService.uploadFile(
          file.buffer,
          filename,
          file.mimetype,
        );
      }

      const updatedDirector = await this.usersService.updateDirector(
        userId,
        updateData,
      );

      return {
        success: true,
        data: updatedDirector,
        message: 'Director updated successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to update director: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}

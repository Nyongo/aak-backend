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
  private readonly USERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_ID;
  private readonly USERS_IMAGES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_NAME;
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
      const documentColumns = [
        'KRA Pin Photo',
        'National ID Front',
        'National ID Back',
        'Passport Photo',
      ];
      const directorsWithLinks = await Promise.all(
        directors.map(async (director) => {
          const directorWithLinks = { ...director };
          for (const column of documentColumns) {
            if (director[column]) {
              const filename = director[column].split('/').pop();
              const fileLink = await this.googleDriveService.getFileLink(
                filename,
                this.USERS_IMAGES_FOLDER_ID,
              );
              directorWithLinks[column] = fileLink;
            }
          }
          return directorWithLinks;
        }),
      );
      return {
        success: true,
        count: directors.length,
        data: directorsWithLinks,
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
      { name: 'nationalIdBack', maxCount: 1 },
      { name: 'passportPhoto', maxCount: 1 },
    ]),
  )
  async addDirector(
    @Body() directorData: CreateDirectorDto,
    @UploadedFiles()
    files: {
      nationalIdFront?: Express.Multer.File[];
      kraPinPhoto?: Express.Multer.File[];
      nationalIdBack?: Express.Multer.File[];
      passportPhoto?: Express.Multer.File[];
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

      // Upload National ID Front and Back if provided

      let nationalIdFrontFileName = '';
      if (files.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const timestamp = new Date().getTime();
        nationalIdFrontFileName = `national_id_front_${directorData.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          nationalIdFrontFileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
      }

      let nationalIdBackFileName = '';
      if (files.nationalIdBack?.[0]) {
        const file = files.nationalIdBack[0];
        const timestamp = new Date().getTime();
        nationalIdBackFileName = `national_id_back_${directorData.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          nationalIdBackFileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
      }
      // Upload KRA PIN Photo if provided
      let kraPinFileName = '';
      if (files.kraPinPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const timestamp = new Date().getTime();
        kraPinFileName = `kra_pin_photo_${directorData.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;
        await this.googleDriveService.uploadFile(
          file.buffer,
          kraPinFileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
      }

      let passportFileName = '';
      if (files.passportPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const timestamp = new Date().getTime();
        passportFileName = `passport_photo_${directorData.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;
        await this.googleDriveService.uploadFile(
          file.buffer,
          passportFileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
      }

      // Add director with file URLs
      const director = await this.usersService.addDirector({
        //  ...directorData,
        ID: `D-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        'Borrower ID': directorData.borrowerId,
        Name: directorData['Name'],
        'National ID Number': directorData['National ID Number'],
        'KRA Pin Number': directorData['KRA Pin Number'],
        'Phone Number': directorData['Phone'],
        Email: directorData['Email'],
        Gender: directorData['Gender'],
        'Role in School': 'Director',
        Status: directorData['Status'],
        'Date of Birth': directorData['Date Of Birth']
          ? new Date(directorData['Date Of Birth']).toLocaleDateString(
              'en-US',
              {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              },
            )
          : '',

        'Education Level': directorData['Education Level'],
        'Insured for Credit Life?':
          directorData['Insured For Credit Life'] == 'Yes' ? 'TRUE' : 'FALSE',
        Address: directorData['Address'],
        'Postal Address': directorData['Postal Address'],
        'National ID Front': `${this.USERS_IMAGES_FOLDER_NAME}/${nationalIdFrontFileName}`,
        'National ID Back': `${this.USERS_IMAGES_FOLDER_NAME}/${nationalIdBackFileName}`,
        'KRA Pin Photo': `${this.USERS_IMAGES_FOLDER_NAME}/${kraPinFileName}`,
        'Passport Photo': `${this.USERS_IMAGES_FOLDER_NAME}/${passportFileName}`,
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

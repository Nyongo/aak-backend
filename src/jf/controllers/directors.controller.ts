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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { DirectorsDbService } from '../services/directors-db.service';
import { DirectorsSyncService } from '../services/directors-sync.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { FileUploadService } from '../services/file-upload.service';
import { BackgroundUploadService } from '../services/background-upload.service';
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
    private readonly directorsDbService: DirectorsDbService,
    private readonly directorsSyncService: DirectorsSyncService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly fileUploadService: FileUploadService,
    private readonly backgroundUploadService: BackgroundUploadService,
  ) {}

  @Get('/')
  async getAllDirectors() {
    this.logger.log('Getting all directors from Postgres');
    try {
      const directors = await this.directorsDbService.findAll();
      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(directors);

      return {
        success: true,
        data: directorsInSheetFormat,
        source: 'postgres',
        total: directors.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get directors: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/synced')
  async getSyncedDirectors() {
    this.logger.log('Getting synced directors from Postgres');
    try {
      const directors = await this.directorsDbService.findSynced();
      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(directors);

      return {
        success: true,
        data: directorsInSheetFormat,
        source: 'postgres',
        total: directors.length,
        status: 'synced',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get synced directors: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/unsynced')
  async getUnsyncedDirectors() {
    this.logger.log('Getting unsynced directors from Postgres');
    try {
      const directors = await this.directorsDbService.findUnsynced();
      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(directors);

      return {
        success: true,
        data: directorsInSheetFormat,
        source: 'postgres',
        total: directors.length,
        status: 'unsynced',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get unsynced directors: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/missing-sheetids')
  async getDirectorsWithMissingSheetIds() {
    this.logger.log('Getting directors with missing sheetIds from Postgres');
    try {
      const directors = await this.directorsDbService.findAll();
      const directorsWithMissingSheetIds = directors.filter(
        (director) =>
          !director.sheetId ||
          director.sheetId.startsWith('D-') ||
          director.sheetId === null,
      );

      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(
          directorsWithMissingSheetIds,
        );

      return {
        success: true,
        data: directorsInSheetFormat,
        source: 'postgres',
        total: directorsWithMissingSheetIds.length,
        status: 'missing-sheetids',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get directors with missing sheetIds: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }

  @Get('/upload-queue/status')
  async getUploadQueueStatus() {
    this.logger.log('Getting upload queue status');
    try {
      const status = this.backgroundUploadService.getQueueStatus();
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get upload queue status: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('/sync-missing-sheetids')
  async syncMissingSheetIds() {
    this.logger.log('Syncing directors with missing sheetIds');
    try {
      // Get all directors that don't have a valid sheetId
      const directors = await this.directorsDbService.findAll();
      const directorsWithMissingSheetIds = directors.filter(
        (director) =>
          !director.sheetId ||
          director.sheetId.startsWith('D-') ||
          director.sheetId === null,
      );

      this.logger.log(
        `Found ${directorsWithMissingSheetIds.length} directors with missing sheetIds`,
      );

      let synced = 0;
      let errors = 0;
      const errorDetails: any[] = [];

      for (const director of directorsWithMissingSheetIds) {
        try {
          const result = await this.directorsSyncService.syncDirectorById(
            director.id,
          );
          if (result.success) {
            synced++;
          } else {
            errors++;
            errorDetails.push({
              directorId: director.id,
              name: director.name,
              error: result.error,
            });
          }
        } catch (error) {
          errors++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errorDetails.push({
            directorId: director.id,
            name: director.name,
            error: errorMessage,
          });
        }
      }

      return {
        success: true,
        message: `Sync completed: ${synced} synced, ${errors} errors`,
        synced,
        errors,
        errorDetails,
        total: directorsWithMissingSheetIds.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to sync missing sheetIds: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('by-borrower/:borrowerId')
  async getDirectorsByBorrower(@Param('borrowerId') borrowerId: string) {
    this.logger.log(`Getting directors for borrower: ${borrowerId}`);
    try {
      const directors =
        await this.directorsDbService.findByBorrowerId(borrowerId);
      const directorsInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet(directors);

      // Add Google Drive links for document columns
      const documentColumns = [
        'KRA Pin Photo',
        'National ID Front',
        'National ID Back',
        'Passport Photo',
      ];
      const directorsWithLinks = await Promise.all(
        directorsInSheetFormat.map(async (director) => {
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
        source: 'postgres',
        borrowerId: borrowerId,
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
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields for file uploads
      transform: true,
    }),
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
      this.logger.log('Adding new director via Postgres');

      if (!directorData.borrowerId) {
        return {
          success: false,
          error: 'Borrower ID is required',
        };
      }

      // Save files locally first for faster response
      let nationalIdFrontPath = '';
      let nationalIdBackPath = '';
      let kraPinPath = '';
      let passportPath = '';

      // Save National ID Front if provided
      if (files.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const customName = `national_id_front_${directorData.borrowerId}`;
        nationalIdFrontPath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );
      }

      // Save National ID Back if provided
      if (files.nationalIdBack?.[0]) {
        const file = files.nationalIdBack[0];
        const customName = `national_id_back_${directorData.borrowerId}`;
        nationalIdBackPath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );
      }

      // Save KRA PIN Photo if provided
      if (files.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const customName = `kra_pin_photo_${directorData.borrowerId}`;
        kraPinPath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );
      }

      // Save Passport Photo if provided
      if (files.passportPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const customName = `passport_photo_${directorData.borrowerId}`;
        passportPath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );
      }

      // Prepare director data for Postgres
      const directorDataForDb = {
        sheetId: `D-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, // Generate temporary sheetId
        borrowerId: directorData.borrowerId,
        name: directorData['Name'],
        nationalIdNumber: directorData['National ID Number'],
        kraPinNumber: directorData['KRA Pin Number'],
        phoneNumber: directorData['Phone Number'],
        email: directorData['Email'],
        gender: directorData['Gender'],
        roleInSchool: 'Director',
        status: directorData['Status'],
        dateOfBirth: directorData['Date Of Birth']
          ? new Date(directorData['Date Of Birth']).toLocaleDateString(
              'en-US',
              {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric',
              },
            )
          : '',
        educationLevel: directorData['Education Level'],
        insuredForCreditLife:
          directorData['Insured For Credit Life'] == 'Yes' ? 'TRUE' : 'FALSE',
        address: directorData['Address'],
        postalAddress: directorData['Postal Address'],
        nationalIdFront: nationalIdFrontPath || '',
        nationalIdBack: nationalIdBackPath || '',
        kraPinPhoto: kraPinPath || '',
        passportPhoto: passportPath || '',
        synced: false,
      };

      // Debug logging
      this.logger.log('Director data for database:', {
        phoneNumber: directorDataForDb.phoneNumber,
        phoneNumberFromDto: directorData['Phone Number'],
        allData: directorDataForDb,
      });

      const result = await this.directorsDbService.create(directorDataForDb);

      this.logger.log(`Director added successfully via Postgres`);

      // Queue file uploads to Google Drive with director ID for database updates
      if (files.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const customName = `national_id_front_${directorData.borrowerId}`;
        this.backgroundUploadService.queueFileUpload(
          nationalIdFrontPath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          result.id,
          'nationalIdFront',
        );
      }

      if (files.nationalIdBack?.[0]) {
        const file = files.nationalIdBack[0];
        const customName = `national_id_back_${directorData.borrowerId}`;
        this.backgroundUploadService.queueFileUpload(
          nationalIdBackPath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          result.id,
          'nationalIdBack',
        );
      }

      if (files.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const customName = `kra_pin_photo_${directorData.borrowerId}`;
        this.backgroundUploadService.queueFileUpload(
          kraPinPath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          result.id,
          'kraPinPhoto',
        );
      }

      if (files.passportPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const customName = `passport_photo_${directorData.borrowerId}`;
        this.backgroundUploadService.queueFileUpload(
          passportPath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          result.id,
          'passportPhoto',
        );
      }

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(result.id, result.borrowerId, 'create');

      return {
        success: true,
        data: result,
        message: 'Director added successfully',
        sync: {
          triggered: true,
          status: 'background',
        },
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
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'nationalIdFront', maxCount: 1 },
      { name: 'kraPinPhoto', maxCount: 1 },
      { name: 'nationalIdBack', maxCount: 1 },
      { name: 'passportPhoto', maxCount: 1 },
    ]),
  )
  async updateDirector(
    @Param('userId') userId: string,
    @Body() updateData: Partial<CreateDirectorDto>,
    @UploadedFiles()
    files: {
      nationalIdFront?: Express.Multer.File[];
      kraPinPhoto?: Express.Multer.File[];
      nationalIdBack?: Express.Multer.File[];
      passportPhoto?: Express.Multer.File[];
    },
  ) {
    try {
      this.logger.log(`Updating director ${userId} via Postgres`);

      // First verify the director exists
      const directors = await this.directorsDbService.findByBorrowerId(
        updateData.borrowerId,
      );
      const director = directors.find((d) => d.sheetId === userId);

      if (!director) {
        return {
          success: false,
          error: 'Director not found',
        };
      }

      // Handle file uploads if provided - save locally first
      if (files.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const customName = `national_id_front_${updateData.borrowerId}`;
        const filePath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );

        // Queue for Google Drive upload
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          director.id,
          'nationalIdFront',
        );
        updateData['National ID Front'] = filePath;
      }

      if (files.nationalIdBack?.[0]) {
        const file = files.nationalIdBack[0];
        const customName = `national_id_back_${updateData.borrowerId}`;
        const filePath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );

        // Queue for Google Drive upload
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          director.id,
          'nationalIdBack',
        );
        updateData['National ID Back'] = filePath;
      }

      if (files.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const customName = `kra_pin_photo_${updateData.borrowerId}`;
        const filePath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );

        // Queue for Google Drive upload
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          director.id,
          'kraPinPhoto',
        );
        updateData['KRA Pin Photo'] = filePath;
      }

      if (files.passportPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const customName = `passport_photo_${updateData.borrowerId}`;
        const filePath = await this.fileUploadService.saveFile(
          file,
          'directors',
          customName,
        );

        // Queue for Google Drive upload
        this.backgroundUploadService.queueFileUpload(
          filePath,
          `${customName}_${Date.now()}.${file.originalname.split('.').pop()}`,
          this.USERS_IMAGES_FOLDER_ID,
          file.mimetype,
          director.id,
          'passportPhoto',
        );
        updateData['Passport Photo'] = filePath;
      }

      // Map update data to database format
      const mappedUpdateData = {
        name: updateData['Name'],
        nationalIdNumber: updateData['National ID Number'],
        kraPinNumber: updateData['KRA Pin Number'],
        phoneNumber: updateData['Phone Number'],
        email: updateData['Email'],
        gender: updateData['Gender'],
        roleInSchool: 'Director',
        status: updateData['Status'],
        dateOfBirth: updateData['Date Of Birth']
          ? new Date(updateData['Date Of Birth']).toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
            })
          : undefined,
        educationLevel: updateData['Education Level'],
        insuredForCreditLife:
          updateData['Insured For Credit Life'] == 'Yes' ? 'TRUE' : undefined,
        address: updateData['Address'],
        postalAddress: updateData['Postal Address'],
        nationalIdFront: updateData['National ID Front'],
        nationalIdBack: updateData['National ID Back'],
        kraPinPhoto: updateData['KRA Pin Photo'],
        passportPhoto: updateData['Passport Photo'],
        synced: false,
      };

      // Debug logging for update
      this.logger.log('Update director data:', {
        phoneNumber: mappedUpdateData.phoneNumber,
        phoneNumberFromDto: updateData['Phone Number'],
        allUpdateData: mappedUpdateData,
      });

      // Remove undefined values to prevent updating those fields
      Object.keys(mappedUpdateData).forEach((key) => {
        if (mappedUpdateData[key] === undefined) {
          delete mappedUpdateData[key];
        }
      });

      const updatedDirector = await this.directorsDbService.update(
        director.id.toString(),
        mappedUpdateData,
      );

      this.logger.log(`Director updated successfully via Postgres`);

      // Convert to sheet format for frontend compatibility
      const directorInSheetFormat =
        this.directorsDbService.convertDbArrayToSheet([updatedDirector])[0];

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(
        updatedDirector.id,
        updatedDirector.borrowerId,
        'update',
      );

      return {
        success: true,
        data: directorInSheetFormat,
        message: 'Director updated successfully',
        source: 'postgres',
        sync: {
          triggered: true,
          status: 'background',
        },
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

  private async triggerBackgroundSync(
    id: number,
    borrowerId: string,
    action: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for ID: ${id}, Borrower ID: ${borrowerId}, Action: ${action}`,
      );
      const syncResult = await this.directorsSyncService.syncDirectorById(id);
      this.logger.log(
        `Background sync completed for ID: ${id}, Borrower ID: ${borrowerId}, Action: ${action}: ${syncResult.synced} directors synced, ${syncResult.errors} errors`,
      );
    } catch (syncError) {
      this.logger.error(
        `Background sync failed for ID: ${id}, Borrower ID: ${borrowerId}, Action: ${action}: ${syncError}`,
      );
    }
  }
}

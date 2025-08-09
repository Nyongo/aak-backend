import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Put,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { BorrowersDbService } from '../services/borrowers-db.service';
import { BorrowersSyncService } from '../services/borrowers-sync.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { BackgroundUploadService } from '../services/background-upload.service';
import { FileUploadService } from '../services/file-upload.service';

@Controller('jf/borrowers')
export class BorrowersController {
  private readonly logger = new Logger(BorrowersController.name);
  private readonly BORROWERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_BORROWERS_IMAGES_FOLDER_ID;
  private readonly SCHOOL_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_SCHOOL_IMAGES_FOLDER_ID;

  // Document type to AppSheet field mapping
  private readonly documentFieldMapping = {
    'kra-pin': 'kraPinPhoto',
    'moe-certificate': 'moeCertificate',
    'official-search': 'officialSearch',
    'cr-12': 'cr12',
    'peleza-search': 'pelezaSearch',
    'society-cbo-incorporation-certificate': 'societyCertificate',
    'document-verifying-payment-account': 'documentVerifyingAccount',
    'national-id-front': 'nationalIdFront',
    'national-id-back': 'nationalIdBack',
  };

  private readonly folderNameMapping = {
    BORROWERS_IMAGES_FOLDER_ID: 'Borrowers_Images',
    SCHOOL_IMAGES_FOLDER_ID: 'Schools_Images',
  };

  constructor(
    private readonly borrowersDbService: BorrowersDbService,
    private readonly borrowersSyncService: BorrowersSyncService,
    private readonly googleDriveService: GoogleDriveService,
    private readonly backgroundUploadService: BackgroundUploadService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Get('/')
  async getAllBorrowers() {
    this.logger.log('Getting all borrowers from Postgres');
    try {
      const borrowers = await this.borrowersDbService.findAll();
      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      // Add file links for all borrowers
      const borrowersWithLinks = await Promise.all(
        borrowersInSheetFormat.map(async (borrower) => {
          const borrowerWithLinks = { ...borrower };

          // Add file links for document columns
          const documentColumns = [
            'KRA PIN Photo',
            'National ID Front',
            'National ID Back',
            'MOE Certificate',
            'Society/CBO/Incorporation Certificate',
            'Document Verifying Payment Account',
            'Official Search',
            'Peleza Search',
            'CR12',
          ];

          for (const column of documentColumns) {
            if (borrower[column]) {
              let gdFolderId;
              if (column === 'MOE Certificate') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Official Search') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Peleza Search') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'CR12') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Society/CBO/Incorporation Certificate') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Document Verifying Payment Account') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else {
                gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
              }

              try {
                // Extract just the filename from the path
                const filename = borrower[column].split('/').pop();
                const fileLink = await this.googleDriveService.getFileLink(
                  filename,
                  gdFolderId,
                );

                if (fileLink) {
                  borrowerWithLinks[`${column}_Link`] = fileLink;
                }
              } catch (error: any) {
                this.logger.error(
                  `Failed to get file link for ${column}: ${error?.message || 'Unknown error'}`,
                );
              }
            }
          }

          return borrowerWithLinks;
        }),
      );

      return {
        success: true,
        data: borrowersWithLinks,
        source: 'postgres',
        total: borrowersWithLinks.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get borrowers: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/synced')
  async getSyncedBorrowers() {
    this.logger.log('Getting synced borrowers from Postgres');
    try {
      const borrowers = await this.borrowersDbService.findSynced();
      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      return {
        success: true,
        data: borrowersInSheetFormat,
        source: 'postgres',
        total: borrowers.length,
        status: 'synced',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get synced borrowers: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/unsynced')
  async getUnsyncedBorrowers() {
    this.logger.log('Getting unsynced borrowers from Postgres');
    try {
      const borrowers = await this.borrowersDbService.findUnsynced();
      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      return {
        success: true,
        data: borrowersInSheetFormat,
        source: 'postgres',
        total: borrowers.length,
        status: 'unsynced',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get unsynced borrowers: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/by-ssl/:sslId')
  async getBorrowersBySslId(@Param('sslId') sslId: string) {
    this.logger.log(`Getting borrowers for SSL ID: ${sslId}`);
    try {
      const borrowers = await this.borrowersDbService.findBySslId(sslId);
      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      // Add file links for all borrowers
      const borrowersWithLinks = await Promise.all(
        borrowersInSheetFormat.map(async (borrower) => {
          const borrowerWithLinks = { ...borrower };

          // Add file links for document columns
          const documentColumns = [
            'KRA PIN Photo',
            'National ID Front',
            'National ID Back',
            'MOE Certificate',
            'Society/CBO/Incorporation Certificate',
            'Document Verifying Payment Account',
            'Official Search',
            'Peleza Search',
            'CR12',
          ];

          for (const column of documentColumns) {
            if (borrower[column]) {
              let gdFolderId;
              if (column === 'MOE Certificate') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Official Search') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Peleza Search') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'CR12') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Society/CBO/Incorporation Certificate') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else if (column === 'Document Verifying Payment Account') {
                gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
              } else {
                gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
              }

              try {
                // Extract just the filename from the path
                const filename = borrower[column].split('/').pop();
                const fileLink = await this.googleDriveService.getFileLink(
                  filename,
                  gdFolderId,
                );

                if (fileLink) {
                  borrowerWithLinks[`${column}_Link`] = fileLink;
                }
              } catch (error: any) {
                this.logger.error(
                  `Failed to get file link for ${column}: ${error?.message || 'Unknown error'}`,
                );
              }
            }
          }

          return borrowerWithLinks;
        }),
      );

      return {
        success: true,
        data: borrowersWithLinks,
        source: 'postgres',
        total: borrowersWithLinks.length,
        sslId: sslId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get borrowers by SSL ID: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('/') // POST endpoint to add a borrower
  async addBorrower(@Body() createBorrowerDto: any) {
    this.logger.log('Adding borrower via Postgres');

    try {
      // Always enforce type: 'School' for new records
      const borrowerData = {
        ...createBorrowerDto,
        type: 'School',
        status: 'Low Risk',
        synced: false,
      };

      const result = await this.borrowersDbService.create(borrowerData);

      this.logger.log(`Borrower added successfully via Postgres`);

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(result.id, result.sslId, 'create');

      return {
        success: true,
        data: result,
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error adding borrower';
      this.logger.error(`Failed to add borrower: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get('/find') // GET /jf/borrowers/find?name=...
  async findBorrowerByName(@Query('name') name: string) {
    const startTime = Date.now();
    this.logger.log(`Finding borrower by name: ${name}`);

    if (!name) {
      return { success: false, error: 'Name query parameter is required' };
    }

    try {
      const borrower = await this.borrowersDbService.findByName(name);
      const duration = Date.now() - startTime;

      if (!borrower) {
        return {
          success: true,
          found: false,
          data: null,
          duration_ms: duration,
          source: 'postgres',
        };
      }

      // Convert to sheet format for frontend compatibility
      const borrowerInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet([borrower])[0];

      // Add file links for document columns
      const documentColumns = [
        'KRA PIN Photo',
        'National ID Front',
        'National ID Back',
        'MOE Certificate',
        'Society/CBO/Incorporation Certificate',
        'Document Verifying Payment Account',
        'Official Search',
        'Peleza Search',
        'CR12',
      ];

      const borrowerWithLinks = { ...borrowerInSheetFormat };

      for (const column of documentColumns) {
        if (borrowerInSheetFormat[column]) {
          let gdFolderId;
          if (column === 'MOE Certificate') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Official Search') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Peleza Search') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'CR12') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Society/CBO/Incorporation Certificate') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Document Verifying Payment Account') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else {
            gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
          }

          try {
            // Extract just the filename from the path
            const filename = borrowerInSheetFormat[column].split('/').pop();
            const fileLink = await this.googleDriveService.getFileLink(
              filename,
              gdFolderId,
            );

            if (fileLink) {
              borrowerWithLinks[`${column}_Link`] = fileLink;
            }
          } catch (error: any) {
            this.logger.error(
              `Failed to get file link for ${column}: ${error?.message || 'Unknown error'}`,
            );
          }
        }
      }

      return {
        success: true,
        found: true,
        data: borrowerWithLinks,
        duration_ms: duration,
        source: 'postgres',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error finding borrower';
      this.logger.error(`Failed to find borrower: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Get(':rowId') // GET /jf/borrowers/<rowId>
  async getBorrowerById(@Param('rowId') rowId: string) {
    this.logger.log(`Finding borrower by Row ID: ${rowId}`);
    if (!rowId) {
      return { success: false, error: 'Row ID parameter is required' };
    }
    try {
      const borrower = await this.borrowersDbService.findBySheetId(rowId);
      if (!borrower) {
        return { success: false, error: 'Borrower not found' };
      }

      // Convert to sheet format for frontend compatibility
      const borrowerInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet([borrower])[0];

      // Add file links for document columns
      const documentColumns = [
        'KRA PIN Photo',
        'National ID Front',
        'National ID Back',
        'MOE Certificate',
        'Society/CBO/Incorporation Certificate',
        'Document Verifying Payment Account',
        'Official Search',
        'Peleza Search',
        'CR12',
      ];

      const borrowerWithLinks = { ...borrowerInSheetFormat };

      for (const column of documentColumns) {
        if (borrowerInSheetFormat[column]) {
          let gdFolderId;
          if (column === 'MOE Certificate') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Official Search') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Peleza Search') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'CR12') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Society/CBO/Incorporation Certificate') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else if (column === 'Document Verifying Payment Account') {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
          } else {
            gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
          }

          try {
            // Extract just the filename from the path
            const filename = borrowerInSheetFormat[column].split('/').pop();
            this.logger.debug(
              `Looking for file: ${filename} in folder: ${gdFolderId}`,
            );

            const fileLink = await this.googleDriveService.getFileLink(
              filename,
              gdFolderId,
            );

            this.logger.debug(`File link for ${column}: ${fileLink}`);

            if (fileLink) {
              borrowerWithLinks[`${column}_Link`] = fileLink;
              this.logger.debug(`Added link for ${column}: ${fileLink}`);
            } else {
              this.logger.warn(
                `No file link found for ${column} with filename: ${filename}`,
              );
            }
          } catch (error: any) {
            this.logger.error(
              `Failed to get file link for ${column}: ${error?.message || 'Unknown error'}`,
            );
          }
        } else {
          this.logger.debug(`No value found for column: ${column}`);
        }
      }

      return {
        success: true,
        found: true,
        data: borrowerWithLinks,
        source: 'postgres',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error finding borrower by ID';
      this.logger.error(`Failed to find borrower by ID: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Put(':id')
  async updateBorrower(
    @Param('id') id: string,
    @Body() updateBorrowerDto: any,
  ) {
    this.logger.log(`Updating borrower ${id} via Postgres`);

    try {
      // Always enforce type: 'School' for updated records
      const borrowerData = {
        ...updateBorrowerDto,
        type: 'School',
        synced: false,
      };

      const updatedBorrower = await this.borrowersDbService.update(
        id,
        borrowerData,
      );

      this.logger.log(`Borrower updated successfully via Postgres`);

      // Convert to sheet format for frontend compatibility
      const borrowerInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet([updatedBorrower])[0];

      // Trigger automatic sync to Google Sheets (non-blocking)
      this.triggerBackgroundSync(
        updatedBorrower.id,
        updatedBorrower.sslId,
        'update',
      );

      return {
        success: true,
        message: 'Borrower updated successfully',
        data: borrowerInSheetFormat,
        source: 'postgres',
        sync: {
          triggered: true,
          status: 'background',
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error updating borrower';
      this.logger.error(`Failed to update borrower: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  // Additional endpoint to get all borrowers without SSL ID filter
  @Get('all/list')
  async getAllBorrowersList() {
    this.logger.log('Fetching all borrowers');
    const startTime = Date.now();

    try {
      const borrowers = await this.borrowersDbService.findAll();
      const duration = Date.now() - startTime;

      // Convert to sheet format for frontend compatibility
      const borrowersInSheetFormat =
        this.borrowersDbService.convertDbArrayToSheet(borrowers);

      return {
        success: true,
        count: borrowersInSheetFormat.length,
        data: borrowersInSheetFormat,
        duration_ms: duration,
        source: 'postgres',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching all borrowers';
      this.logger.error(`Failed to fetch all borrowers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Debug endpoint to see raw database records with IDs
  @Get('debug/raw')
  async getRawBorrowers() {
    this.logger.log('Fetching raw borrowers for debugging');

    try {
      const borrowers = await this.borrowersDbService.findAll();

      return {
        success: true,
        count: borrowers.length,
        data: borrowers.map((b) => ({
          id: b.id,
          sheetId: b.sheetId,
          name: b.name,
          sslId: b.sslId,
          // Include a few other key fields for debugging
          type: b.type,
          customerType: b.customerType,
        })),
        source: 'postgres',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching raw borrowers';
      this.logger.error(`Failed to fetch raw borrowers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Post('upload/:documentType/:borrowerId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit, adjust as needed
    }),
  )
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Param('documentType') documentType: string,
    @Param('borrowerId') borrowerId: string,
  ) {
    this.logger.log(
      `Uploading ${documentType} document for borrower ${borrowerId}`,
    );
    try {
      const allowedTypes = Object.keys(this.documentFieldMapping);
      if (!allowedTypes.includes(documentType)) {
        return { success: false, error: 'Invalid document type' };
      }

      // Get existing borrower record from database
      const borrower = await this.borrowersDbService.findById(borrowerId);
      if (!borrower) {
        return { success: false, error: 'Borrower not found' };
      }

      let gdFolderId;
      let gdFolderName;
      if (documentType === 'moe-certificate') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'kra-pin') {
        gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.BORROWERS_IMAGES_FOLDER_ID;
      } else if (documentType === 'official-search') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'peleza-search') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'cr-12') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'national-id-back') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'society-cbo-incorporation-certificate') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'document-verifying-payment-account') {
        gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
      } else if (documentType === 'national-id-front') {
        gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
        gdFolderName = this.folderNameMapping.BORROWERS_IMAGES_FOLDER_ID;
      }

      const fileExtension = file.originalname.split('.').pop();
      const timestamp = new Date().getTime();
      const filename = `${documentType}_${borrowerId}_${timestamp}.${fileExtension}`;

      // Step 1: Store file locally first
      this.logger.debug(`Step 1: Storing file locally: ${filename}`);
      const localFilePath = await this.fileUploadService.saveFile(
        file,
        'borrowers',
        filename,
      );

      // Step 2: Upload to Google Drive
      this.logger.debug(`Step 2: Uploading to Google Drive: ${filename}`);
      const fileUrl = await this.googleDriveService.uploadFile(
        file.buffer,
        filename,
        file.mimetype,
        gdFolderId,
      );

      // Step 3: Update Postgres with Google Drive folder path
      this.logger.debug(
        `Step 3: Updating Postgres with Google Drive folder path`,
      );
      const updateData = {
        [this.documentFieldMapping[documentType]]:
          `${gdFolderName}/${filename}`, // Store the folder path, not URL
        synced: false, // Mark as unsynced to trigger background sync
      };

      await this.borrowersDbService.update(borrower.id.toString(), updateData);

      // Step 4: Update Google Sheets with URL
      this.logger.debug(`Step 4: Updating Google Sheets with URL`);
      await this.borrowersSyncService.syncBorrowerById(borrower.id);

      // Step 5: Mark record as synced in local DB
      this.logger.debug(`Step 5: Marking record as synced in local DB`);
      await this.borrowersDbService.updateSyncStatus(borrower.id, true);

      this.logger.debug('fileUrl', fileUrl);
      return {
        success: true,
        fileUrl,
        localFilePath,
        message: `Document uploaded and borrower record updated successfully`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error uploading file';
      this.logger.error(`Failed to upload file: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('upload-multiple/:borrowerId')
  @UseInterceptors(FilesInterceptor('files', 4))
  async uploadMultipleDocuments(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Param('borrowerId') borrowerId: string,
    @Body('documentTypes') documentTypes: string[],
  ) {
    this.logger.log(`Uploading multiple documents for borrower ${borrowerId}`);
    try {
      // Validate borrower exists in database
      const borrower = await this.borrowersDbService.findById(borrowerId);
      if (!borrower) {
        return { success: false, error: 'Borrower not found' };
      }

      // Validate document types
      const allowedTypes = Object.keys(this.documentFieldMapping);
      const invalidTypes = documentTypes.filter(
        (type) => !allowedTypes.includes(type),
      );
      if (invalidTypes.length > 0) {
        return {
          success: false,
          error: `Invalid document types: ${invalidTypes.join(', ')}`,
        };
      }

      // Upload files and collect URLs
      const updateData = {};
      const uploadResults = await Promise.all(
        files.map(async (file, index) => {
          const documentType = documentTypes[index];
          const fileExtension = file.originalname.split('.').pop();
          const timestamp = new Date().getTime();
          const filename = `${documentType}_${borrowerId}_${timestamp}.${fileExtension}`;

          // Determine folder based on document type
          let gdFolderId;
          let gdFolderName;
          if (
            documentType === 'moe-certificate' ||
            documentType === 'official-search' ||
            documentType === 'peleza-search' ||
            documentType === 'cr-12' ||
            documentType === 'society-cbo-incorporation-certificate' ||
            documentType === 'document-verifying-payment-account'
          ) {
            gdFolderId = this.SCHOOL_IMAGES_FOLDER_ID;
            gdFolderName = this.folderNameMapping.SCHOOL_IMAGES_FOLDER_ID;
          } else {
            gdFolderId = this.BORROWERS_IMAGES_FOLDER_ID;
            gdFolderName = this.folderNameMapping.BORROWERS_IMAGES_FOLDER_ID;
          }

          // Step 1: Store file locally first
          this.logger.debug(`Step 1: Storing file locally: ${filename}`);
          const localFilePath = await this.fileUploadService.saveFile(
            file,
            'borrowers',
            filename,
          );

          // Step 2: Upload to Google Drive
          this.logger.debug(`Step 2: Uploading to Google Drive: ${filename}`);
          const fileUrl = await this.googleDriveService.uploadFile(
            file.buffer,
            filename,
            file.mimetype,
            gdFolderId,
          );

          // Add Google Drive folder path to update data
          updateData[this.documentFieldMapping[documentType]] =
            `${gdFolderName}/${filename}`;

          return {
            documentType,
            originalName: file.originalname,
            fileUrl,
            localFilePath,
          };
        }),
      );

      // Step 3: Update Postgres with Google Drive folder paths
      this.logger.debug(
        `Step 3: Updating Postgres with Google Drive folder paths`,
      );
      updateData['synced'] = false; // Mark as unsynced to trigger background sync
      await this.borrowersDbService.update(borrower.id.toString(), updateData);

      // Step 4: Update Google Sheets with folder paths
      this.logger.debug(`Step 4: Updating Google Sheets with folder paths`);
      await this.borrowersSyncService.syncBorrowerById(borrower.id);

      // Step 5: Mark record as synced in local DB
      this.logger.debug(`Step 5: Marking record as synced in local DB`);
      await this.borrowersDbService.updateSyncStatus(borrower.id, true);

      return {
        success: true,
        files: uploadResults,
        message: 'Documents uploaded and borrower record updated successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error uploading files';
      this.logger.error(`Failed to upload files: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  private async triggerBackgroundSync(
    id: number,
    sslId: string,
    action: 'create' | 'update',
  ) {
    try {
      this.logger.log(
        `Triggering background sync for ID: ${id}, SSL ID: ${sslId}, Action: ${action}`,
      );
      const syncResult = await this.borrowersSyncService.syncBorrowerById(id);
      this.logger.log(
        `Background sync completed for ID: ${id}, SSL ID: ${sslId}, Action: ${action}: ${syncResult.synced} schools synced, ${syncResult.errors} errors`,
      );
    } catch (syncError) {
      this.logger.error(
        `Background sync failed for ID: ${id}, SSL ID: ${sslId}, Action: ${action}: ${syncError}`,
      );
    }
  }
}

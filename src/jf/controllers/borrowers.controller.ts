import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Inject,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Put,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AppSheetService } from '../services/appsheet.service';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
// We will create a DTO for Borrowers soon
import { CreateBorrowerDto } from '../dto/create-borrower.dto';

@Controller('jf/borrowers') // Base route for borrowers
export class BorrowersController {
  private readonly logger = new Logger(BorrowersController.name);
  private readonly BORROWERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_BORROWERS_IMAGES_FOLDER_ID;
  private readonly SCHOOL_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_SCHOOL_IMAGES_FOLDER_ID;
  // Document type to AppSheet field mapping
  private readonly documentFieldMapping = {
    'kra-pin': 'KRA PIN Photo',
    'moe-certificate': 'MOE Certificate',
    'official-search': 'Official Search',
    'cr-12': 'CR12',
    'peleza-search': 'Peleza Search',
    'society-cbo-incorporation-certificate':
      'Society/CBO/Incorporation Certificate',
    'document-verifying-payment-account': 'Document Verifying Payment Account',
  };

  private readonly folderNameMapping = {
    BORROWERS_IMAGES_FOLDER_ID: 'Borrowers_Images',
    SCHOOL_IMAGES_FOLDER_ID: 'Schools_Images',
  };

  constructor(
    private readonly appSheetService: AppSheetService, // Webservice
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

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
      }

      // Get existing borrower record
      const borrower = await this.sheetsService.findBorrowerById(borrowerId);
      if (!borrower) {
        return { success: false, error: 'Borrower not found' };
      }

      const fileExtension = file.originalname.split('.').pop();
      const timestamp = new Date().getTime();
      const filename = `${documentType}_${borrowerId}_${timestamp}.${fileExtension}`;

      // Upload to Google Drive
      const fileUrl = await this.googleDriveService.uploadFile(
        file.buffer,
        filename,
        file.mimetype,
        gdFolderId,
      );

      // Update the borrower record with the file URL
      // const updateData = {
      //   [this.documentFieldMapping[documentType]]: fileUrl,
      // };
      const updateData = {
        [this.documentFieldMapping[documentType]]:
          `${gdFolderName}/${filename}`,
      };

      await this.sheetsService.updateBorrower(borrowerId, updateData);
      console.log('fileUrl', fileUrl);
      return {
        success: true,
        fileUrl,
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
      // Validate borrower exists
      const borrower = await this.sheetsService.findBorrowerById(borrowerId);
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

          // Upload to Google Drive
          const fileUrl = await this.googleDriveService.uploadFile(
            file.buffer,
            filename,
            file.mimetype,
          );

          // Add URL to update data
          updateData[this.documentFieldMapping[documentType]] = fileUrl;

          return {
            documentType,
            originalName: file.originalname,
            fileUrl,
          };
        }),
      );

      // Update borrower record with all file URLs
      await this.sheetsService.updateBorrower(borrowerId, updateData);

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

  @Get('/') // GET endpoint for all borrowers
  async getAllBorrowers(@Query('sslId') sslId?: string) {
    if (!sslId) {
      return {
        success: false,
        error:
          'SSL ID is required. Please provide ?sslId=YOUR_SSL_ID in the URL',
        example: 'http://localhost:3000/jf/borrowers?sslId=YOUR_SSL_ID',
      };
    }

    this.logger.log(`Fetching borrowers for SSL ID: ${sslId}`);
    const startTime = Date.now();

    try {
      // Use Google Sheets directly for better filtering
      const borrowers = await this.sheetsService.getBorrowers(sslId);
      const duration = Date.now() - startTime;

      if (!borrowers || borrowers.length === 0) {
        return {
          success: true,
          count: 0,
          data: [],
          message: `No borrowers found for SSL ID: ${sslId}`,
          duration_ms: duration,
          source: 'sheets',
        };
      }

      // Add file links for columns that store file names
      const borrowersWithFileLinks = await Promise.all(
        borrowers.map(async (borrower) => {
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
              try {
                // Extract just the filename from the path
                const filename = borrower[column].split('/').pop();
                this.logger.debug(
                  `Looking for file: ${filename} in folder: ${this.BORROWERS_IMAGES_FOLDER_ID}`,
                );

                const fileLink = await this.googleDriveService.getFileLink(
                  filename,
                  this.BORROWERS_IMAGES_FOLDER_ID,
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

          return borrowerWithLinks;
        }),
      );

      this.logger.log(
        `Found ${borrowersWithFileLinks.length} borrowers for SSL ID: ${sslId}`,
      );
      return {
        success: true,
        count: borrowersWithFileLinks.length,
        data: borrowersWithFileLinks,
        duration_ms: duration,
        source: 'sheets',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching borrowers';
      this.logger.error(`Failed to fetch borrowers: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  @Get('by-ssl/:sslId')
  async getBorrowersBySSLId(@Param('sslId') sslId: string) {
    this.logger.log(`Fetching borrowers for SSL ID: ${sslId}`);
    const startTime = Date.now();

    if (!sslId) {
      return { success: false, error: 'SSL ID parameter is required' };
    }

    try {
      const borrowers = await this.sheetsService.getBorrowers(sslId);
      const duration = Date.now() - startTime;

      return {
        success: true,
        count: borrowers.length,
        data: borrowers,
        duration_ms: duration,
        source: 'sheets',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown error fetching borrowers';
      this.logger.error(`Failed to fetch borrowers by SSL ID: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  @Post('/') // POST endpoint to add a borrower
  async addBorrower(@Body() data: any) {
    let createBorrowerDto: CreateBorrowerDto = {
      'SSL ID': data.sslId,
      'Customer Type': 'School',
      Type: 'School',
      Name: data.name,
      'Location Description': data.locationDescription,
      'Location Pin': data.locationPin,
      'Year Founded': data.yearFounded,
      'Primary Phone for Borrower': data.primaryPhone,
      Notes: data.notes,
      'Society, CBO, or Corporation': data.entityType,
      'Registration Number of CBO, Society, or Corporation':
        data.registrationNumber,
      'How did the borrower hear about Jackfruit?': data.howHeard,
      County: data.county,
      'KRA PIN Number': data.kraPinNumber,
      'Products Requested': data.productsRequested,
      'Initial Contact Details and Notes': data.initialContactNotes,
      'Payment Method': data.paymentMethod,
      'Bank Name': data.bankName,
      'Account Name': data.accountName,
      'Account Number': data.accountNumber,
      'Certified by the MOE?': data.moeCertified,
      Status: 'Low Risk',
      'Private or APBET': 'Private',
    };

    this.logger.log(
      `Received request to add borrower: ${JSON.stringify(createBorrowerDto)}`,
    );
    try {
      const result = await this.sheetsService.addBorrower(createBorrowerDto);

      this.logger.log(`Borrower added successfully via Google Sheets`);
      return { success: true, data: result };
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
      const borrower = await this.sheetsService.findBorrowerByName(name);
      const duration = Date.now() - startTime;

      return {
        success: true,
        found: !!borrower,
        data: borrower,
        duration_ms: duration,
        source: 'sheets',
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
      const borrower = await this.sheetsService.findBorrowerById(rowId);
      if (!borrower) {
        return { success: false, error: 'Borrower not found' };
      }

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

      const borrowerWithLinks = { ...borrower };

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

  @Put(':rowId')
  async updateBorrower(
    @Param('rowId') rowId: string,
    @Body() requestData: any,
  ) {
    this.logger.log(`Updating borrower with ID: ${rowId}`);
    if (!rowId) {
      return { success: false, error: 'Row ID parameter is required' };
    }

    try {
      // First verify the borrower exists
      const existingBorrower = await this.sheetsService.findBorrowerById(rowId);
      if (!existingBorrower) {
        return { success: false, error: 'Borrower not found' };
      }

      // Map request fields to sheet column names
      const updateData = {
        'SSL ID': requestData.sslId,
        'Customer Type': 'School',
        Type: requestData.type,
        Name: requestData.name,
        'Location Description': requestData.locationDescription,
        'Location Pin': requestData.locationPin,
        'Year Founded': requestData.yearFounded,
        'Private or APBET': requestData.schoolCategory,
        'Primary Phone for Borrower': requestData.primaryPhone,
        County: requestData.county,
        'How did the borrower hear about Jackfruit?': requestData.howHeard,
        'KRA PIN Number': requestData.kraPinNumber,
        'Society, CBO, or Corporation': requestData.entityType,
        'Registration Number of CBO, Society, or Corporation':
          requestData.registrationNumber,
        'Certified by the MOE?': requestData.moeCertified,
        'Products Requested': requestData.productsRequested,
        'Initial Contact Details and Notes': requestData.initialContactNotes,
        Notes: requestData.notes,
        'Payment Method': requestData.paymentMethod,
        'Bank Name': requestData.bankName,
        'Account Name': requestData.accountName,
        'Account Number': requestData.accountNumber,
        Status: requestData.creditRisk,
      };

      // Update the borrower record
      const updatedBorrower = await this.sheetsService.updateBorrower(
        rowId,
        updateData,
      );

      return {
        success: true,
        message: 'Borrower updated successfully',
        data: updatedBorrower,
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

  // --- More endpoints can be added ---
}

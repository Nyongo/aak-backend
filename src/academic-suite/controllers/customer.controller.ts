import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  Logger,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../dto/create-customer.dto';
import { CustomerDbService } from '../services/customer-db.service';
import { FileUploadService } from '../../jf/services/file-upload.service';
import { GoogleDriveService } from '../../jf/services/google-drive.service';

interface ApiError {
  message: string;
  code?: number;
  status?: string;
}

@Controller('academic-suite/customers')
export class CustomerController {
  private readonly logger = new Logger(CustomerController.name);
  private readonly GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_ID =
    process.env.GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_ID;
  private readonly GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_NAME;

  constructor(
    private readonly customerDbService: CustomerDbService,
    private readonly fileUploadService: FileUploadService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('companyLogo'))
  async createCustomer(
    @Body() createDto: CreateCustomerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Creating new customer: ${createDto.companyName}`);

      // Check if customer with email already exists
      const existingCustomer = await this.customerDbService.findByEmail(
        createDto.emailAddress,
      );
      if (existingCustomer) {
        return {
          success: false,
          error: 'Customer with this email address already exists',
        };
      }

      // Handle company logo upload
      let companyLogoPath = '';
      if (file) {
        // Validate file type and size
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.mimetype)) {
          return {
            success: false,
            error:
              'Invalid file type. Only PNG, JPG, and JPEG files are allowed.',
          };
        }

        if (file.size > maxSize) {
          return {
            success: false,
            error: 'File size too large. Maximum size is 5MB.',
          };
        }

        const customName = `customer_logo_${createDto.companyName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        companyLogoPath = await this.fileUploadService.saveFile(
          file,
          'customer-logos',
          customName,
        );
        this.logger.log(`Company logo saved: ${companyLogoPath}`);
      }

      // Prepare customer data
      const customerData = {
        ...createDto,
        companyLogo: companyLogoPath,
      };

      const result = await this.customerDbService.create(customerData);
      this.logger.log(`Customer created successfully with ID: ${result.id}`);

      return {
        success: true,
        data: result,
        message: 'Customer created successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to create customer: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Get()
  async getAllCustomers(
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    try {
      this.logger.debug('Fetching all customers with pagination and search');

      const pageNum = Number(page) || 1;
      const pageSizeNum = Number(pageSize) || 10;

      let result;
      if (isActive !== undefined) {
        const activeStatus = isActive === 'true';
        result = await this.customerDbService.findByActiveStatus(
          activeStatus,
          pageNum,
          pageSizeNum,
        );
      } else if (search) {
        result = await this.customerDbService.search(
          search,
          pageNum,
          pageSizeNum,
        );
      } else {
        result = await this.customerDbService.findAll(pageNum, pageSizeNum);
      }

      // Add Google Drive links for company logos
      const customersWithLinks = await Promise.all(
        result.data.map(async (customer) => {
          const customerWithLinks = { ...customer };
          if (customer.companyLogo) {
            const filename = customer.companyLogo.split('/').pop();
            const fileLink = await this.googleDriveService.getFileLink(
              filename,
              this.GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_ID,
            );
            customerWithLinks.companyLogo = fileLink;
          }
          return customerWithLinks;
        }),
      );

      return {
        success: true,
        count: customersWithLinks.length,
        data: customersWithLinks,
        pagination: result.pagination,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching customers: ${apiError.message}`);
      throw error;
    }
  }

  @Get('statistics')
  async getCustomerStatistics() {
    try {
      this.logger.debug('Fetching customer statistics');
      const statistics = await this.customerDbService.getStatistics();
      return {
        success: true,
        data: statistics,
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Error fetching customer statistics: ${apiError.message}`,
      );
      throw error;
    }
  }

  @Get(':id')
  async getCustomerById(@Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.log(`Fetching customer with ID: ${id}`);
      const customer = await this.customerDbService.findById(id);

      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }

      // Add Google Drive link for company logo
      const customerWithLinks = { ...customer };
      if (customer.companyLogo) {
        const filename = customer.companyLogo.split('/').pop();
        const fileLink = await this.googleDriveService.getFileLink(
          filename,
          this.GOOGLE_DRIVE_CUSTOMER_LOGOS_FOLDER_ID,
        );
        customerWithLinks.companyLogo = fileLink;
      }

      return { success: true, data: customerWithLinks };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Error fetching customer ${id}: ${apiError.message}`);
      throw error;
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('companyLogo'))
  async updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateCustomerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Updating customer with ID: ${id}`);

      // Check if customer exists
      const existingCustomer = await this.customerDbService.findById(id);
      if (!existingCustomer) {
        return { success: false, error: 'Customer not found' };
      }

      // Disallow email updates - emailAddress is not part of UpdateCustomerDto
      // This is handled by the DTO validation which excludes emailAddress

      // Handle company logo upload
      let companyLogoPath = existingCustomer.companyLogo || '';
      if (file) {
        // Validate file type and size
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.mimetype)) {
          return {
            success: false,
            error:
              'Invalid file type. Only PNG, JPG, and JPEG files are allowed.',
          };
        }

        if (file.size > maxSize) {
          return {
            success: false,
            error: 'File size too large. Maximum size is 5MB.',
          };
        }

        const customName =
          `customer_logo_${updateDto.companyName || existingCustomer.companyName}`.replace(
            /[^a-zA-Z0-9]/g,
            '_',
          );
        companyLogoPath = await this.fileUploadService.saveFile(
          file,
          'customer-logos',
          customName,
        );
        this.logger.log(`Company logo updated: ${companyLogoPath}`);
      }

      // Prepare update data
      const updateData = {
        ...updateDto,
        companyLogo: companyLogoPath,
      };

      const result = await this.customerDbService.update(id, updateData);
      this.logger.log(`Customer updated successfully: ${result.id}`);

      return {
        success: true,
        data: result,
        message: 'Customer updated successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to update customer: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id/active-status')
  async updateCustomerActiveStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    try {
      this.logger.log(
        `Updating customer active status for ID: ${id} to ${isActive}`,
      );

      const result = await this.customerDbService.updateActiveStatus(
        id,
        isActive,
      );
      this.logger.log(
        `Customer active status updated successfully: ${result.id}`,
      );

      return {
        success: true,
        data: result,
        message: 'Customer active status updated successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(
        `Failed to update customer active status: ${apiError.message}`,
      );
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Put(':id/schools')
  async updateSchoolCount(
    @Param('id', ParseIntPipe) id: number,
    @Body('numberOfSchools') numberOfSchools: number,
  ) {
    try {
      this.logger.log(
        `Updating school count for customer ID: ${id} to ${numberOfSchools}`,
      );

      if (numberOfSchools < 0 || numberOfSchools > 10000) {
        return {
          success: false,
          error: 'Number of schools must be between 0 and 10000',
        };
      }

      const result = await this.customerDbService.updateSchoolCount(
        id,
        numberOfSchools,
      );
      this.logger.log(`School count updated successfully: ${result.id}`);

      return {
        success: true,
        data: result,
        message: 'School count updated successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to update school count: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }

  @Delete(':id')
  async deleteCustomer(@Param('id', ParseIntPipe) id: number) {
    try {
      this.logger.log(`Deleting customer with ID: ${id}`);

      const result = await this.customerDbService.delete(id);
      this.logger.log(`Customer deleted successfully: ${result.id}`);

      return {
        success: true,
        data: result,
        message: 'Customer deleted successfully',
      };
    } catch (error: unknown) {
      const apiError = error as ApiError;
      this.logger.error(`Failed to delete customer: ${apiError.message}`);
      return {
        success: false,
        error: apiError.message || 'An unknown error occurred',
      };
    }
  }
}

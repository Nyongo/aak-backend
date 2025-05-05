import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AppSheetService } from '../services/appsheet.service';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { SheetsService } from '../services/sheets.service';
import { GoogleDriveService } from '../services/google-drive.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('jf/appsheet')
export class AppSheetController {
  private readonly logger = new Logger(AppSheetController.name);

  constructor(
    private readonly appSheetService: AppSheetService,
    private readonly sheetsService: SheetsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  @Get('test-teachers')
  async testTeachers() {
    try {
      console.log('Starting teachers test...');
      const data = await this.appSheetService.getTableData('Teachers');
      console.log('Raw teachers data:', data);

      return {
        success: true,
        message: 'Teachers data fetched',
        data: data,
        count: Array.isArray(data) ? data.length : 0,
      };
    } catch (error: any) {
      console.error('Error in test-teachers:', error);
      return {
        success: false,
        message: 'Failed to fetch teachers data',
        error: error?.message || 'Unknown error occurred',
        details: error?.response?.data || 'No additional details',
      };
    }
  }

  @Get('test')
  async test() {
    try {
      const data = await this.appSheetService.getTableData('Teachers');
      return {
        success: true,
        message: 'Successfully connected to AppSheet',
        data: data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to connect to AppSheet',
        error: error?.message || 'Unknown error occurred',
      };
    }
  }

  @Get('schools')
  async getSchools() {
    return this.appSheetService.getBorrowers();
  }

  @Get('teachers')
  async getTeachers() {
    return this.appSheetService.getTeachers();
  }

  @Get('users')
  async getUsers() {
    try {
      const users = await this.sheetsService.getSheetData('Users');
      if (!users || users.length === 0) {
        return { success: true, count: 0, data: [] };
      }

      const headers = users[0];

      const filteredData = users
        .slice(1)
        //  .filter((row) => row[applicationIdIndex] === creditApplicationId)
        .map((row) => {
          const user = {};
          headers.forEach((header, index) => {
            user[header] = row[index];
          });
          return user;
        });

      return {
        success: true,
        count: filteredData.length,
        data: filteredData,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch users',
        error: error?.message || 'Unknown error occurred',
      };
    }
  }

  @Get('users/:email')
  async getUserByEmail(@Param('email') email: string) {
    try {
      const users = await this.sheetsService.getSheetData('Users');
      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'No users found',
          data: null,
        };
      }

      const headers = users[0];
      const emailIndex = headers.findIndex((header) => header === 'Email');

      if (emailIndex === -1) {
        return {
          success: false,
          message: 'Email column not found in sheet',
          data: null,
        };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const userRow = users
        .slice(1)
        .find(
          (row) =>
            row[emailIndex] &&
            row[emailIndex].toLowerCase().trim() === normalizedEmail,
        );

      if (!userRow) {
        return {
          success: false,
          message: 'User not found',
          data: null,
        };
      }

      const user = {};
      headers.forEach((header, index) => {
        user[header] = userRow[index];
      });

      return {
        success: true,
        message: 'User fetched successfully',
        data: user,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch user',
        error: error?.message || 'Unknown error occurred',
      };
    }
  }

  @Get('users/type/:type')
  async getUsersByType(@Param('type') type: string) {
    try {
      const users = await this.sheetsService.getSheetData('Users');
      const filteredUsers = users.filter((u) => u.Type === type);

      return {
        success: true,
        message: `Users of type '${type}' fetched successfully`,
        data: filteredUsers,
        count: filteredUsers.length,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch users by type',
        error: error?.message || 'Unknown error occurred',
      };
    }
  }

  @Get(':tableName')
  async getTableData(
    @Param('tableName') tableName: string,
    @Query('columns') columns?: string,
  ) {
    return this.appSheetService.getTableData(tableName);
  }

  @Get('tables')
  async listTables() {
    try {
      const tables = await this.appSheetService.listTables();
      return {
        success: true,
        message: 'Tables fetched successfully',
        data: tables,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch tables',
        error: error?.message || 'Unknown error occurred',
      };
    }
  }

  @Get('schema')
  async getTableSchema(@Query('tableName') tableName: string) {
    try {
      const schema = await this.appSheetService.getTableSchema(tableName);
      return {
        success: true,
        message: 'Table schema fetched successfully',
        data: schema,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch table schema',
        error: error?.message || 'Unknown error occurred',
        details: error?.response?.data || 'No additional details',
      };
    }
  }

  @Get('sample')
  async getTableSample(@Query('tableName') tableName: string) {
    try {
      const sample = await this.appSheetService.getTableSample(tableName);
      return {
        success: true,
        message: 'Table sample fetched successfully',
        data: sample,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to fetch table sample',
        error: error?.message || 'Unknown error occurred',
        details: error?.response?.data || 'No additional details',
      };
    }
  }

  @Get('test-table')
  async testTableAccess(@Query('tableName') tableName: string) {
    try {
      const result = await this.appSheetService.testTableAccess(tableName);
      return {
        success: true,
        message: 'Table access test completed',
        data: result,
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to test table access',
        error: error?.message || 'Unknown error occurred',
        details: error?.response?.data || 'No additional details',
      };
    }
  }

  @Get('test-connection')
  async testApiConnection() {
    const result = await this.appSheetService.testApiConnection();
    return result;
  }

  @Get('test-fetch')
  async testFetchTeachers() {
    this.logger.log('=== Testing Teacher Fetching ===');
    let allTeachersResult: any = { status: 'skipped' };
    let findByNameResult: any = { status: 'skipped' };

    try {
      this.logger.log('Attempting to fetch ALL teachers (no filter)...');
      const allTeachers = await this.appSheetService.getTeachers(); // No filter
      allTeachersResult = {
        status: 'success',
        count: allTeachers.length,
        data: allTeachers.slice(0, 5), // Log first 5 records
      };
      this.logger.log(`Fetched ${allTeachers.length} total teachers.`);
    } catch (error) {
      this.logger.error(
        'Error fetching all teachers:',
        error instanceof Error ? error.stack : error,
      );
      allTeachersResult = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    try {
      const specificName = 'New Teacher'; // The name of the teacher we added
      this.logger.log(`Attempting to find teacher by name: ${specificName}...`);
      const foundTeacher =
        await this.appSheetService.findTeacherByName(specificName);
      findByNameResult = {
        status: 'success',
        found: !!foundTeacher,
        data: foundTeacher,
      };
      this.logger.log(
        `Find teacher by name result: ${foundTeacher ? 'Found' : 'Not Found'}`,
      );
    } catch (error) {
      this.logger.error(
        `Error finding teacher by name (${'New Teacher'}):`,
        error instanceof Error ? error.stack : error,
      );
      findByNameResult = {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    return {
      testResults: {
        fetchAll: allTeachersResult,
        findSpecific: findByNameResult,
      },
    };
  }

  @Post('teachers')
  async addTeacher(@Body() createTeacherDto: CreateTeacherDto) {
    this.logger.log(
      `Received request to add teacher: ${JSON.stringify(createTeacherDto)}`,
    );
    try {
      const result = await this.appSheetService.addTeacher(createTeacherDto);
      this.logger.log('Teacher added successfully via AppSheet API');
      return { success: true, data: result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error adding teacher';
      this.logger.error(`Failed to add teacher: ${errorMessage}`);
      // Consider returning a more specific HTTP error code (e.g., using HttpException)
      return { success: false, error: errorMessage };
    }
  }

  @Post('users/upload/:email')
  @UseInterceptors(FileInterceptor('file'))
  async uploadUserFile(
    @Param('email') email: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      const users = await this.sheetsService.getSheetData('Users');
      if (!users || users.length === 0) {
        return {
          success: false,
          message: 'No users found',
          data: null,
        };
      }

      const headers = users[0];
      const emailIndex = headers.findIndex((header) => header === 'Email');

      if (emailIndex === -1) {
        return {
          success: false,
          message: 'Email column not found in sheet',
          data: null,
        };
      }

      const normalizedEmail = email.toLowerCase().trim();
      const userRow = users
        .slice(1)
        .find(
          (row) =>
            row[emailIndex] &&
            row[emailIndex].toLowerCase().trim() === normalizedEmail,
        );

      if (!userRow) {
        return {
          success: false,
          message: 'User not found',
          data: null,
        };
      }

      // Upload file to users folder
      const fileUrl = await this.googleDriveService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        process.env.GOOGLE_DRIVE_USERS_FOLDER_ID,
      );

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          fileUrl,
          email,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to upload file',
        error: error?.message || 'Unknown error occurred',
      };
    }
  }
}

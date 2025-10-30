import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Logger,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateStudentDto, UpdateStudentDto } from '../dto/create-student.dto';
import { StudentDbService } from '../services/student-db.service';
import { FileUploadService } from '../../jf/services/file-upload.service';

@Controller('academic-suite/students')
export class StudentController {
  private readonly logger = new Logger(StudentController.name);

  constructor(
    private readonly studentDb: StudentDbService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo'))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async create(
    @Body() dto: CreateStudentDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    try {
      this.logger.log(`Creating new student: ${dto.name}`);
      if (photo) {
        const photoPath = await this.fileUploadService.saveFile(
          photo,
          'students',
          `student_${Date.now()}`,
        );
        dto.photo = photoPath;
      }
      const created = await this.studentDb.create(dto);
      return { success: true, data: created };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create student',
      };
    }
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('schoolId') schoolId?: string,
    @Query('parentId') parentId?: string,
  ) {
    try {
      const result = await this.studentDb.findAll(
        Number(page) || 1,
        Number(pageSize) || 10,
        schoolId,
        parentId,
      );
      return { success: true, data: result.data, pagination: result.pagination };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch students' };
    }
  }

  @Get('statistics')
  async statistics() {
    try {
      const data = await this.studentDb.getStatistics();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch statistics' };
    }
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    try {
      const student = await this.studentDb.findById(id);
      if (!student) return { success: false, message: 'Student not found' };
      return { success: true, data: student };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch student' };
    }
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    try {
      const existing = await this.studentDb.findById(id);
      if (!existing) return { success: false, error: 'Student not found' };
      const updated = await this.studentDb.update(id, dto);
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update student' };
    }
  }

  @Put(':id/photo')
  @UseInterceptors(FileInterceptor('photo'))
  async updatePhoto(@Param('id') id: string, @UploadedFile() photo?: Express.Multer.File) {
    try {
      const existing = await this.studentDb.findById(id);
      if (!existing) return { success: false, error: 'Student not found' };
      if (!photo) return { success: false, error: 'No photo provided' };
      const photoPath = await this.fileUploadService.saveFile(photo, 'students', `student_${Date.now()}`);
      const updated = await this.studentDb.update(id, { photo: photoPath });
      return { success: true, data: updated };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to update photo' };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const existing = await this.studentDb.findById(id);
      if (!existing) return { success: false, error: 'Student not found' };
      const deleted = await this.studentDb.delete(id);
      return { success: true, data: deleted };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to delete student' };
    }
  }
}

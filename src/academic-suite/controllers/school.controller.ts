import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSchoolDto, UpdateSchoolDto } from '../dto/create-school.dto';
import { SchoolDbService } from '../services/school-db.service';
import { FileUploadService } from '../../jf/services/file-upload.service';

@Controller('academic-suite/schools')
export class SchoolController {
  constructor(
    private readonly schoolDb: SchoolDbService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() dto: CreateSchoolDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let logoPath: string = null;
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024;
      if (!allowedTypes.includes(file.mimetype)) {
        return { success: false, error: 'Invalid file type.' };
      }
      if (file.size > maxSize) {
        return { success: false, error: 'File too large (max 5MB).' };
      }
      const customName = `school_logo_${dto.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
      logoPath = await this.fileUploadService.saveFile(
        file,
        'school-logos',
        customName,
      );
    }

    const created = await this.schoolDb.create({ ...dto, logo: logoPath });
    const data = {
      ...created,
      logo: created.logo
        ? this.fileUploadService.getFileUrl(created.logo)
        : null,
    };
    return { success: true, data };
  }

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('customerId') customerId?: string,
  ) {
    const p = Number(page) || 1;
    const ps = Number(pageSize) || 10;
    const cid = customerId ? Number(customerId) : undefined;
    const result = await this.schoolDb.findAll(p, ps, cid);
    const data = result.data.map((s: any) => ({
      ...s,
      logo: s.logo ? this.fileUploadService.getFileUrl(s.logo) : null,
    }));
    return { success: true, data, pagination: result.pagination };
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const school = await this.schoolDb.findById(id);
    if (!school) return { success: false, message: 'School not found' };
    const data = {
      ...school,
      logo: school.logo ? this.fileUploadService.getFileUrl(school.logo) : null,
    };
    return { success: true, data };
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSchoolDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let logoPath: string = undefined;
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const maxSize = 5 * 1024 * 1024;
      if (!allowedTypes.includes(file.mimetype)) {
        return { success: false, error: 'Invalid file type.' };
      }
      if (file.size > maxSize) {
        return { success: false, error: 'File too large (max 5MB).' };
      }
      const customName = `school_logo_${(dto.name || 'school').replace(/[^a-zA-Z0-9]/g, '_')}`;
      logoPath = await this.fileUploadService.saveFile(
        file,
        'school-logos',
        customName,
      );
    }

    const updated = await this.schoolDb.update(id, {
      ...dto,
      ...(logoPath ? { logo: logoPath } : {}),
    });
    const data = {
      ...updated,
      logo: updated.logo
        ? this.fileUploadService.getFileUrl(updated.logo)
        : null,
    };
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const deleted = await this.schoolDb.delete(id);
    return { success: true, data: deleted };
  }
}

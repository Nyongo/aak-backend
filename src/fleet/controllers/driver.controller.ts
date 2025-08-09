import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { DriverService } from '../services/driver.service';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { CreateDriverFormDto } from '../dtos/create-driver-form.dto';

@Controller('fleet/drivers')
//@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Post()
  @HttpCode(200)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idPhoto', maxCount: 1 },
      { name: 'driverLicensePhoto', maxCount: 1 },
      { name: 'psvLicenseDoc', maxCount: 1 },
      { name: 'passportPhoto', maxCount: 1 },
    ]),
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  //@Permissions('can_create_driver')
  async createWithFiles(
    @Body() data: CreateDriverFormDto,
    @UploadedFiles()
    files: {
      idPhoto?: Express.Multer.File[];
      driverLicensePhoto?: Express.Multer.File[];
      psvLicenseDoc?: Express.Multer.File[];
      passportPhoto?: Express.Multer.File[];
    },
  ) {
    return this.driverService.createWithFiles(data, files);
  }

  @Get()
  //  @Permissions('can_view_drivers')
  async findAll() {
    return this.driverService.findAll();
  }

  @Get(':id')
  // @Permissions('can_view_drivers')
  async findOne(@Param('id') id: string) {
    return this.driverService.findOne(Number(id));
  }

  @Put(':id')
  // @Permissions('can_update_driver')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.driverService.update(Number(id), data);
  }

  @Delete(':id')
  // @Permissions('can_delete_driver')
  async delete(@Param('id') id: string) {
    return this.driverService.delete(Number(id));
  }
}

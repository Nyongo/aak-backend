import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateDriverDto } from '../dtos/create-driver.dto';
import { CreateDriverFormDto } from '../dtos/create-driver-form.dto';
import { FileUploadService } from './file-upload.service';

@Injectable()
export class DriverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  async create(createDto: CreateDriverDto) {
    try {
      const driver = await this.prisma.driver.create({
        data: {
          firstName: createDto.firstName,
          middleName: createDto.middleName,
          lastName: createDto.lastName,
          email: createDto.email,
          phoneNumber: createDto.phoneNumber,
          nationalId: createDto.nationalId,
          gender: createDto.gender,
          licenseNumber: createDto.licenseNumber,
          licenseExpiry: new Date(createDto.licenseExpiry),
          dateOfBirth: createDto.dateOfBirth
            ? new Date(createDto.dateOfBirth)
            : null,
          address: createDto.address,
          emergencyContact: createDto.emergencyContact,
          emergencyPhone: createDto.emergencyPhone,
          idPhoto: createDto.idPhoto,
          driverLicensePhoto: createDto.driverLicensePhoto,
          psvLicenseDoc: createDto.psvLicenseDoc,
          passportPhoto: createDto.passportPhoto,
          isActive: createDto.isActive ?? true,
          notes: createDto.notes,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Driver created successfully.',
        driver,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll() {
    try {
      const drivers = await this.prisma.driver.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Drivers fetched successfully.',
        drivers,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(id: number) {
    try {
      const driver = await this.prisma.driver.findUnique({
        where: { id },
      });

      if (!driver) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Driver not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Driver fetched successfully.',
        driver,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(id: number, updateDto: any) {
    try {
      const driver = await this.prisma.driver.update({
        where: { id },
        data: updateDto,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Driver updated successfully.',
        driver,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(id: number) {
    try {
      await this.prisma.driver.delete({
        where: { id },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Driver deleted successfully.',
        null,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async createWithFiles(
    createDto: CreateDriverFormDto,
    files: {
      idPhoto?: Express.Multer.File[];
      driverLicensePhoto?: Express.Multer.File[];
      psvLicenseDoc?: Express.Multer.File[];
      passportPhoto?: Express.Multer.File[];
    },
  ) {
    try {
      // Save uploaded files
      const filePaths = {};

      if (files.idPhoto?.[0]) {
        filePaths['idPhoto'] = await this.fileUploadService.saveFile(
          files.idPhoto[0],
          'drivers/id_photos',
        );
      }

      if (files.driverLicensePhoto?.[0]) {
        filePaths['driverLicensePhoto'] = await this.fileUploadService.saveFile(
          files.driverLicensePhoto[0],
          'drivers/licenses',
        );
      }

      if (files.psvLicenseDoc?.[0]) {
        filePaths['psvLicenseDoc'] = await this.fileUploadService.saveFile(
          files.psvLicenseDoc[0],
          'drivers/psv',
        );
      }

      if (files.passportPhoto?.[0]) {
        filePaths['passportPhoto'] = await this.fileUploadService.saveFile(
          files.passportPhoto[0],
          'drivers/passports',
        );
      }

      // Create driver with file paths
      const driver = await this.prisma.driver.create({
        data: {
          firstName: createDto.firstName,
          middleName: createDto.middleName,
          lastName: createDto.lastName,
          email: createDto.email,
          phoneNumber: createDto.phoneNumber,
          nationalId: createDto.nationalId,
          gender: createDto.gender,
          licenseNumber: createDto.licenseNumber,
          licenseExpiry: new Date(createDto.licenseExpiry),
          dateOfBirth: createDto.dateOfBirth
            ? new Date(createDto.dateOfBirth)
            : null,
          address: createDto.address,
          emergencyContact: createDto.emergencyContact,
          emergencyPhone: createDto.emergencyPhone,
          idPhoto: filePaths['idPhoto'],
          driverLicensePhoto: filePaths['driverLicensePhoto'],
          psvLicenseDoc: filePaths['psvLicenseDoc'],
          passportPhoto: filePaths['passportPhoto'],
          isActive: createDto.isActive ?? true,
          notes: createDto.notes,
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Driver created successfully with files.',
        driver,
      );
    } catch (error) {
      // Clean up uploaded files if driver creation fails
      if (files.idPhoto?.[0])
        await this.fileUploadService.deleteFile(files.idPhoto[0].path);
      if (files.driverLicensePhoto?.[0])
        await this.fileUploadService.deleteFile(
          files.driverLicensePhoto[0].path,
        );
      if (files.psvLicenseDoc?.[0])
        await this.fileUploadService.deleteFile(files.psvLicenseDoc[0].path);
      if (files.passportPhoto?.[0])
        await this.fileUploadService.deleteFile(files.passportPhoto[0].path);

      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}

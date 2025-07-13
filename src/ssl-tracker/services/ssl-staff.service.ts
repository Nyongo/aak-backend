import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from '../../common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { GoogleDriveService } from '../../jf/services/google-drive.service';

@Injectable()
export class SslStaffService {
  private readonly USERS_IMAGES_FOLDER_ID =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_ID;
  private readonly USERS_IMAGES_FOLDER_NAME =
    process.env.GOOGLE_DRIVE_USERS_IMAGES_FOLDER_NAME;

  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  async create(createDto: any, files?: any, createdById?: number) {
    try {
      // Handle file uploads
      let nationalIdFrontPath = '';
      if (files?.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const timestamp = new Date().getTime();
        const fileName = `national_id_front_${createDto.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        nationalIdFrontPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      let nationalIdBackPath = '';
      if (files?.nationalIdBack?.[0]) {
        const file = files.nationalIdBack[0];
        const timestamp = new Date().getTime();
        const fileName = `national_id_back_${createDto.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        nationalIdBackPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      let kraPinPhotoPath = '';
      if (files?.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const timestamp = new Date().getTime();
        const fileName = `kra_pin_photo_${createDto.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        kraPinPhotoPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      let passportPhotoPath = '';
      if (files?.passportPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const timestamp = new Date().getTime();
        const fileName = `passport_photo_${createDto.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        passportPhotoPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      const data = {
        id:
          createDto.id ||
          `SSL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: createDto.name,
        type: createDto.type,
        borrowerId: createDto.borrowerId,
        email: createDto.email,
        sslId: createDto.sslId,
        nationalIdNumber: createDto.nationalIdNumber,
        nationalIdFront: nationalIdFrontPath || null,
        nationalIdBack: nationalIdBackPath || null,
        kraPinNumber: createDto.kraPinNumber || null,
        kraPinPhoto: kraPinPhotoPath || null,
        phoneNumber: createDto.phoneNumber,
        status: createDto.status || 'Active',
        roleInSchool: createDto.roleInSchool,
        dateOfBirth: createDto.dateOfBirth,
        address: createDto.address,
        gender: createDto.gender,
        postalAddress: createDto.postalAddress || null,
        startDate: createDto.startDate,
        insuredForCreditLife: createDto.insuredForCreditLife || false,
        paymentThisMonth: createDto.paymentThisMonth || false,
        terminationDate: createDto.terminationDate || null,
        educationLevel: createDto.educationLevel || null,
        sslEmail: createDto.sslEmail || null,
        secondaryRole: createDto.secondaryRole || null,
        monthlyTarget: createDto.monthlyTarget || null,
        creditLifeHelper: createDto.creditLifeHelper || null,
        teamLeader: createDto.teamLeader || null,
        passportPhoto: passportPhotoPath || null,
        sslLevel: createDto.sslLevel || null,
        sslArea: createDto.sslArea || null,
        createdBy: {
          connect: { id: createdById || 1 },
        },
      };

      const newRecord = await this.prisma.sslStaff.create({
        data,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'SSL Staff record created successfully.',
        newRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sslId?: string,
    borrowerId?: string,
  ) {
    try {
      const where: any = {
        //    isActive: true,
        type: 'SSL', // Only return records where type is SSL
      };

      if (sslId) {
        where.sslId = sslId;
      }

      if (borrowerId) {
        where.borrowerId = borrowerId;
      }

      const data = await this.prisma.sslStaff.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'SSL Staff records fetched successfully.',
        {
          data,
          totalItems: data.length,
        },
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async findOne(id: string) {
    try {
      const record = await this.prisma.sslStaff.findUnique({
        where: { id },
      });

      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'SSL Staff record not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'SSL Staff record retrieved successfully.',
        record,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async update(
    id: string,
    updateDto: any,
    files?: any,
    lastUpdatedById?: number,
  ) {
    try {
      // Check if record exists
      const existingRecord = await this.prisma.sslStaff.findUnique({
        where: { id },
      });

      if (!existingRecord) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'SSL Staff record not found.',
          null,
        );
      }

      // Handle file uploads if provided
      let nationalIdFrontPath = existingRecord.nationalIdFront;
      if (files?.nationalIdFront?.[0]) {
        const file = files.nationalIdFront[0];
        const timestamp = new Date().getTime();
        const fileName = `national_id_front_${updateDto.borrowerId || existingRecord.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        nationalIdFrontPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      let nationalIdBackPath = existingRecord.nationalIdBack;
      if (files?.nationalIdBack?.[0]) {
        const file = files.nationalIdBack[0];
        const timestamp = new Date().getTime();
        const fileName = `national_id_back_${updateDto.borrowerId || existingRecord.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        nationalIdBackPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      let kraPinPhotoPath = existingRecord.kraPinPhoto;
      if (files?.kraPinPhoto?.[0]) {
        const file = files.kraPinPhoto[0];
        const timestamp = new Date().getTime();
        const fileName = `kra_pin_photo_${updateDto.borrowerId || existingRecord.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        kraPinPhotoPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      let passportPhotoPath = existingRecord.passportPhoto;
      if (files?.passportPhoto?.[0]) {
        const file = files.passportPhoto[0];
        const timestamp = new Date().getTime();
        const fileName = `passport_photo_${updateDto.borrowerId || existingRecord.borrowerId}_${timestamp}.${file.originalname.split('.').pop()}`;

        await this.googleDriveService.uploadFile(
          file.buffer,
          fileName,
          file.mimetype,
          this.USERS_IMAGES_FOLDER_ID,
        );
        passportPhotoPath = `${this.USERS_IMAGES_FOLDER_NAME}/${fileName}`;
      }

      const updateData: any = {
        ...updateDto,
        nationalIdFront: nationalIdFrontPath,
        nationalIdBack: nationalIdBackPath,
        kraPinPhoto: kraPinPhotoPath,
        passportPhoto: passportPhotoPath,
        lastUpdatedById: lastUpdatedById || 1,
      };

      // Remove undefined values
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      const updatedRecord = await this.prisma.sslStaff.update({
        where: { id },
        data: updateData,
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'SSL Staff record updated successfully.',
        updatedRecord,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }

  async delete(id: string) {
    try {
      const record = await this.prisma.sslStaff.findUnique({
        where: { id },
      });

      if (!record) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'SSL Staff record not found.',
          null,
        );
      }

      // Soft delete by setting isActive to false
      await this.prisma.sslStaff.update({
        where: { id },
        data: { isActive: false },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'SSL Staff record deleted successfully.',
        null,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}

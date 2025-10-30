import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto/create-address.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AddressDbService {
  private readonly logger = new Logger(AddressDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(addressData: CreateAddressDto) {
    this.logger.log(
      `Creating new address for parent: ${addressData.parentId}`,
    );

    // If this address is set as primary, unset any existing primary addresses for this parent
    if (addressData.isPrimary) {
      await this.prisma.parentAddress.updateMany({
        where: {
          parentId: addressData.parentId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    const address = await this.prisma.parentAddress.create({
      data: {
        id: uuidv4(),
        addressType: addressData.addressType,
        location: addressData.location,
        longitude: addressData.longitude,
        latitude: addressData.latitude,
        status: addressData.status,
        isPrimary: addressData.isPrimary,
        parentId: addressData.parentId,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    });
    this.logger.log(`Address created successfully with ID: ${address.id}`);
    return address;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    parentId?: string,
  ) {
    this.logger.debug(
      `Finding all addresses with pagination (page: ${page}, pageSize: ${pageSize}) and parentId: ${parentId}`,
    );
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (parentId) {
      where.parentId = parentId;
    }

    const [addresses, totalItems] = await Promise.all([
      this.prisma.parentAddress.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              phoneNumber: true,
            },
          },
        },
      }),
      this.prisma.parentAddress.count({ where }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: addresses,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    this.logger.debug(`Finding address by ID: ${id}`);
    return this.prisma.parentAddress.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async update(id: string, updateData: UpdateAddressDto) {
    this.logger.log(`Updating address with ID: ${id}`, updateData);

    // If this address is being set as primary, unset any existing primary addresses for this parent
    if (updateData.isPrimary) {
      const currentAddress = await this.prisma.parentAddress.findUnique({
        where: { id },
        select: { parentId: true },
      });

      if (currentAddress) {
        await this.prisma.parentAddress.updateMany({
          where: {
            parentId: currentAddress.parentId,
            isPrimary: true,
            id: { not: id },
          },
          data: {
            isPrimary: false,
          },
        });
      }
    }

    const address = await this.prisma.parentAddress.update({
      where: { id },
      data: {
        addressType: updateData.addressType,
        location: updateData.location,
        longitude: updateData.longitude,
        latitude: updateData.latitude,
        status: updateData.status,
        isPrimary: updateData.isPrimary,
        parentId: updateData.parentId,
        updatedAt: new Date(),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
          },
        },
      },
    });
    this.logger.log(`Address updated successfully: ${address.id}`);
    return address;
  }

  async delete(id: string) {
    this.logger.log(`Deleting address with ID: ${id}`);
    const address = await this.prisma.parentAddress.delete({
      where: { id },
    });
    this.logger.log(`Address deleted successfully: ${address.id}`);
    return address;
  }

  async getAddressStatistics() {
    this.logger.debug('Getting address statistics');

    const [total, primary, active] = await Promise.all([
      this.prisma.parentAddress.count(),
      this.prisma.parentAddress.count({ where: { isPrimary: true } }),
      this.prisma.parentAddress.count({ where: { status: 'Active' } }),
    ]);

    return {
      total,
      primary,
      active,
    };
  }
}



import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from '../dto/create-customer.dto';
import * as bcrypt from 'bcryptjs';
import { MailService } from '../../common/services/mail.service';

@Injectable()
export class CustomerDbService {
  private readonly logger = new Logger(CustomerDbService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Create a new customer
   */
  async create(customerData: CreateCustomerDto) {
    this.logger.log('Creating new customer:', {
      companyName: customerData.companyName,
      contactPerson: customerData.contactPerson,
      emailAddress: customerData.emailAddress,
    });

    // Generate a temporary password for the user account
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user account first
    const user = await this.prisma.user.create({
      data: {
        email: customerData.emailAddress,
        name: customerData.contactPerson,
        phoneNumber: customerData.phoneNumber,
        password: hashedPassword,
        roleId: null, // No role required for now
        requirePasswordReset: true,
        createdAt: new Date(),
        lastPasswordChangedOn: new Date(),
      },
    });

    this.logger.log(`User created successfully with ID: ${user.id}`);

    // Create customer and link to user
    const customer = await this.prisma.customer.create({
      data: {
        companyLogo: customerData.companyLogo || '',
        companyName: customerData.companyName,
        contactPerson: customerData.contactPerson,
        phoneNumber: customerData.phoneNumber,
        emailAddress: customerData.emailAddress,
        numberOfSchools: customerData.numberOfSchools || 0,
        isActive:
          customerData.isActive !== undefined ? customerData.isActive : true,
        userId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Customer created successfully with ID: ${customer.id}, linked to user ID: ${user.id}`,
    );

    // Send welcome email with temporary password
    try {
      await this.mailService.sendPasswordEmail(
        customerData.emailAddress,
        tempPassword,
      );
      this.logger.log(`Welcome email sent to ${customerData.emailAddress}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${customerData.emailAddress}:`,
        error,
      );
      // Don't fail the customer creation if email fails
    }

    return this.removeSensitiveFields(customer);
  }

  /**
   * Find customer by ID
   */
  async findById(id: number) {
    this.logger.debug(`Finding customer by ID: ${id}`);
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    return customer ? this.removeSensitiveFields(customer) : null;
  }

  /**
   * Find customer by email
   */
  async findByEmail(emailAddress: string) {
    this.logger.debug(`Finding customer by email: ${emailAddress}`);
    const customer = await this.prisma.customer.findUnique({
      where: { emailAddress },
    });
    return customer ? this.removeSensitiveFields(customer) : null;
  }

  /**
   * Find all customers with pagination
   */
  async findAll(page: number = 1, pageSize: number = 10) {
    this.logger.debug('Finding all customers with pagination');
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [customers, totalItems] = await Promise.all([
      this.prisma.customer.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: customers.map((c) => this.removeSensitiveFields(c)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Find customers by active status with pagination
   */
  async findByActiveStatus(
    isActive: boolean,
    page: number = 1,
    pageSize: number = 10,
  ) {
    this.logger.debug(
      `Finding customers by active status: ${isActive} with pagination`,
    );
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [customers, totalItems] = await Promise.all([
      this.prisma.customer.findMany({
        where: { isActive },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where: { isActive } }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: customers.map((c) => this.removeSensitiveFields(c)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Update customer by ID
   */
  async update(id: number, updateData: UpdateCustomerDto) {
    this.logger.log(`Updating customer with ID: ${id}`, updateData);

    // Get the existing customer to find the linked user
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Prepare customer update data
    const customerUpdateData = updateData;

    // Update customer
    const customer = await this.prisma.customer.update({
      where: { id },
      data: { ...customerUpdateData, updatedAt: new Date() },
    });

    // Update corresponding user fields if they exist
    const userUpdateData: any = {};
    if (updateData.contactPerson) {
      userUpdateData.name = updateData.contactPerson;
    }
    if (updateData.phoneNumber) {
      userUpdateData.phoneNumber = updateData.phoneNumber;
    }
    if (updateData.isActive !== undefined) {
      userUpdateData.isActive = updateData.isActive;
    }

    // Only update user if there are fields to update
    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.user.update({
        where: { id: existingCustomer.userId },
        data: userUpdateData,
      });
      this.logger.log(`Linked user updated for customer ID: ${id}`);
    }

    this.logger.log(`Customer updated successfully: ${customer.id}`);
    return this.removeSensitiveFields(customer);
  }

  /**
   * Update customer active status
   */
  async updateActiveStatus(id: number, isActive: boolean) {
    this.logger.log(
      `Updating customer active status for ID: ${id} to ${isActive}`,
    );

    // Get the existing customer to find the linked user
    const existingCustomer = await this.prisma.customer.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    // Update customer
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        isActive,
        updatedAt: new Date(),
      },
    });

    // Update corresponding user's isActive status
    if (existingCustomer.userId) {
      await this.prisma.user.update({
        where: { id: existingCustomer.userId },
        data: { isActive },
      });
      this.logger.log(
        `Linked user active status updated for customer ID: ${id}`,
      );
    }

    this.logger.log(
      `Customer active status updated successfully: ${customer.id}`,
    );
    return customer;
  }

  /**
   * Update number of schools
   */
  async updateSchoolCount(id: number, numberOfSchools: number) {
    this.logger.log(
      `Updating school count for customer ID: ${id} to ${numberOfSchools}`,
    );

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        numberOfSchools,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`School count updated successfully: ${customer.id}`);
    return customer;
  }

  /**
   * Delete customer by ID
   */
  async delete(id: number) {
    this.logger.log(`Deleting customer with ID: ${id}`);

    const customer = await this.prisma.customer.delete({
      where: { id },
    });

    this.logger.log(`Customer deleted successfully: ${customer.id}`);
    return this.removeSensitiveFields(customer);
  }

  /**
   * Search customers by company name or contact person with pagination
   */
  async search(searchTerm: string, page: number = 1, pageSize: number = 10) {
    this.logger.debug(
      `Searching customers with term: ${searchTerm} with pagination`,
    );
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const searchConditions = {
      OR: [
        { companyName: { contains: searchTerm, mode: 'insensitive' as const } },
        {
          contactPerson: { contains: searchTerm, mode: 'insensitive' as const },
        },
        {
          emailAddress: { contains: searchTerm, mode: 'insensitive' as const },
        },
      ],
    };

    const [customers, totalItems] = await Promise.all([
      this.prisma.customer.findMany({
        where: searchConditions,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where: searchConditions }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
      data: customers.map((c) => this.removeSensitiveFields(c)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  /**
   * Get customer statistics
   */
  async getStatistics() {
    this.logger.debug('Getting customer statistics');

    const [total, active, inactive] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { isActive: true } }),
      this.prisma.customer.count({ where: { isActive: false } }),
    ]);

    const totalSchools = await this.prisma.customer.aggregate({
      _sum: { numberOfSchools: true },
    });

    return {
      total,
      active,
      inactive,
      totalSchools: totalSchools._sum.numberOfSchools || 0,
    };
  }

  private removeSensitiveFields(customer: any) {
    const { password, ...rest } = customer || {};
    return rest;
  }
}

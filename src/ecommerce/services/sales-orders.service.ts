import { Injectable, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateSalesOrderDto } from '../dtos/create-sales-order.dto';

@Injectable()
export class SalesOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async create(createDto: CreateSalesOrderDto) {
    try {
      // Validate that all products exist and have sufficient stock
      const productIds = createDto.items.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.BAD_REQUEST,
          'One or more products not found.',
          null,
        );
      }

      // Check stock availability
      for (const item of createDto.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) continue;

        if (product.stock < item.quantity) {
          return this.commonFunctions.returnFormattedResponse(
            HttpStatus.BAD_REQUEST,
            `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
            null,
          );
        }
      }

      // Calculate total amount
      const totalAmount = createDto.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      // Create order with items in a transaction
      const order = await this.prisma.$transaction(async (tx) => {
        // Create the order
        const newOrder = await tx.salesOrder.create({
          data: {
            customerName: createDto.customerName,
            customerEmail: createDto.customerEmail,
            customerPhone: createDto.customerPhone,
            totalAmount,
            notes: createDto.notes,
            orderItems: {
              create: createDto.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.unitPrice * item.quantity,
              })),
            },
          },
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    supplier: true,
                    category: true,
                  },
                },
              },
            },
          },
        });

        // Update product stock
        for (const item of createDto.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }

        return newOrder;
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CREATED,
        'Sales order created successfully.',
        order,
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
      const orders = await this.prisma.salesOrder.findMany({
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  supplier: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Sales orders fetched successfully.',
        orders,
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
      const order = await this.prisma.salesOrder.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  supplier: true,
                  category: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        return this.commonFunctions.returnFormattedResponse(
          HttpStatus.NOT_FOUND,
          'Sales order not found.',
          null,
        );
      }

      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.OK,
        'Sales order retrieved successfully.',
        order,
      );
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        return this.commonFunctions.handlePrismaError(error);
      }
      return this.commonFunctions.handleUnknownError(error);
    }
  }
}


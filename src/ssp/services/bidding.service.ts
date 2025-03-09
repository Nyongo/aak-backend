import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBidDto } from '../dtos/create-bid.dto';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';

@Injectable()
export class BiddingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commonFunctions: CommonFunctionsService,
  ) {}

  async placeBid(sspId: number, createBidDto: CreateBidDto) {
    // 1️⃣ Check if the service request exists
    const serviceRequest = await this.prisma.serviceRequest.findUnique({
      where: { id: createBidDto.serviceRequestId },
    });

    console.log('Service Request', serviceRequest);

    if (!serviceRequest) {
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.BAD_REQUEST,
        'Service Request not found',
        {},
      );
    }

    // 2️⃣ Ensure the SSP hasn't already bid on this request
    const existingBid = await this.prisma.sspBidding.findFirst({
      where: {
        serviceRequestId: createBidDto.serviceRequestId,
        sspId: sspId,
      },
    });
    if (existingBid) {
      return this.commonFunctions.returnFormattedResponse(
        HttpStatus.CONFLICT,
        'You have already placed a bid',
        {},
      );
    }

    // 3️⃣ Place the bid
    const bid = await this.prisma.sspBidding.create({
      data: {
        serviceRequestId: createBidDto.serviceRequestId,
        sspId: sspId,
        scheduleId: createBidDto.scheduleId,
        farmerId: serviceRequest.farmerId,
      },
    });

    return this.commonFunctions.returnFormattedResponse(
      HttpStatus.OK,
      'Bid placed successfully',
      bid,
    );
  }
}

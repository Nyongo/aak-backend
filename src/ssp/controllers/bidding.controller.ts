import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { CreateBidDto } from '../dtos/create-bid.dto';
import { BiddingService } from '../services/bidding.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';

@Controller('bids')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BiddingController {
  constructor(private readonly biddingService: BiddingService) {}

  @Post()
  async placeBid(@Request() req, @Body() createBidDto: CreateBidDto) {
    const userId = req.user.sspUser.id; // ✅ Extracted from JWT
    return await this.biddingService.placeBid(userId, createBidDto);
  }
}

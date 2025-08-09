import { Controller, Get, UseGuards } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PermissionsGuard } from 'src/auth/permission.guard';
import { FleetService } from '../services/fleet.service';

@Controller('fleet')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('dashboard')
  @Permissions('can_view_fleet')
  async getDashboardStats() {
    return this.fleetService.getDashboardStats();
  }

  @Get('overview')
  @Permissions('can_view_fleet')
  async getFleetOverview() {
    return this.fleetService.getFleetOverview();
  }
}

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../common/decorators/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private commonFunctions: CommonFunctionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.get<string[]>(
      PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (!requiredPermissions) {
      return true; // No specific permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.roleId) {
      throw new HttpException(
        this.commonFunctions.returnFormattedResponse(
          403,
          'Forbidden resource',
          null,
        ),
        200,
      );
    }

    const userRole = await this.prisma.role.findUnique({
      where: { id: user.roleId },
      include: {
        permissions: {
          include: {
            permission: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!userRole) {
      throw new HttpException(
        this.commonFunctions.returnFormattedResponse(
          403,
          'Forbidden resource',
          null,
        ),
        403,
      );
    }

    const userPermissions = userRole.permissions.map(
      (rp) => rp.permission.name,
    );

    const hasPermission = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (hasPermission) {
      return true;
    }

    // Throw formatted forbidden error if permission check fails
    throw new HttpException(
      this.commonFunctions.returnFormattedResponse(
        403,
        'Forbidden resource',
        null,
      ),
      200,
    );
  }
}

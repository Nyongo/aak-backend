import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ── Email + password login (Postman / mobile) ─────────────────

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phoneNumber: true,
        roleId: true,
        password: true,
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
    };
  }

  async login(user: any) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoggedInOn: new Date() },
    });

    return {
      access_token: this.jwtService.sign({
        email: user.email,
        sub: user.id,
        role: user.role,
        roleId: user.roleId,
        accountType: 'user', // marks this as a User table record
      }),
    };
  }

  // ── CRM Google OAuth token exchange ───────────────────────────
  // Issues a NestJS JWT tagged with accountType so jwt.strategy.ts
  // knows which table to validate against on each request.

  async loginByEmail(email: string): Promise<string | null> {
    // 1. Try the User table first (Int id, has roleId/role)
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        roleId: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoggedInOn: new Date() },
      });

      return this.jwtService.sign({
        email: user.email,
        sub: user.id,        // Int — User table PK
        role: user.role,
        roleId: user.roleId,
        accountType: 'user', // jwt.strategy will query User table
      });
    }

    // 2. Fall back to SslStaff (String id, no roleId)
    const staff = await this.prisma.sslStaff.findFirst({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (staff) {
      return this.jwtService.sign({
        email: staff.email,
        sub: staff.id,          // String — SslStaff PK
        role: null,
        roleId: null,
        accountType: 'staff',   // jwt.strategy will query SslStaff table
      });
    }

    return null;
  }

  // ── Logout ────────────────────────────────────────────────────

  async logout(userId: number) {
    return {
      message: 'Successfully logged out',
      timestamp: new Date().toISOString(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // ── SslStaff users (Google OAuth via CRM) ─────────────────
    // Their JWT has accountType: 'staff' and sub is a String (SslStaff PK).
    // We look them up in the sslStaff table — NOT the User table —
    // to avoid the "Expected Int, provided String" Prisma error.
    if (payload.accountType === 'staff') {
      const staff = await this.prisma.sslStaff.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      });

      if (!staff) return null;

      // Return a shape compatible with req.user across the app.
      // roleId and role are null for staff — guard endpoints that
      // require specific roles at the controller level if needed.
      return {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        roleId: null,
        role: null,
        accountType: 'staff',
      };
    }

    // ── Standard User table users (email/password or Google with User record) ──
    // sub is an Int here.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        roleId: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      accountType: 'user',
    };
  }
}

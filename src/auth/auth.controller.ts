import {
  Controller,
  Post,
  Body,
  HttpCode,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly configService: ConfigService,
  ) {}

  // ── Standard email/password login (Postman / mobile) ─────────

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto) {
    console.log('Heeeere');
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      return this.commonFunctions.returnFormattedResponse(
        401,
        'Invalid Credentials',
        { error: 'Wrong Username or Password' },
      );
    }
    const token = await this.authService.login(user);
    return this.commonFunctions.returnFormattedResponse(
      200,
      'Succesfully logged in',
      { ...user, token: token.access_token },
    );
  }

  // ── CRM Google OAuth token exchange ───────────────────────────
  // Called server-side from NextAuth's signIn callback.
  // Accepts the user's email + a shared internal secret (never
  // the user's password).  Returns a NestJS JWT that the CRM
  // stores in the session and sends as Bearer on every protected
  // API call.
  //
  // Security: this endpoint is only meant to be called from
  // the CRM backend (NextAuth runs server-side).  The shared
  // secret prevents random callers from issuing tokens for
  // arbitrary emails.
  //
  // Add to your .env:
  //   CRM_INTERNAL_SECRET=some-long-random-string

  @Post('crm-token')
  @HttpCode(200)
  async crmToken(
    @Body() body: { email: string; internalSecret: string },
  ) {
    const expectedSecret =
      this.configService.get<string>('CRM_INTERNAL_SECRET');

    if (!expectedSecret || body.internalSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    const accessToken = await this.authService.loginByEmail(body.email);

    if (!accessToken) {
      throw new UnauthorizedException('User not found');
    }

    return this.commonFunctions.returnFormattedResponse(
      200,
      'Token issued',
      { access_token: accessToken },
    );
  }

  // ── Logout ────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Request() req) {
    try {
      const result = await this.authService.logout(req.user.id);
      return this.commonFunctions.returnFormattedResponse(
        200,
        'Successfully logged out',
        result,
      );
    } catch (error) {
      return this.commonFunctions.returnFormattedResponse(
        500,
        'Logout failed',
        { error: 'An error occurred during logout' },
      );
    }
  }

  // ── Test endpoint ─────────────────────────────────────────────

  @Get('test')
  @UseGuards(JwtAuthGuard)
  async testJwtAuth(@Request() req) {
    console.log('Request User in AuthController:', req.user);
    return {
      message: 'JWT Authentication works!',
      secret: this.configService.get<string>('JWT_SECRET'),
    };
  }
}

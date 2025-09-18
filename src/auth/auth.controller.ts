import {
  Controller,
  Post,
  Body,
  HttpCode,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login';
import { CommonFunctionsService } from 'src/common/services/common-functions.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { ConfigService } from '@nestjs/config';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly commonFunctions: CommonFunctionsService,
    private readonly configService: ConfigService,
  ) {}

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
    } else {
      const token = await this.authService.login(user);
      return this.commonFunctions.returnFormattedResponse(
        200,
        'Succesfully logged in',
        { ...user, token: token.access_token },
      );
    }
  }

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

  @Get('test')
  @UseGuards(JwtAuthGuard)
  @Permissions('can_create_pesticide')
  async testJwtAuth(@Request() req) {
    console.log('Request User in AuthController:', req.user); // This should log if JwtAuthGuard runs
    return {
      message: 'JWT Authentication works!',
      secret: this.configService.get<string>('JWT_SECRET'),
    };
  }
}

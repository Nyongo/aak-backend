import { Controller, Get, Query } from '@nestjs/common';
import { GoogleAuthService } from '../services/google-auth.service';

@Controller('google-auth')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get('login')
  login() {
    const authUrl = this.googleAuthService.getAuthUrl();
    return { authUrl }; // Send the auth URL for the user to visit
  }

  @Get('callback')
  async callback(@Query('code') code: string) {
    const tokens = await this.googleAuthService.getTokens(code);
    return tokens; // Here you would store the tokens in session or a database
  }
}

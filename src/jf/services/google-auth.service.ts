import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library'; // Corrected import

@Injectable()
export class GoogleAuthService {
  private oAuth2Client: OAuth2Client;

  constructor() {
    this.oAuth2Client = new google.auth.OAuth2( // Updated to use google.auth.OAuth2
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI, // Ensure this matches the redirect URI in the Google Cloud Console
    );
  }

  // Generate the authentication URL
  getAuthUrl(): string {
    const scopes = ['https://www.googleapis.com/auth/drive.readonly']; // read-only access to Drive
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });
  }

  // Exchange the authorization code for an access token
  async getTokens(code: string) {
    const { tokens } = await this.oAuth2Client.getToken(code);
    this.oAuth2Client.setCredentials(tokens);
    return tokens;
  }

  // Get the authorized OAuth2 client
  getOAuthClient() {
    return this.oAuth2Client;
  }
}

import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import * as path from 'path';

@Injectable()
export class GoogleAuthService {
  private auth: GoogleAuth;

  constructor() {
    const keyPath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      path.join(process.cwd(), 'keys', 'service-account.json');

    this.auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/spreadsheets.readonly',
      ],
    });
  }

  getAuth() {
    return this.auth;
  }
}

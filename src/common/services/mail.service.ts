import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'Gmail', // or use Mailgun, SendGrid, etc.
      auth: {
        user: process.env.EMAIL_USER, // Set in .env
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  //   const transporter = nodemailer.createTransport({
  //     service: 'gmail',
  //     host: 'smtp.gmail.com',
  //     port: 465,
  //     secure: true,
  //     logger: true,
  //     debug: true,
  //     secureConnection: false,
  //     auth: {
  //         user: 'njugunad85@gmail.com', // your email address
  //         pass: 'vxrlsgzyekyezvod', // your email password or app-specific password
  //     },
  //     tls:{
  //         rejectUnauthorized: true
  //     }
  // });

  async sendPasswordEmail(email: string, password: string) {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Account Password',
      text: `Your account has been created. Your temporary password is: ${password}`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`Password email sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }
}

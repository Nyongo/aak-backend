import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const emailUser =
      process.env.GMAIL_USER ||
      process.env.EMAIL_USER ||
      process.env.SENDGRID_FROM_EMAIL;

    const emailPass =
      process.env.GMAIL_APP_PASSWORD ||
      process.env.EMAIL_PASS ||
      process.env.SENDGRID_API_KEY;

    if (!emailUser || !emailPass) {
      this.logger.error(
        'Missing email credentials. Check GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.',
      );
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    });
  }

  async sendEmail(options: {
    to: string | string[];
    subject: string;
    template?: string;
    context?: Record<string, any>;
    html?: string;
    text?: string;
  }) {
    const { to, subject, template, context, html, text } = options;

    const emailUser =
      process.env.GMAIL_USER ||
      process.env.EMAIL_USER ||
      process.env.SENDGRID_FROM_EMAIL;

    const emailPass =
      process.env.GMAIL_APP_PASSWORD ||
      process.env.EMAIL_PASS ||      
      process.env.SENDGRID_API_KEY;

    if (!emailUser || !emailPass) {
      throw new InternalServerErrorException(
        'Email service is not configured. Missing EMAIL_USER or EMAIL_PASS.',
      );
    }

    let finalHtml = html;
    let finalText = text;

    if (template && context) {
      finalHtml = this.replaceTemplateVariables(template, context);
      finalText = this.replaceTemplateVariables(template, context);
    }

    const mailOptions = {
      from: emailUser,
      to: Array.isArray(to) ? to.join(',') : to,
      subject,
      html: finalHtml || undefined,
      text: finalText || undefined,
    };

    console.log('mail options', mailOptions);

    try {
      const response = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to}:`, response.messageId);
      return true;
    } catch (error) {
      this.logger.error('Error sending email', error as any);
      throw error;
    }
  }

  async sendSmeLoanEmail(data: any) {
    const recipient = process.env.LOAN_LEADS_EMAIL_TO || 'marketing@jackfruitfinance.com';
    const productName = 'SME Logbook Loan Lead';

    const rows: [string, any][] = [
      ['Loan Product', productName],
      ['Full Name', data.fullName],
      ['Phone', data.phone],
      ['Business Name', data.businessName],
      ['Business Location', data.businessLocation],
      ['Financing Amount', data.financingAmount],
      ['Vehicle Make & Year', data.vehicleMakeYear],
      ['Consent', data.consent ? 'Yes' : 'No'],
    ];

    const { html, text } = this.buildLeadEmail(productName, rows);

    return this.sendEmail({
      to: recipient,
      subject: `New ${productName}`,
      html,
      text,
    });
  }

  async sendSchoolFinanceLoanEmail(data: any) {
    const recipient = process.env.LOAN_LEADS_EMAIL_TO || 'marketing@jackfruitfinance.com';
    const productName = 'School Finance Loan Lead';

    const rows: [string, any][] = [
      ['Loan Product', productName],
      ['Full Name', data.fullName],
      ['Phone', data.phone],
      ['School Name', data.schoolName],
      ['School Location', data.schoolLocation],
      ['Loan Type', data.loanType],
      ['Amount Needed', data.schoolAmount],
      ['Consent', data.consent ? 'Yes' : 'No'],
    ];

    const { html, text } = this.buildLeadEmail(productName, rows);

    return this.sendEmail({
      to: recipient,
      subject: `New ${productName}`,
      html,
      text,
    });
  }

  async sendSchoolFeesLoanEmail(data: any) {
    const recipient = process.env.LOAN_LEADS_EMAIL_TO || 'marketing@jackfruitfinance.com';
    const productName = 'School Fees Loan Lead';

    const rows: [string, any][] = [
      ['Loan Product', productName],
      ['Full Name', data.fullName],
      ['Phone', data.phone],
      ["Child's School", data.childSchool],
      ['School Location', data.schoolLocation],
      ['Grade / Level', data.gradeLevel],
      ['Amount Needed', data.amountNeeded],
      ['Vehicle Make & Year', data.vehicleMakeYear],
      ['Your Location', data.yourLocation],
      ['Consent', data.consent ? 'Yes' : 'No'],
    ];

    const { html, text } = this.buildLeadEmail(productName, rows);

    return this.sendEmail({
      to: recipient,
      subject: `New ${productName}`,
      html,
      text,
    });
  }

  async sendPasswordEmail(
    email: string,
    password: string,
    isResetPassword: boolean = false,
  ) {
    let subject = 'Your Account Password';
    if (isResetPassword) {
      subject = 'Your Reset Password';
    }
    const template = `
      <h1>${subject}</h1>
      <p>${isResetPassword ? 'Your password has been reset successfully.' : 'Your account has been created successfully.'}</p>
      <p>Your temporary password is: <strong>${password}</strong></p>
      <p>Please change your password after your first login.</p>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html: template,
      text: `${isResetPassword ? 'Your password has been reset.' : 'Your account has been created.'} Your temporary password is: ${password}`,
    });
  }

  async sendUpskillRegistrationEmail(data: any) {
    const template = `
      <h1>Upskill Registration</h1>
      <p>Name: <b>${data.teacherName}</b></p>
      <p>Teacher Email: <b>${data.email}</b></p>
      <p>Level: <b>${data.teachingLevel}</b></p>
      <p>Phone: <b>${data.phoneNumber}</b></p>
      <p>School: <b>${data.schoolName}</b></p>
      <p>No. Of Learners: <b>${data.numberOfLearners}</b></p>
      <p>Years Of Experience: <b>${data.yearsOfExperience}</b></p>
    `;

    return this.sendEmail({
      to: 'info@jackfruit-foundation.org',
      subject: 'New Upskill Registration',
      html: template,
      text: `${data.teacherName} has registered for Upskill. Please review the details and add them to the platform.`,
    });
  }

  async sendContactUsEmail(data: any) {
    const template = `
      <h1>Contact Form Submission</h1>
      <p>Name: <b>${data.name}</b></p>
      <p>Email: <b>${data.email}</b></p>
      <p>Subject: <b>${data.subject}</b></p>
      <p>Message: <b>${data.message}</b></p>
    `;

    return this.sendEmail({
      to: 'info@jackfruit-foundation.org',
      subject: 'New Contact Form Submission',
      html: template,
      text: `New contact form submission from ${data.name}. Subject: ${data.subject}`,
    });
  }

  private buildLeadEmail(productName: string, rows: [string, any][]) {
    const safeRows = rows.filter(
      ([, value]) => value !== undefined && value !== null && String(value).trim() !== '',
    );

    const htmlRows = safeRows
      .map(
        ([label, value]) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">
              ${this.escapeHtml(String(label))}
            </td>
            <td style="padding:8px 12px;border:1px solid #e5e7eb;">
              ${this.escapeHtml(String(value))}
            </td>
          </tr>
        `,
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin-bottom: 16px;">New ${this.escapeHtml(productName)}</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
          <tbody>
            ${htmlRows}
          </tbody>
        </table>
      </div>
    `;

    const text = safeRows.map(([label, value]) => `${label}: ${value}`).join('\n');

    return { html, text };
  }

  private replaceTemplateVariables(
    template: string,
    context: Record<string, any>,
  ): string {
    return template.replace(/\${(\w+)}/g, (_, key) => context[key] || '');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

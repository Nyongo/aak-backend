import { Injectable } from '@nestjs/common';
import { Client } from 'postmark';

@Injectable()
export class MailService {
  private client: Client;

  constructor() {
    this.client = new Client(process.env.POSTMARK_API_TOKEN);
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

    let finalHtml = html;
    let finalText = text;

    if (template && context) {
      // Replace template variables with context values
      finalHtml = this.replaceTemplateVariables(template, context);
      finalText = this.replaceTemplateVariables(template, context);
    }

    const mailOptions = {
      From: process.env.POSTMARK_FROM_EMAIL,
      To: Array.isArray(to) ? to.join(',') : to,
      Subject: subject,
      HtmlBody: finalHtml || undefined,
      TextBody: finalText || undefined,
    };
    console.log('mail options', mailOptions);
    try {
      const response = await this.client.sendEmail(mailOptions);

      console.log(`Email sent to ${to}:`, response);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  private replaceTemplateVariables(
    template: string,
    context: Record<string, any>,
  ): string {
    return template.replace(/\${(\w+)}/g, (_, key) => context[key] || '');
  }

  async sendPasswordEmail(email: string, password: string) {
    const template = `
      <h1>Welcome to Our Platform</h1>
      <p>Your account has been created successfully.</p>
      <p>Your temporary password is: <strong>${password}</strong></p>
      <p>Please change your password after your first login.</p>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your Account Password',
      html: template,
      text: `Your account has been created. Your temporary password is: ${password}`,
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
}

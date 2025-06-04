import { Injectable, InternalServerErrorException } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

@Injectable()
export class MailService {

  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is not defined');
    }
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
      to: Array.isArray(to) ? to.join(',') : to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: subject,
      html: finalHtml || undefined,
      text: finalText || undefined
    };
    console.log('mail options', mailOptions);
    try {
      const [result] = await sgMail.send(mailOptions);
      
      console.log(`Email sent to ${to}:`, result);
      return result;
    } catch (err: any) {
      console.error('SendGrid error:', err);
      throw new InternalServerErrorException(
        'Failed to send email',
      );
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

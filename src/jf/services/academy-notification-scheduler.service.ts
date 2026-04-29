import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AcademyGuidesService } from './academy-guides.service';
import { MailService } from 'src/common/services/mail.service';

@Injectable()
export class AcademyNotificationSchedulerService {
  private readonly logger = new Logger(AcademyNotificationSchedulerService.name);

  constructor(
    private readonly guidesService: AcademyGuidesService,
    private readonly mailService:   MailService,
  ) {}

  @Cron('0 * * * *', { name: 'academy-notifications', timeZone: 'Africa/Nairobi' })
  async handle() {
    this.logger.log('🎓 Academy: running notification + auto-publish check...');
    try {
      await this.autoPublish();
      await this.sendNotifications('24h');
      await this.sendNotifications('1h');
    } catch (err) {
      this.logger.error('Academy notification cron failed', err);
    }
  }

  private async autoPublish() {
    const count = await this.guidesService.autoPublishScheduled();
    if (count > 0) this.logger.log(`✅ Auto-published ${count} Academy guide(s)`);
  }

  private async sendNotifications(type: '24h' | '1h') {
    const guides = await this.guidesService.getGuidesNeedingNotification(
      type === '24h' ? 24 : 1,
      type,
    );

    for (const guide of guides) {
      const emails = guide.subscribers.map(s => s.email);
      if (!emails.length) continue;

      const enT     = guide.translations.find(t => t.language === 'EN');
      const title   = enT?.title ?? 'A new Jackfruit Academy guide';
      const timeStr = type === '24h' ? '24 hours' : '1 hour';

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#111;padding:24px;text-align:center;">
            <p style="color:#F5AB29;font-size:11px;font-weight:700;letter-spacing:.15em;margin:0 0 6px;">
              JACKFRUIT ACADEMY
            </p>
            <h1 style="color:#fff;font-size:22px;margin:0;">
              Your guide goes live in ${timeStr}!
            </h1>
          </div>
          <div style="padding:32px 24px;background:#fff;">
            <h2 style="color:#111;font-size:18px;margin:0 0 12px;">${title}</h2>
            <p style="color:#555;font-size:15px;margin:0 0 28px;">
              This guide goes live in <strong>${timeStr}</strong>.
              Head to Jackfruit Academy and be the first to watch.
            </p>
            <a href="https://www.jackfruitfinance.com/resources/jackfruit-academy"
               style="background:#F5AB29;color:#000;font-weight:700;padding:14px 28px;
                      text-decoration:none;border-radius:999px;display:inline-block;font-size:14px;">
              Visit Jackfruit Academy →
            </a>
          </div>
          <div style="background:#f9f9f9;padding:14px 24px;font-size:11px;color:#999;text-align:center;">
            You received this because you subscribed to be notified about this guide.
          </div>
        </div>
      `;

      try {
        await this.mailService.sendEmail({
          to:      emails,
          subject: `"${title}" goes live in ${timeStr} — Jackfruit Academy`,
          html,
          text:    `"${title}" goes live in ${timeStr}. Visit: https://www.jackfruitfinance.com/resources/jackfruit-academy`,
        });
        await this.guidesService.markNotificationSent(guide.id, type);
        this.logger.log(`📧 Sent ${type} notification for "${title}" to ${emails.length} subscriber(s)`);
      } catch (err) {
        this.logger.error(`Failed sending ${type} notification for guide ${guide.id}`, err);
      }
    }
  }
}

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';

export interface SendEmailParams {
  recipient: string;
  subject: string;
  body: string;
  from?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
  accepted: string[];
  rejected: string[];
}

export class EmailService {
  private transporter: Transporter | null = null;

  /**
   * Lazily initializes and caches the Nodemailer transporter using Ethereal SMTP configuration.
   */
  public getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const { host, port, user, password } = config.ethereal;

    if (!user || !password) {
      throw new Error(
        'Ethereal SMTP credentials are not configured. Please set ETHEREAL_USER and ETHEREAL_PASSWORD in your .env file or run `npm run ethereal:setup`.'
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for 587
      auth: {
        user,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed cert issues in dev
      },
    });

    return this.transporter;
  }

  /**
   * Sends an email via Ethereal SMTP and returns delivery details with preview URL.
   */
  public async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    const { recipient, subject, body, from } = params;

    const transporter = this.getTransporter();
    const fromAddress = from || config.ethereal.fromEmail;

    try {
      logger.info(`Sending email to ${recipient} with subject "${subject}"...`);

      const info = await transporter.sendMail({
        from: fromAddress,
        to: recipient,
        subject,
        text: body,
        html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
          <h2 style="color: #4f46e5;">${subject}</h2>
          <div style="margin-top: 16px; white-space: pre-wrap;">${body}</div>
          <hr style="margin-top: 32px; border: none; border-top: 1px solid #e2e8f0;" />
          <p style="font-size: 11px; color: #64748b;">Dispatched via ReachInbox Email Job Scheduler</p>
        </div>`,
      });

      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

      logger.info(`Email sent successfully! MessageId: ${info.messageId}`);
      if (previewUrl) {
        logger.info(`Ethereal Email Preview URL: ${previewUrl}`);
      }

      return {
        messageId: info.messageId,
        previewUrl,
        accepted: Array.isArray(info.accepted) ? info.accepted.map(String) : [],
        rejected: Array.isArray(info.rejected) ? info.rejected.map(String) : [],
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown SMTP delivery error';
      logger.error(`Failed to send email to ${recipient}: ${errorMsg}`);
      // Sanitize: ensure no passwords or credentials leak in the thrown error
      const sanitized = errorMsg.replace(/:[^:@]*@/, ':****@');
      throw new Error(`SMTP Delivery Failed: ${sanitized}`);
    }
  }

  /**
   * Verifies the SMTP connection without sending an email.
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      await transporter.verify();
      return true;
    } catch (error) {
      logger.warn('SMTP connection verification failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }
}

// Singleton email service instance
export const emailService = new EmailService();

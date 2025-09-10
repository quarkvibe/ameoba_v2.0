import { MailService } from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { storage } from '../storage';
import type { EmailConfiguration } from '@shared/schema';

interface EmailParams {
  to: string;
  from: string;
  fromName?: string;
  subject: string;
  text?: string;
  html?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private sendgridService: MailService;
  private sesClient: SESClient;

  constructor() {
    this.sendgridService = new MailService();
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }

  async sendEmail(
    userId: string,
    params: EmailParams,
    configId?: string
  ): Promise<SendResult> {
    try {
      let config: EmailConfiguration | undefined;
      
      if (configId) {
        const configs = await storage.getEmailConfigurations(userId);
        config = configs.find(c => c.id === configId);
      } else {
        config = await storage.getDefaultEmailConfiguration(userId);
      }

      if (!config) {
        return { success: false, error: 'No email configuration found' };
      }

      const emailParams = {
        ...params,
        from: config.fromEmail,
        fromName: config.fromName || params.fromName,
      };

      switch (config.provider) {
        case 'sendgrid':
          return await this.sendWithSendGrid(config.apiKey, emailParams);
        case 'ses':
          return await this.sendWithSES(config.apiKey, emailParams);
        default:
          return { success: false, error: `Unsupported provider: ${config.provider}` };
      }
    } catch (error) {
      console.error('Email sending error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendWithSendGrid(apiKey: string, params: EmailParams): Promise<SendResult> {
    try {
      this.sendgridService.setApiKey(apiKey);
      
      const [response] = await this.sendgridService.send({
        to: params.to,
        from: {
          email: params.from,
          name: params.fromName || '',
        },
        subject: params.subject,
        text: params.text,
        html: params.html,
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string || undefined,
      };
    } catch (error: any) {
      console.error('SendGrid error:', error);
      return {
        success: false,
        error: error.message || 'SendGrid send failed',
      };
    }
  }

  private async sendWithSES(apiKey: string, params: EmailParams): Promise<SendResult> {
    try {
      const command = new SendEmailCommand({
        Source: params.fromName ? `${params.fromName} <${params.from}>` : params.from,
        Destination: {
          ToAddresses: [params.to],
        },
        Message: {
          Subject: {
            Data: params.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Text: params.text ? {
              Data: params.text,
              Charset: 'UTF-8',
            } : undefined,
            Html: params.html ? {
              Data: params.html,
              Charset: 'UTF-8',
            } : undefined,
          },
        },
      });

      const response = await this.sesClient.send(command);
      
      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error: any) {
      console.error('SES error:', error);
      return {
        success: false,
        error: error.message || 'SES send failed',
      };
    }
  }

  async testConfiguration(provider: string, apiKey: string, testEmail: string): Promise<SendResult> {
    const testParams = {
      to: testEmail,
      from: testEmail,
      fromName: 'Amoeba Test',
      subject: 'Amoeba Configuration Test',
      text: 'This is a test email to verify your email configuration.',
      html: '<p>This is a test email to verify your email configuration.</p>',
    };

    switch (provider) {
      case 'sendgrid':
        return await this.sendWithSendGrid(apiKey, testParams);
      case 'ses':
        return await this.sendWithSES(apiKey, testParams);
      default:
        return { success: false, error: `Unsupported provider: ${provider}` };
    }
  }
}

export const emailService = new EmailService();

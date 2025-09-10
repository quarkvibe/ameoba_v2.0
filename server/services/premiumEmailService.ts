import { productionDbService } from './productionDbService';
import { emailService } from './emailService';
import { horoscopeService } from './horoscopeService';
import { storage } from '../storage';

interface PremiumEmailJob {
  id: string;
  userId: string;
  email: string;
  zodiacSign: string;
  firstName?: string;
  lastName?: string;
  date: string;
  attempts: number;
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  error?: string;
}

export class PremiumEmailService {
  private emailJobs: Map<string, PremiumEmailJob> = new Map();
  private isProcessing = false;

  /**
   * Send personalized horoscopes to all premium users
   */
  async sendDailyHoroscopesToPremiumUsers(date?: string): Promise<{
    queued: number;
    failed: number;
    alreadySent: number;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      console.log(`Starting premium horoscope email distribution for ${targetDate}`);
      
      // Get premium users with sun chart data
      const premiumUsers = await productionDbService.getUserSunChartData();
      
      if (premiumUsers.length === 0) {
        console.log('No premium users found with sun chart data');
        return { queued: 0, failed: 0, alreadySent: 0 };
      }

      console.log(`Found ${premiumUsers.length} premium users with sun chart data`);

      let queued = 0;
      let failed = 0;
      let alreadySent = 0;

      // Queue emails for each premium user
      for (const user of premiumUsers) {
        try {
          // Check if already sent today
          const emailKey = `${user.userId}-${targetDate}`;
          if (this.emailJobs.has(emailKey)) {
            alreadySent++;
            continue;
          }

          // Create email job
          const emailJob: PremiumEmailJob = {
            id: emailKey,
            userId: user.userId,
            email: user.email,
            zodiacSign: user.zodiacSign,
            firstName: undefined, // Will get from production DB
            lastName: undefined,
            date: targetDate,
            attempts: 0,
            status: 'pending',
            createdAt: new Date()
          };

          this.emailJobs.set(emailKey, emailJob);
          queued++;

        } catch (error) {
          console.error(`Failed to queue email for user ${user.userId}:`, error);
          failed++;
        }
      }

      // Start processing emails in background
      this.processEmailQueue();

      return { queued, failed, alreadySent };

    } catch (error) {
      console.error('Error in sendDailyHoroscopesToPremiumUsers:', error);
      throw error;
    }
  }

  /**
   * Process the email queue
   */
  private async processEmailQueue(): Promise<void> {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      const pendingJobs = Array.from(this.emailJobs.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      console.log(`Processing ${pendingJobs.length} pending email jobs`);

      for (const job of pendingJobs) {
        try {
          await this.sendPremiumHoroscopeEmail(job);
          
          // Small delay between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to process email job ${job.id}:`, error);
        }
      }

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a personalized horoscope email to a premium user
   */
  private async sendPremiumHoroscopeEmail(job: PremiumEmailJob): Promise<void> {
    try {
      job.attempts++;

      // Get user details from production database
      const productionUsers = await productionDbService.getPremiumUsers();
      const userDetails = productionUsers.find(u => u.id === job.userId);

      const firstName = userDetails?.firstName || 'Valued Member';
      const lastName = userDetails?.lastName || '';

      // Get the daily horoscope for this sign
      const horoscope = await storage.getHoroscopeBySignAndDate(job.zodiacSign, job.date);
      
      if (!horoscope) {
        throw new Error(`No horoscope found for ${job.zodiacSign} on ${job.date}`);
      }

      // Create personalized email content
      const emailContent = this.createPersonalizedHoroscopeEmail(
        firstName,
        lastName,
        job.zodiacSign,
        horoscope,
        job.date
      );

      // Send the email using a direct method for system emails
      const emailResult = await this.sendHoroscopeEmail(
        job.email,
        `Your Personalized ${this.getZodiacDisplayName(job.zodiacSign)} Horoscope - ${this.formatDate(job.date)}`,
        emailContent.html,
        emailContent.text
      );

      if (emailResult.success) {
        job.status = 'sent';
        job.sentAt = new Date();
        console.log(`✅ Sent premium horoscope to ${job.email} (${job.zodiacSign})`);
      } else {
        throw new Error(emailResult.error || 'Email send failed');
      }

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Failed to send premium horoscope to ${job.email}:`, error);
      
      // Retry logic - retry up to 3 times
      if (job.attempts < 3) {
        setTimeout(() => {
          job.status = 'pending';
          this.processEmailQueue();
        }, 5000 * job.attempts); // Exponential backoff
      }
    }
  }

  /**
   * Create personalized horoscope email content
   */
  private createPersonalizedHoroscopeEmail(
    firstName: string,
    lastName: string,
    zodiacSign: string,
    horoscope: any,
    date: string
  ): { html: string; text: string } {
    const zodiacDisplayName = this.getZodiacDisplayName(zodiacSign);
    const formattedDate = this.formatDate(date);
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Personal ${zodiacDisplayName} Horoscope</title>
        <style>
          body { font-family: Georgia, serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
          .horoscope { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .zodiac-symbol { font-size: 48px; margin-bottom: 10px; }
          .date { font-size: 18px; opacity: 0.9; }
          .greeting { font-size: 20px; margin-bottom: 20px; }
          .horoscope-text { font-size: 16px; line-height: 1.8; }
          .section { margin: 20px 0; }
          .section-title { font-weight: bold; color: #667eea; margin-bottom: 10px; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="zodiac-symbol">${this.getZodiacSymbol(zodiacSign)}</div>
          <h1>Your Personal ${zodiacDisplayName} Horoscope</h1>
          <div class="date">${formattedDate}</div>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear ${firstName}${lastName ? ' ' + lastName : ''},
          </div>
          
          <p>As a ${zodiacDisplayName}, the stars have aligned to bring you personalized insights for today. Here's what the cosmos has in store for you:</p>
          
          <div class="horoscope">
            <div class="horoscope-text">
              ${horoscope.content}
            </div>
            
            ${horoscope.love_forecast ? `
              <div class="section">
                <div class="section-title">💕 Love & Relationships</div>
                <div>${horoscope.love_forecast}</div>
              </div>
            ` : ''}
            
            ${horoscope.career_forecast ? `
              <div class="section">
                <div class="section-title">💼 Career & Finance</div>
                <div>${horoscope.career_forecast}</div>
              </div>
            ` : ''}
            
            ${horoscope.health_forecast ? `
              <div class="section">
                <div class="section-title">🌿 Health & Wellness</div>
                <div>${horoscope.health_forecast}</div>
              </div>
            ` : ''}
            
            ${horoscope.lucky_numbers ? `
              <div class="section">
                <div class="section-title">🍀 Lucky Numbers</div>
                <div>${horoscope.lucky_numbers}</div>
              </div>
            ` : ''}
          </div>
          
          <p>Remember, you have the power to shape your destiny. Use these insights as guidance on your journey.</p>
          
          <div class="footer">
            <p>✨ This horoscope was personally generated for you using advanced AI and real astronomical data ✨</p>
            <p>Wishing you a wonderful day ahead!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Your Personal ${zodiacDisplayName} Horoscope - ${formattedDate}

Dear ${firstName}${lastName ? ' ' + lastName : ''},

As a ${zodiacDisplayName}, the stars have aligned to bring you personalized insights for today.

${horoscope.content}

${horoscope.love_forecast ? `Love & Relationships: ${horoscope.love_forecast}\n\n` : ''}
${horoscope.career_forecast ? `Career & Finance: ${horoscope.career_forecast}\n\n` : ''}
${horoscope.health_forecast ? `Health & Wellness: ${horoscope.health_forecast}\n\n` : ''}
${horoscope.lucky_numbers ? `Lucky Numbers: ${horoscope.lucky_numbers}\n\n` : ''}

Remember, you have the power to shape your destiny. Use these insights as guidance on your journey.

Wishing you a wonderful day ahead!
    `;

    return { html, text };
  }

  /**
   * Direct email sending method for premium horoscope emails
   * Uses SendGrid with environment variable API key
   */
  private async sendHoroscopeEmail(
    to: string,
    subject: string,
    html: string,
    text: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        return { success: false, error: 'SendGrid API key not configured' };
      }

      const sgMail = await import('@sendgrid/mail');
      const mailService = sgMail.default;
      mailService.setApiKey(process.env.SENDGRID_API_KEY);

      await mailService.send({
        to,
        from: 'horoscopes@amoeba.services', // System email address
        fromName: 'Amoeba Horoscope Service',
        subject,
        html,
        text,
      });

      return { success: true };
    } catch (error) {
      console.error('SendGrid email error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      };
    }
  }

  /**
   * Get status of email distribution
   */
  getEmailStatus(): {
    total: number;
    pending: number;
    sent: number;
    failed: number;
    jobs: PremiumEmailJob[];
  } {
    const jobs = Array.from(this.emailJobs.values());
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      sent: jobs.filter(j => j.status === 'sent').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      jobs: jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    };
  }

  /**
   * Clear old email jobs (older than 7 days)
   */
  clearOldJobs(): number {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    let cleared = 0;
    for (const [key, job] of Array.from(this.emailJobs.entries())) {
      if (job.createdAt < sevenDaysAgo) {
        this.emailJobs.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }

  private getZodiacDisplayName(sign: string): string {
    const zodiacNames: Record<string, string> = {
      'aries': 'Aries',
      'taurus': 'Taurus',
      'gemini': 'Gemini',
      'cancer': 'Cancer',
      'leo': 'Leo',
      'virgo': 'Virgo',
      'libra': 'Libra',
      'scorpio': 'Scorpio',
      'sagittarius': 'Sagittarius',
      'capricorn': 'Capricorn',
      'aquarius': 'Aquarius',
      'pisces': 'Pisces'
    };
    return zodiacNames[sign.toLowerCase()] || sign;
  }

  private getZodiacSymbol(sign: string): string {
    const zodiacSymbols: Record<string, string> = {
      'aries': '♈',
      'taurus': '♉',
      'gemini': '♊',
      'cancer': '♋',
      'leo': '♌',
      'virgo': '♍',
      'libra': '♎',
      'scorpio': '♏',
      'sagittarius': '♐',
      'capricorn': '♑',
      'aquarius': '♒',
      'pisces': '♓'
    };
    return zodiacSymbols[sign.toLowerCase()] || '⭐';
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

export const premiumEmailService = new PremiumEmailService();
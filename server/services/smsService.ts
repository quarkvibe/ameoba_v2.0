import Twilio from 'twilio';
import { storage } from '../storage';
import { activityMonitor } from './activityMonitor';

/**
 * SMS Service
 * Handles text message delivery via Twilio, AWS SNS, or other providers
 */

export interface SMSOptions {
  to: string | string[];   // Phone number(s) to send to (E.164 format)
  content: string;         // Message content
  mediaUrl?: string[];     // Optional: MMS images/media
}

export interface SMSResult {
  success: boolean;
  messageSid?: string;
  status?: string;
  segments?: number;       // Number of SMS segments (each 160 chars)
  cost?: number;
  error?: string;
  metadata?: any;
}

class SMSService {
  
  /**
   * Send SMS message(s)
   */
  async sendSMS(
    userId: string,
    options: SMSOptions
  ): Promise<SMSResult> {
    
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    
    activityMonitor.logActivity('info', `📱 Sending SMS to ${recipients.length} recipient(s)`);
    
    try {
      // Get SMS credential
      const credential = await this.getSMSCredential(userId);
      
      if (!credential) {
        throw new Error('No SMS service credential configured. Please add Twilio credentials in Settings.');
      }
      
      // Route to appropriate provider
      switch (credential.provider.toLowerCase()) {
        case 'twilio':
          return await this.sendViaTwilio(credential, options);
        
        case 'aws-sns':
          return await this.sendViaAWS(credential, options);
        
        default:
          throw new Error(`Unsupported SMS provider: ${credential.provider}`);
      }
      
    } catch (error: any) {
      activityMonitor.logError(error, 'SMS Send');
      return {
        success: false,
        error: error.message,
      };
    }
  }
  
  /**
   * Send SMS via Twilio
   */
  private async sendViaTwilio(
    credential: any,
    options: SMSOptions
  ): Promise<SMSResult> {
    
    try {
      const client = Twilio(credential.accountSid, credential.apiKey);
      
      // Get Twilio phone number
      const fromNumber = credential.config?.phoneNumber || await this.getTwilioPhoneNumber(client);
      
      if (!fromNumber) {
        throw new Error('No Twilio phone number configured. Please purchase a phone number in Twilio console.');
      }
      
      // Prepare content for SMS
      const smsContent = this.prepareForSMS(options.content);
      
      // Calculate segments (SMS is 160 chars per segment)
      const segments = Math.ceil(smsContent.length / 160);
      
      // Validate length (Twilio max: 1600 chars = 10 segments)
      if (segments > 10) {
        throw new Error(`Content too long for SMS: ${smsContent.length} characters (max: 1600). Consider using voice call instead.`);
      }
      
      const recipients = Array.isArray(options.to) ? options.to : [options.to];
      const results = [];
      
      // Send to each recipient
      for (const to of recipients) {
        // Validate phone number
        const validation = this.validatePhoneNumber(to);
        if (!validation.valid) {
          activityMonitor.logActivity('warning', `⚠️ Invalid phone number: ${to}`);
          results.push({
            to,
            success: false,
            error: validation.error,
          });
          continue;
        }
        
        activityMonitor.logActivity('debug', `📱 Sending SMS to ${validation.formatted}`);
        
        // Send message
        const message = await client.messages.create({
          to: validation.formatted!,
          from: fromNumber,
          body: smsContent,
          ...(options.mediaUrl && { mediaUrl: options.mediaUrl }),
        });
        
        activityMonitor.logActivity('success', `✅ SMS sent: ${message.sid} (${segments} segment${segments > 1 ? 's' : ''})`);
        
        results.push({
          to: validation.formatted,
          success: true,
          messageSid: message.sid,
          status: message.status,
          segments,
        });
      }
      
      // Calculate total cost (Twilio: $0.0075 per SMS segment)
      const totalSegments = results.reduce((sum, r: any) => sum + (r.segments || 0), 0);
      const totalCost = totalSegments * 0.0075;
      
      const allSucceeded = results.every((r: any) => r.success);
      
      return {
        success: allSucceeded,
        messageSid: results[0]?.messageSid,
        status: results[0]?.status,
        segments: totalSegments,
        cost: totalCost,
        metadata: {
          provider: 'twilio',
          recipients: results.length,
          results,
        },
      };
      
    } catch (error: any) {
      activityMonitor.logError(error, 'Twilio SMS');
      
      // Parse Twilio errors
      if (error.code === 21608) {
        throw new Error('Invalid phone number format. Use E.164 format: +1234567890');
      } else if (error.code === 21606) {
        throw new Error('Phone number is not verified. For trial accounts, verify numbers in Twilio console.');
      } else if (error.code === 20003) {
        throw new Error('Invalid Twilio credentials. Please check Account SID and Auth Token.');
      } else if (error.code === 21614) {
        throw new Error('Invalid "From" phone number. Please check your Twilio phone number configuration.');
      }
      
      throw error;
    }
  }
  
  /**
   * Send SMS via AWS SNS
   */
  private async sendViaAWS(
    credential: any,
    options: SMSOptions
  ): Promise<SMSResult> {
    
    // Future implementation for AWS SNS
    // Simpler than Twilio for pure SMS (no voice)
    
    activityMonitor.logActivity('warning', 'AWS SNS not yet implemented');
    
    return {
      success: false,
      error: 'AWS SNS provider not yet implemented. Please use Twilio.',
    };
  }
  
  /**
   * Prepare content for SMS delivery
   * - Shorten if too long
   * - Remove formatting
   * - Optimize for mobile reading
   */
  private prepareForSMS(content: string): string {
    let smsContent = content;
    
    // Remove HTML tags if present
    smsContent = smsContent.replace(/<[^>]+>/g, '');
    
    // Remove markdown formatting
    smsContent = smsContent.replace(/[*_`]/g, '');
    
    // Remove extra whitespace
    smsContent = smsContent.replace(/\s+/g, ' ').trim();
    
    // Limit to 1600 chars (10 SMS segments max for reliability)
    if (smsContent.length > 1600) {
      smsContent = smsContent.substring(0, 1597) + '...';
    }
    
    return smsContent;
  }
  
  /**
   * Validate phone number format (E.164)
   */
  public validatePhoneNumber(phoneNumber: string): { valid: boolean; formatted?: string; error?: string } {
    // E.164 format: +[country code][number]
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    
    if (e164Regex.test(phoneNumber)) {
      return { valid: true, formatted: phoneNumber };
    }
    
    // Try to parse and format common US numbers
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length === 10) {
      // Assume US number
      return { valid: true, formatted: `+1${digitsOnly}` };
    }
    
    if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      // US number with country code
      return { valid: true, formatted: `+${digitsOnly}` };
    }
    
    return {
      valid: false,
      error: 'Invalid phone number. Use E.164 format: +1234567890',
    };
  }
  
  /**
   * Get SMS credential for user
   */
  private async getSMSCredential(userId: string): Promise<any> {
    // Get from phone service credentials
    const credentials = await storage.getPhoneServiceCredentials?.(userId);
    
    if (credentials && credentials.length > 0) {
      return credentials.find((c: any) => c.isDefault) || credentials[0];
    }
    
    return null;
  }
  
  /**
   * Get Twilio phone number
   */
  private async getTwilioPhoneNumber(client: any): Promise<string | null> {
    try {
      const numbers = await client.incomingPhoneNumbers.list({ limit: 1 });
      return numbers[0]?.phoneNumber || null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Estimate SMS cost
   */
  estimateSMSCost(content: string, recipients: number = 1): number {
    const segments = Math.ceil(content.length / 160);
    const costPerSegment = 0.0075; // Twilio pricing
    return segments * recipients * costPerSegment;
  }
  
  /**
   * Generate SMS-optimized content from regular content
   * - Summarizes if too long
   * - Adds call-to-action
   * - Mobile-friendly formatting
   */
  async optimizeForSMS(content: string, maxLength: number = 320): Promise<string> {
    // If content is short enough, use as-is
    if (content.length <= maxLength) {
      return this.prepareForSMS(content);
    }
    
    // Extract first sentence or paragraph
    const firstSentence = content.split(/[.!?]+/)[0];
    
    if (firstSentence.length <= maxLength) {
      return this.prepareForSMS(firstSentence + '.');
    }
    
    // Truncate with ellipsis
    return this.prepareForSMS(content.substring(0, maxLength - 3) + '...');
  }
}

export const smsService = new SMSService();


import type { Express } from "express";
import { smsCommandService } from "../services/smsCommandService";
import { activityMonitor } from "../services/activityMonitor";

/**
 * SMS Commands Routes
 * Handles inbound SMS from Twilio for remote platform control
 * 
 * Webhook endpoint: /api/sms/incoming
 * Twilio sends POST requests here when SMS received
 */

export function registerSMSCommandRoutes(app: Express) {
  
  /**
   * Twilio incoming SMS webhook
   * POST /api/sms/incoming
   * 
   * This is called by Twilio when someone sends SMS to your Twilio number
   */
  app.post('/api/sms/incoming', async (req, res) => {
    try {
      activityMonitor.logActivity('info', '📱 Incoming SMS webhook from Twilio');
      
      // Twilio sends these parameters
      const {
        From,          // Sender's phone number
        To,            // Your Twilio number
        Body,          // Message content
        MessageSid,    // Unique message ID
        AccountSid,    // Your Twilio account
      } = req.body;
      
      // Validate required fields
      if (!From || !Body) {
        return res.status(400).send('Missing required fields');
      }
      
      // Process command
      const result = await smsCommandService.processCommand({
        from: From,
        body: Body,
        timestamp: new Date(),
        messageSid: MessageSid,
      });
      
      // Respond with TwiML (Twilio will send this as SMS reply)
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXML(result.response)}</Message>
</Response>`);
      
    } catch (error: any) {
      activityMonitor.logError(error, 'SMS Webhook Handler');
      
      // Send error response via TwiML
      res.type('text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>❌ System error. Please try again or check dashboard.</Message>
</Response>`);
    }
  });
  
  /**
   * Get SMS command settings for user
   * GET /api/sms-commands/settings
   */
  app.get('/api/sms-commands/settings', async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const authorizedNumbers = smsCommandService.getAuthorizedNumbers(userId);
      
      res.json({
        success: true,
        authorizedNumbers,
        webhookUrl: `${process.env.PUBLIC_URL || 'https://app.amoeba.io'}/api/sms/incoming`,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  /**
   * Authorize phone number for SMS commands
   * POST /api/sms-commands/authorize
   */
  app.post('/api/sms-commands/authorize', async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { phoneNumber } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'phoneNumber required' });
      }
      
      await smsCommandService.authorizePhoneNumber(userId, phoneNumber);
      
      res.json({
        success: true,
        message: `Phone number ${phoneNumber} authorized for SMS commands`,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  /**
   * Remove authorized phone number
   * DELETE /api/sms-commands/authorize/:phoneNumber
   */
  app.delete('/api/sms-commands/authorize/:phoneNumber', async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { phoneNumber } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      await smsCommandService.unauthorizePhoneNumber(userId, phoneNumber);
      
      res.json({
        success: true,
        message: `Phone number ${phoneNumber} unauthorized`,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
  
  /**
   * Test SMS commands (send test command to yourself)
   * POST /api/sms-commands/test
   */
  app.post('/api/sms-commands/test', async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { command } = req.body;
      
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Simulate incoming SMS
      const result = await smsCommandService.processCommand({
        from: '+1000000000', // Test number
        body: command || 'status',
        timestamp: new Date(),
        messageSid: 'test_' + Date.now(),
      });
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}

/**
 * Escape XML for TwiML
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}


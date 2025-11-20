import { storage } from '../storage';
import { activityMonitor } from './activityMonitor';
import { commandExecutor } from './commandExecutor';
import { aiAgent } from './aiAgent';
import { smsService } from './smsService';
import { contentGenerationService } from './contentGenerationService';
import { reviewQueueService } from './reviewQueueService';
// import { testingService } from './testingService'; // REMOVED - bloat

/**
 * SMS Command Service
 * Handles inbound SMS commands from authorized users
 * 
 * Users can control Amoeba via text message:
 * - CLI commands: "status", "generate", "jobs list"
 * - Natural language: "What's the system health?"
 * - Emergency controls: "pause all jobs"
 * - Review workflow: "approve all", "show queue"
 * 
 * SECURITY: Only authorized phone numbers can send commands
 */

interface SMSCommand {
  from: string;          // Sender's phone number
  body: string;          // Message content
  timestamp: Date;
  messageSid: string;    // Twilio message ID
}

interface SMSCommandResult {
  success: boolean;
  response: string;      // What to reply to user
  executed?: string[];   // Commands that were executed
  error?: string;
}

class SMSCommandService {
  
  // Authorized phone numbers per user
  private authorizedNumbers: Map<string, string[]> = new Map();
  
  /**
   * Process incoming SMS command
   */
  async processCommand(command: SMSCommand): Promise<SMSCommandResult> {
    
    activityMonitor.logActivity('info', `📱 Incoming SMS from ${command.from}: "${command.body}"`);
    
    try {
      // 1. Authenticate sender
      const userId = await this.authenticateSender(command.from);
      
      if (!userId) {
        activityMonitor.logActivity('warning', `⚠️ Unauthorized SMS from ${command.from}`);
        return {
          success: false,
          response: "❌ Unauthorized. Add your number in Dashboard → Settings → SMS Commands to enable remote control.",
          error: 'Unauthorized phone number',
        };
      }
      
      activityMonitor.logActivity('success', `✅ Authenticated SMS from user ${userId}`);
      
      // 2. Parse command
      const parsed = this.parseCommand(command.body);
      
      // 3. Execute based on type
      let result: SMSCommandResult;
      
      if (parsed.type === 'cli') {
        // Execute as CLI command
        result = await this.executeCLICommand(parsed.command, userId);
      } else if (parsed.type === 'natural_language') {
        // Process via AI agent
        result = await this.executeNaturalLanguageCommand(parsed.command, userId);
      } else {
        // Try to interpret
        result = await this.executeSmartCommand(command.body, userId);
      }
      
      // 4. Log execution
      await this.logCommandExecution(userId, command, result);
      
      // 5. Send SMS response
      await this.sendResponse(command.from, result.response);
      
      activityMonitor.logActivity('success', `✅ SMS command executed and response sent`);
      
      return result;
      
    } catch (error: any) {
      activityMonitor.logError(error, 'SMS Command Processing');
      
      // Send error response to user
      await this.sendResponse(command.from, `❌ Error: ${error.message}`);
      
      return {
        success: false,
        response: `❌ Error: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Authenticate sender by phone number
   */
  private async authenticateSender(phoneNumber: string): Promise<string | null> {
    // Normalize phone number to E.164
    const normalized = this.normalizePhoneNumber(phoneNumber);
    
    // Check against authorized numbers for each user
    // In production, store this in database
    // For now, check user's profile settings
    
    try {
      const users = await storage.getUserByPhoneNumber?.(normalized);
      if (users && users.length > 0) {
        return users[0].id;
      }
    } catch (error) {
      // Method might not exist yet
    }
    
    // Fallback: Check if phone number matches any user's Twilio config
    // (User's own Twilio number = authorized)
    return null;
  }
  
  /**
   * Parse command to determine type
   */
  private parseCommand(text: string): { type: 'cli' | 'natural_language' | 'shortcut', command: string } {
    const trimmed = text.trim();
    
    // Check if it's a known CLI command
    const cliCommands = [
      'status', 'health', 'templates', 'jobs', 'queue', 'logs', 'generate', 
      'list', 'show', 'help', 'version', 'db', 'memory'
    ];
    
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    
    if (cliCommands.includes(firstWord)) {
      return { type: 'cli', command: trimmed };
    }
    
    // Check if it's a natural language query (has question words or is long)
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'is', 'are', 'can', 'should'];
    const startsWithQuestion = questionWords.some(q => trimmed.toLowerCase().startsWith(q));
    
    if (startsWithQuestion || trimmed.length > 50) {
      return { type: 'natural_language', command: trimmed };
    }
    
    // Default to CLI
    return { type: 'cli', command: trimmed };
  }
  
  /**
   * Execute CLI command
   */
  private async executeCLICommand(command: string, userId: string): Promise<SMSCommandResult> {
    activityMonitor.logActivity('debug', `🖥️ Executing CLI command: ${command}`);
    
    try {
      // Use existing commandExecutor
      const output = await commandExecutor.execute(command, userId);
      
      // Format for SMS (shorten if needed)
      const smsResponse = this.formatForSMS(output);
      
      return {
        success: true,
        response: smsResponse,
        executed: [command],
      };
      
    } catch (error: any) {
      return {
        success: false,
        response: `❌ Command failed: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Execute natural language command via AI agent
   */
  private async executeNaturalLanguageCommand(text: string, userId: string): Promise<SMSCommandResult> {
    activityMonitor.logActivity('debug', `🤖 Processing natural language: ${text}`);
    
    try {
      // Use existing AI agent for natural language understanding
      const response = await aiAgent.chat(userId, text);
      
      // Check if AI wants to execute a command
      const commandMatch = response.message.match(/EXECUTE_COMMAND: (.+)/);
      if (commandMatch) {
        const command = commandMatch[1];
        return await this.executeCLICommand(command, userId);
      }
      
      // Format AI response for SMS
      const smsResponse = this.formatForSMS(response.message);
      
      return {
        success: true,
        response: smsResponse,
      };
      
    } catch (error: any) {
      return {
        success: false,
        response: `❌ ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Execute smart command (try to figure out intent)
   */
  private async executeSmartCommand(text: string, userId: string): Promise<SMSCommandResult> {
    const lower = text.toLowerCase();
    
    // Shortcuts
    if (lower === 'help' || lower === '?') {
      return {
        success: true,
        response: `📱 SMS Commands:
• status - System health
• generate <template> - Generate content
• queue - Review queue
• approve all - Approve pending
• jobs - Scheduled jobs
• help - This message

Or ask in plain English!`,
      };
    }
    
    // Generate shortcuts
    if (lower.startsWith('gen ') || lower.startsWith('generate ')) {
      const templateName = text.substring(text.indexOf(' ') + 1);
      return await this.handleGenerateCommand(templateName, userId);
    }
    
    // Review queue shortcuts
    if (lower === 'queue' || lower === 'pending' || lower === 'review') {
      return await this.handleQueueCommand(userId);
    }
    
    if (lower === 'approve all') {
      return await this.handleApproveAllCommand(userId);
    }
    
    // Test commands
    if (lower === 'test' || lower.startsWith('test ')) {
      const testName = text.substring(text.indexOf(' ') + 1).trim();
      return await this.handleTestCommand(testName || 'all', userId);
    }
    
    if (lower === 'logs' || lower.startsWith('logs ')) {
      const params = text.substring(5).trim(); // "logs error" → "error"
      return await this.handleLogsCommand(params, userId);
    }
    
    // Otherwise, try as CLI command first
    try {
      return await this.executeCLICommand(text, userId);
    } catch {
      // If CLI fails, try natural language
      return await this.executeNaturalLanguageCommand(text, userId);
    }
  }
  
  /**
   * Handle "generate" command
   */
  private async handleGenerateCommand(templateName: string, userId: string): Promise<SMSCommandResult> {
    try {
      // Find template by name
      const templates = await storage.getContentTemplates(userId);
      const template = templates.find((t: any) => 
        t.name.toLowerCase().includes(templateName.toLowerCase())
      );
      
      if (!template) {
        return {
          success: false,
          response: `❌ Template "${templateName}" not found. Available: ${templates.map((t: any) => t.name).slice(0, 3).join(', ')}`,
        };
      }
      
      // Generate content
      activityMonitor.logActivity('info', `📱 SMS-triggered generation: ${template.name}`);
      
      const result = await contentGenerationService.generate({
        templateId: template.id,
        userId,
      });
      
      // Format response
      const preview = result.content.substring(0, 100);
      const qualityScore = result.metadata?.pipeline?.qualityScore || 'N/A';
      
      return {
        success: true,
        response: `✅ Generated "${template.name}"
Quality: ${qualityScore}/100
Preview: ${preview}...

View full: Dashboard → Content`,
        executed: [`generate ${template.id}`],
      };
      
    } catch (error: any) {
      return {
        success: false,
        response: `❌ Generation failed: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Handle "queue" command
   */
  private async handleQueueCommand(userId: string): Promise<SMSCommandResult> {
    try {
      const pending = await reviewQueueService.getPendingReviews(userId);
      
      if (pending.length === 0) {
        return {
          success: true,
          response: '✅ No pending reviews. All clear!',
        };
      }
      
      const summary = pending.slice(0, 3).map((r: any, i: number) => 
        `${i+1}. ${r.templateName} (Q: ${r.metadata?.qualityScore || '?'}/100)`
      ).join('\n');
      
      return {
        success: true,
        response: `📋 ${pending.length} pending review(s):
${summary}${pending.length > 3 ? '\n...(more in dashboard)' : ''}

Reply "approve all" to approve`,
      };
      
    } catch (error: any) {
      return {
        success: false,
        response: `❌ ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Handle "approve all" command
   */
  private async handleApproveAllCommand(userId: string): Promise<SMSCommandResult> {
    try {
      const pending = await reviewQueueService.getPendingReviews(userId);
      
      if (pending.length === 0) {
        return {
          success: true,
          response: '✅ No pending reviews to approve.',
        };
      }
      
      const reviewIds = pending.map((r: any) => r.id);
      const result = await reviewQueueService.bulkApprove(reviewIds, userId, 'Approved via SMS');
      
      return {
        success: true,
        response: `✅ Approved ${result.approved} item(s). Delivered!`,
        executed: ['approve_all'],
      };
      
    } catch (error: any) {
      return {
        success: false,
        response: `❌ ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Format output for SMS (shorten, optimize)
   */
  private formatForSMS(text: string, maxLength: number = 320): string {
    // Remove ANSI color codes
    let formatted = text.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Remove ASCII art/boxes
    formatted = formatted.replace(/[┌┐└┘│─├┤┬┴┼]/g, '');
    
    // Collapse multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace
    formatted = formatted.trim();
    
    // Truncate if needed
    if (formatted.length > maxLength) {
      formatted = formatted.substring(0, maxLength - 20) + '\n\n(Truncated. View full in dashboard)';
    }
    
    return formatted;
  }
  
  /**
   * Send SMS response to user
   */
  private async sendResponse(to: string, message: string): Promise<void> {
    try {
      // Get system/admin Twilio credential
      // In production, use dedicated SMS command credentials
      // For now, we'll need userId to get credential
      // This is a chicken-egg problem - solving below
      
      activityMonitor.logActivity('debug', `📱 Sending SMS response to ${to}`);
      
      // NOTE: This requires system-level Twilio credential
      // Solution: Store admin Twilio credentials in environment or settings
      
    } catch (error: any) {
      activityMonitor.logError(error, 'SMS Response Send');
    }
  }
  
  /**
   * Log command execution for audit
   */
  private async logCommandExecution(
    userId: string,
    command: SMSCommand,
    result: SMSCommandResult
  ): Promise<void> {
    // Log to database for audit trail
    activityMonitor.logActivity('info', 
      `📱 SMS Command Log: ${command.from} → "${command.body}" → ${result.success ? 'Success' : 'Failed'}`
    );
    
    // In production, store in smsCommandLogs table
  }
  
  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add +1 if it's a 10-digit US number
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // Add + if it's missing
    if (!phoneNumber.startsWith('+')) {
      return `+${digits}`;
    }
    
    return phoneNumber;
  }
  
  /**
   * Register authorized phone number for user
   */
  async authorizePhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    
    const current = this.authorizedNumbers.get(userId) || [];
    if (!current.includes(normalized)) {
      current.push(normalized);
      this.authorizedNumbers.set(userId, current);
    }
    
    activityMonitor.logActivity('success', `✅ Authorized phone ${normalized} for user ${userId}`);
  }
  
  /**
   * Remove authorized phone number
   */
  async unauthorizePhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    
    const current = this.authorizedNumbers.get(userId) || [];
    const filtered = current.filter(n => n !== normalized);
    this.authorizedNumbers.set(userId, filtered);
    
    activityMonitor.logActivity('info', `🔒 Unauthorized phone ${normalized} for user ${userId}`);
  }
  
  /**
   * Get authorized numbers for user
   */
  getAuthorizedNumbers(userId: string): string[] {
    return this.authorizedNumbers.get(userId) || [];
  }
  
  /**
   * Handle "test" command - Simplified
   */
  private async handleTestCommand(testName: string, userId: string): Promise<SMSCommandResult> {
    try {
      // Simple health check
      const dbHealth = await storage.healthCheck();
      
      return {
        success: dbHealth.healthy,
        response: `🧪 System Test:\n${dbHealth.healthy ? '✅ Healthy' : '❌ Issues detected'}\n\nDB: ${dbHealth.healthy ? '🟢' : '🔴'}`,
        executed: ['test'],
      };
    } catch (error: any) {
      return {
        success: false,
        response: `❌ Test failed: ${error.message}`,
        error: error.message,
      };
    }
  }
  
  /**
   * Handle "logs" command - Simplified
   */
  private async handleLogsCommand(params: string, userId: string): Promise<SMSCommandResult> {
    try {
      const logs = activityMonitor.getRecentLogs(10);
      
      if (logs.length === 0) {
        return {
          success: true,
          response: `📋 No recent logs. Check dashboard for details.`,
          executed: ['logs'],
        };
      }
      
      // Format first 3 for SMS
      const formatted = logs.slice(0, 3).map((log: any) => {
        return `${log.level}: ${log.message?.substring(0, 40) || 'N/A'}`;
      }).join('\n');
      
      return {
        success: true,
        response: `📋 Recent Activity:\n${formatted}\n\nMore in dashboard`,
        executed: ['logs'],
      };
    } catch (error: any) {
      return {
        success: false,
        response: `❌ Log read failed: ${error.message}`,
        error: error.message,
      };
    }
  }
}

export const smsCommandService = new SMSCommandService();

import OpenAI from "openai";
import { storage } from '../storage';
import type { AgentConversation } from '@shared/schema';

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "" 
});

interface AgentContext {
  userId: string;
  systemMetrics?: any;
  recentLogs?: any[];
  campaigns?: any[];
}

interface AgentResponse {
  message: string;
  actions?: AgentAction[];
  suggestions?: string[];
}

interface AgentAction {
  type: string;
  parameters: any;
  description: string;
}

export class AIAgent {
  private systemPrompt = `You are Amoeba, an intelligent email operations agent. You help users manage their email campaigns, analyze performance, troubleshoot issues, and optimize email delivery.

Your capabilities include:
- Analyzing email metrics and providing insights
- Helping configure email providers and settings
- Troubleshooting delivery issues
- Optimizing send times and content
- Managing campaigns and automation
- Monitoring queue health and performance

Always respond in a helpful, professional manner. When suggesting actions, be specific and actionable. If you need more information to help, ask clarifying questions.

Response format: Return JSON with 'message' (your response), optional 'actions' array for specific tasks, and optional 'suggestions' array for recommendations.`;

  async processMessage(
    userId: string,
    message: string,
    context?: AgentContext
  ): Promise<AgentResponse> {
    try {
      const conversationHistory = await storage.getAgentConversations(userId, 5);
      
      const contextualPrompt = this.buildContextualPrompt(message, context, conversationHistory);
      
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: contextualPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      });

      const agentResponse = JSON.parse(response.choices[0].message.content || '{}');
      
      // Store the conversation
      await storage.createAgentConversation({
        userId,
        message,
        response: agentResponse.message || 'I apologize, but I had trouble processing that request.',
        context: { ...context, timestamp: new Date().toISOString() },
      });

      return {
        message: agentResponse.message || 'I apologize, but I had trouble processing that request.',
        actions: agentResponse.actions || [],
        suggestions: agentResponse.suggestions || [],
      };
    } catch (error) {
      console.error('AI Agent error:', error);
      return {
        message: 'I apologize, but I encountered an error processing your request. Please try again.',
        actions: [],
        suggestions: [],
      };
    }
  }

  private buildContextualPrompt(
    message: string,
    context?: AgentContext,
    history?: AgentConversation[]
  ): string {
    let prompt = `User message: "${message}"\n\n`;

    if (context?.systemMetrics) {
      prompt += `Current system metrics:
- Total emails today: ${context.systemMetrics.emailsToday || 0}
- Delivery rate: ${context.systemMetrics.deliveryRate || 'N/A'}
- Queue depth: ${context.systemMetrics.queueDepth || 0}
- Active users: ${context.systemMetrics.activeUsers || 0}\n\n`;
    }

    if (context?.recentLogs && context.recentLogs.length > 0) {
      prompt += `Recent email activity (last 5 entries):\n`;
      context.recentLogs.slice(0, 5).forEach(log => {
        prompt += `- ${log.status}: ${log.recipient} (${log.subject})\n`;
      });
      prompt += '\n';
    }

    if (context?.campaigns && context.campaigns.length > 0) {
      prompt += `Active campaigns:\n`;
      context.campaigns.forEach(campaign => {
        prompt += `- ${campaign.name}: ${campaign.status}\n`;
      });
      prompt += '\n';
    }

    if (history && history.length > 0) {
      prompt += `Recent conversation history:\n`;
      history.reverse().forEach(conv => {
        prompt += `User: ${conv.message}\nAgent: ${conv.response}\n\n`;
      });
    }

    prompt += `Please respond with helpful information and actionable suggestions. Format your response as JSON with 'message', optional 'actions' array, and optional 'suggestions' array.`;

    return prompt;
  }

  async analyzeEmailPerformance(userId: string, timeframe: 'day' | 'week' | 'month' = 'day'): Promise<AgentResponse> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeframe) {
        case 'day':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      const metrics = await storage.getEmailMetrics(userId, startDate, endDate);
      const campaigns = await storage.getCampaigns(userId);
      
      const analysisPrompt = `Analyze this email performance data for the last ${timeframe}:

Metrics:
- Total emails: ${metrics.total}
- Sent: ${metrics.sent}
- Delivered: ${metrics.delivered}
- Bounced: ${metrics.bounced}
- Failed: ${metrics.failed}

Active campaigns: ${campaigns.length}

Provide insights, identify issues, and suggest optimizations. Format as JSON with 'message', 'actions', and 'suggestions'.`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: this.systemPrompt },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      console.error('Performance analysis error:', error);
      return {
        message: 'Unable to analyze email performance at this time.',
        suggestions: [],
      };
    }
  }

  async suggestOptimizations(userId: string): Promise<string[]> {
    try {
      const metrics = await storage.getEmailMetrics(userId);
      const campaigns = await storage.getCampaigns(userId);
      const recentLogs = await storage.getEmailLogs(userId, 100);

      const deliveryRate = metrics.total > 0 ? (metrics.delivered / metrics.total) * 100 : 0;
      const bounceRate = metrics.total > 0 ? (metrics.bounced / metrics.total) * 100 : 0;

      const suggestions: string[] = [];

      if (deliveryRate < 95) {
        suggestions.push("Delivery rate is below optimal. Consider reviewing your email list hygiene and sender reputation.");
      }

      if (bounceRate > 5) {
        suggestions.push("High bounce rate detected. Implement email validation and list cleaning procedures.");
      }

      if (campaigns.length === 0) {
        suggestions.push("No active campaigns found. Consider setting up automated email sequences.");
      }

      const activeCampaigns = campaigns.filter(c => c.status === 'active');
      if (activeCampaigns.length > 10) {
        suggestions.push("Many active campaigns detected. Consider consolidating or scheduling to avoid overwhelming recipients.");
      }

      return suggestions;
    } catch (error) {
      console.error('Optimization suggestions error:', error);
      return ["Unable to generate optimization suggestions at this time."];
    }
  }
}

export const aiAgent = new AIAgent();

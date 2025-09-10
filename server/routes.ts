import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { emailService } from "./services/emailService";
import { aiAgent } from "./services/aiAgent";
import { queueService } from "./services/queueService";
import { insertCampaignSchema, insertEmailConfigurationSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const emailMetrics = await storage.getEmailMetrics(userId);
      const queueMetrics = await queueService.getMetrics();
      const campaigns = await storage.getCampaigns(userId);
      const recentLogs = await storage.getEmailLogs(userId, 10);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMetrics = await storage.getEmailMetrics(userId, today, new Date());

      const metrics = {
        emailsToday: todayMetrics.total || 0,
        deliveryRate: emailMetrics.total > 0 ? ((emailMetrics.delivered / emailMetrics.total) * 100).toFixed(1) + '%' : '0%',
        activeUsers: campaigns.filter(c => c.status === 'active').length,
        queueDepth: queueMetrics.pending,
        totalEmails: emailMetrics.total,
        sentEmails: emailMetrics.sent,
        deliveredEmails: emailMetrics.delivered,
        bouncedEmails: emailMetrics.bounced,
        failedEmails: emailMetrics.failed,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalCampaigns: campaigns.length,
        queueMetrics,
        recentActivity: recentLogs.map(log => ({
          id: log.id,
          type: log.status,
          message: `${log.recipient} - ${log.status === 'delivered' ? 'Email delivered' : log.status}`,
          details: log.subject,
          timestamp: log.queuedAt,
          status: log.status,
        })),
      };

      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  // Campaign routes
  app.get("/api/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const campaigns = await storage.getCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post("/api/campaigns", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCampaignSchema.parse({ ...req.body, userId });
      
      const campaign = await storage.createCampaign(validatedData);
      res.json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.put("/api/campaigns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const campaign = await storage.updateCampaign(id, userId, req.body);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const deleted = await storage.deleteCampaign(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.post("/api/campaigns/:id/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const job = await queueService.addCampaignJob(id, userId);
      res.json({ success: true, jobId: job.id });
    } catch (error) {
      console.error("Error sending campaign:", error);
      res.status(500).json({ message: "Failed to send campaign" });
    }
  });

  // Email configuration routes
  app.get("/api/email-configurations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const configurations = await storage.getEmailConfigurations(userId);
      res.json(configurations);
    } catch (error) {
      console.error("Error fetching email configurations:", error);
      res.status(500).json({ message: "Failed to fetch configurations" });
    }
  });

  app.post("/api/email-configurations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertEmailConfigurationSchema.parse({ ...req.body, userId });
      
      const config = await storage.createEmailConfiguration(validatedData);
      res.json(config);
    } catch (error) {
      console.error("Error creating email configuration:", error);
      res.status(500).json({ message: "Failed to create configuration" });
    }
  });

  app.post("/api/email-configurations/test", isAuthenticated, async (req: any, res) => {
    try {
      const { provider, apiKey, testEmail } = req.body;
      
      const result = await emailService.testConfiguration(provider, apiKey, testEmail);
      res.json(result);
    } catch (error) {
      console.error("Error testing email configuration:", error);
      res.status(500).json({ message: "Failed to test configuration" });
    }
  });

  // Queue management routes
  app.get("/api/queue/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await queueService.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching queue metrics:", error);
      res.status(500).json({ message: "Failed to fetch queue metrics" });
    }
  });

  app.post("/api/queue/pause", isAuthenticated, async (req, res) => {
    try {
      await queueService.pauseProcessing();
      res.json({ success: true });
    } catch (error) {
      console.error("Error pausing queue:", error);
      res.status(500).json({ message: "Failed to pause queue" });
    }
  });

  app.post("/api/queue/resume", isAuthenticated, async (req, res) => {
    try {
      await queueService.resumeProcessing();
      res.json({ success: true });
    } catch (error) {
      console.error("Error resuming queue:", error);
      res.status(500).json({ message: "Failed to resume queue" });
    }
  });

  app.post("/api/queue/clear", isAuthenticated, async (req, res) => {
    try {
      await queueService.clearQueue();
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing queue:", error);
      res.status(500).json({ message: "Failed to clear queue" });
    }
  });

  app.post("/api/queue/retry-failed", isAuthenticated, async (req, res) => {
    try {
      await queueService.retryFailedJobs();
      res.json({ success: true });
    } catch (error) {
      console.error("Error retrying failed jobs:", error);
      res.status(500).json({ message: "Failed to retry failed jobs" });
    }
  });

  // Agent routes
  app.post("/api/agent/chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { message } = req.body;
      
      // Get context for the agent
      const emailMetrics = await storage.getEmailMetrics(userId);
      const campaigns = await storage.getCampaigns(userId);
      const recentLogs = await storage.getEmailLogs(userId, 5);
      const queueMetrics = await queueService.getMetrics();
      
      const context = {
        userId,
        systemMetrics: {
          emailsToday: emailMetrics.total,
          deliveryRate: emailMetrics.total > 0 ? ((emailMetrics.delivered / emailMetrics.total) * 100).toFixed(1) + '%' : '0%',
          queueDepth: queueMetrics.pending,
          activeUsers: campaigns.filter(c => c.status === 'active').length,
        },
        recentLogs,
        campaigns: campaigns.slice(0, 5),
      };
      
      const response = await aiAgent.processMessage(userId, message, context);
      res.json(response);
    } catch (error) {
      console.error("Error processing agent message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  app.get("/api/agent/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getAgentConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/agent/analysis", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeframe = req.query.timeframe as 'day' | 'week' | 'month' || 'day';
      
      const analysis = await aiAgent.analyzeEmailPerformance(userId, timeframe);
      res.json(analysis);
    } catch (error) {
      console.error("Error generating analysis:", error);
      res.status(500).json({ message: "Failed to generate analysis" });
    }
  });

  app.get("/api/agent/suggestions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const suggestions = await aiAgent.suggestOptimizations(userId);
      res.json({ suggestions });
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Failed to fetch suggestions" });
    }
  });

  // Email logs
  app.get("/api/email-logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getEmailLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // Test email endpoint
  app.post("/api/send-test", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { to, subject = "Test Email from Amoeba", content = "This is a test email." } = req.body;
      
      const result = await emailService.sendEmail(userId, {
        to,
        from: '', // Will be determined by service
        subject,
        text: content,
        html: `<p>${content}</p>`,
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('WebSocket message received:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Subscribe to real-time updates
            ws.send(JSON.stringify({ type: 'subscribed', message: 'Connected to real-time updates' }));
            break;
          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    // Send periodic updates
    const updateInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        // Send real-time metrics update
        ws.send(JSON.stringify({
          type: 'metrics_update',
          data: {
            timestamp: new Date().toISOString(),
            // This would include real metrics in production
          }
        }));
      }
    }, 5000);
    
    ws.on('close', () => {
      clearInterval(updateInterval);
    });
  });

  return httpServer;
}

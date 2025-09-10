import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { emailService } from "./services/emailService";
import { aiAgent } from "./services/aiAgent";
import { queueService } from "./services/queueService";
import { horoscopeService } from "./services/horoscopeService";
import { horoscopeQueueService } from "./services/horoscopeQueueService";
import { productionDbService } from "./services/productionDbService";
import { premiumEmailService } from "./services/premiumEmailService";
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

  // =============================================================================
  // PUBLIC HOROSCOPE API ENDPOINTS (No authentication required for free users)
  // =============================================================================

  // Get today's horoscope for a specific zodiac sign
  app.get("/api/horoscope/:sign", async (req, res) => {
    try {
      const { sign } = req.params;
      const horoscope = await horoscopeService.getTodaysHoroscope(sign.toLowerCase());
      
      if (!horoscope) {
        return res.status(404).json({ 
          message: `No horoscope found for ${sign} today. Horoscopes may still be generating.` 
        });
      }

      res.json({
        sign: sign.toLowerCase(),
        date: horoscope.date,
        content: horoscope.content,
        mood: horoscope.mood,
        luckNumber: horoscope.luckNumber,
        luckyColor: horoscope.luckyColor,
        generatedAt: horoscope.generatedAt
      });
    } catch (error) {
      console.error(`Error fetching horoscope for ${req.params.sign}:`, error);
      res.status(500).json({ message: "Failed to fetch horoscope" });
    }
  });

  // Get today's horoscopes for all signs
  app.get("/api/horoscope", async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const horoscopes = await storage.getAllHoroscopesForDate(today);
      
      // Include zodiac sign information with each horoscope
      const zodiacSigns = await storage.getAllZodiacSigns();
      const signMap = new Map(zodiacSigns.map(s => [s.id, s]));
      
      const enrichedHoroscopes = horoscopes.map(h => ({
        sign: signMap.get(h.zodiacSignId)?.name || 'unknown',
        symbol: signMap.get(h.zodiacSignId)?.symbol || '?',
        element: signMap.get(h.zodiacSignId)?.element || 'unknown',
        date: h.date,
        content: h.content,
        mood: h.mood,
        luckNumber: h.luckNumber,
        luckyColor: h.luckyColor,
        generatedAt: h.generatedAt
      }));

      res.json({
        date: today,
        horoscopes: enrichedHoroscopes,
        total: enrichedHoroscopes.length
      });
    } catch (error) {
      console.error("Error fetching all horoscopes:", error);
      res.status(500).json({ message: "Failed to fetch horoscopes" });
    }
  });

  // Get zodiac sign information
  app.get("/api/zodiac", async (req, res) => {
    try {
      const signs = await storage.getAllZodiacSigns();
      res.json(signs);
    } catch (error) {
      console.error("Error fetching zodiac signs:", error);
      res.status(500).json({ message: "Failed to fetch zodiac signs" });
    }
  });

  // Get specific zodiac sign information
  app.get("/api/zodiac/:sign", async (req, res) => {
    try {
      const { sign } = req.params;
      const zodiacSign = await storage.getZodiacSignByName(sign.toLowerCase());
      
      if (!zodiacSign) {
        return res.status(404).json({ message: `Zodiac sign '${sign}' not found` });
      }

      res.json(zodiacSign);
    } catch (error) {
      console.error(`Error fetching zodiac sign ${req.params.sign}:`, error);
      res.status(500).json({ message: "Failed to fetch zodiac sign" });
    }
  });

  // =============================================================================
  // ADMIN HOROSCOPE MANAGEMENT ENDPOINTS (Authentication required)
  // =============================================================================

  // Get horoscope generation status and metrics
  app.get("/api/admin/horoscope/status", isAuthenticated, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const horoscopes = await storage.getAllHoroscopesForDate(today);
      const stats = await horoscopeQueueService.getGenerationStats();
      
      res.json({
        date: today,
        generatedToday: horoscopes.length,
        totalSigns: 12,
        isComplete: horoscopes.length === 12,
        generationStats: stats,
        horoscopes: horoscopes.map(h => ({
          zodiacSignId: h.zodiacSignId,
          mood: h.mood,
          generatedAt: h.generatedAt
        }))
      });
    } catch (error) {
      console.error("Error fetching horoscope status:", error);
      res.status(500).json({ message: "Failed to fetch horoscope status" });
    }
  });

  // Manually trigger horoscope generation for today
  app.post("/api/admin/horoscope/generate", isAuthenticated, async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      await horoscopeQueueService.scheduleDailyHoroscopeGeneration(targetDate, 20); // High priority
      
      res.json({ 
        message: `Horoscope generation scheduled for ${targetDate}`,
        date: targetDate
      });
    } catch (error) {
      console.error("Error scheduling horoscope generation:", error);
      res.status(500).json({ message: "Failed to schedule horoscope generation" });
    }
  });

  // Initialize daily horoscope generation (for testing/setup)
  app.post("/api/admin/horoscope/initialize", isAuthenticated, async (req, res) => {
    try {
      await horoscopeQueueService.scheduleRecurringDailyGeneration();
      
      res.json({ 
        message: "Daily horoscope generation initialized successfully"
      });
    } catch (error) {
      console.error("Error initializing horoscope generation:", error);
      res.status(500).json({ message: "Failed to initialize horoscope generation" });
    }
  });

  // Get premium user sun chart data (placeholder for when production DB is connected)
  app.get("/api/admin/users/:userId/sunchart", isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const sunChart = await storage.getUserSunChart(userId);
      
      if (!sunChart) {
        return res.status(404).json({ message: "Sun chart not found for user" });
      }

      res.json(sunChart);
    } catch (error) {
      console.error("Error fetching user sun chart:", error);
      res.status(500).json({ message: "Failed to fetch sun chart" });
    }
  });

  // =============================================================================
  // PRODUCTION DATABASE ANALYSIS ENDPOINTS
  // =============================================================================

  // Analyze production database schema
  app.get("/api/admin/production/schema", isAuthenticated, async (req, res) => {
    try {
      const schema = await productionDbService.getProductionSchema();
      res.json({
        message: "Production database schema analyzed",
        tables: schema.length,
        schema: schema
      });
    } catch (error) {
      console.error("Error analyzing production schema:", error);
      res.status(500).json({ message: "Failed to analyze production database schema" });
    }
  });

  // Get sample data from a production table
  app.get("/api/admin/production/sample/:tableName", isAuthenticated, async (req, res) => {
    try {
      const { tableName } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;
      
      const sampleData = await productionDbService.getSampleData(tableName, limit);
      res.json({
        tableName,
        sampleCount: sampleData.length,
        data: sampleData
      });
    } catch (error) {
      console.error(`Error fetching sample data from ${req.params.tableName}:`, error);
      res.status(500).json({ message: "Failed to fetch sample data" });
    }
  });

  // Get premium users from production database
  app.get("/api/admin/production/premium-users", isAuthenticated, async (req, res) => {
    try {
      const premiumUsers = await productionDbService.getPremiumUsers();
      res.json({
        count: premiumUsers.length,
        users: premiumUsers
      });
    } catch (error) {
      console.error("Error fetching premium users:", error);
      res.status(500).json({ message: "Failed to fetch premium users" });
    }
  });

  // Get user sun chart data from production database
  app.get("/api/admin/production/sun-charts", isAuthenticated, async (req, res) => {
    try {
      const sunCharts = await productionDbService.getUserSunChartData();
      res.json({
        count: sunCharts.length,
        sunCharts: sunCharts
      });
    } catch (error) {
      console.error("Error fetching sun chart data:", error);
      res.status(500).json({ message: "Failed to fetch sun chart data" });
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

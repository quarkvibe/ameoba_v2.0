import { Router } from 'express';
import { isAuthenticated } from '../replitAuth';
import { generousRateLimit } from '../middleware/rateLimiter';
import { storage } from '../storage';

/**
 * HEALTH & STATUS ROUTES - Simplified
 * Basic health checks without over-engineering
 */

export function registerHealthRoutes(router: Router) {
  
  // Public health check (basic liveness)
  router.get('/health', async (req, res) => {
    try {
      const dbHealth = await storage.healthCheck();
      res.json({
        status: dbHealth.healthy ? 'healthy' : 'degraded',
        icon: dbHealth.healthy ? '🟢' : '🔴',
        message: dbHealth.message || 'System operational',
        database: dbHealth.healthy,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error checking health:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detailed readiness check (authenticated, for dashboard)
  router.get('/system/readiness', 
    isAuthenticated,
    generousRateLimit,
    async (req, res) => {
      try {
        const dbHealth = await storage.healthCheck();
        res.json({
          status: dbHealth.healthy ? 'ready' : 'degraded',
          database: dbHealth,
          uptime: Math.floor(process.uptime()),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error checking readiness:', error);
        res.status(500).json({ message: 'Failed to check system readiness' });
      }
    }
  );
}





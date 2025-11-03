import type { Express } from "express";
import { reproductionService } from "../services/reproductionService";
import { standardRateLimit } from "../middleware/rateLimiter";

/**
 * Reproduction Routes
 * Handles cellular mitosis - spawning child Amoebas for efficiency
 * 
 * Following ARCHITECTURE.md:
 * - RIBOSOME layer (HTTP handling)
 * - Calls reproductionService (GOLGI)
 */

export function registerReproductionRoutes(app: Express) {
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
  };

  /**
   * Analyze task for reproduction potential
   * POST /api/reproduction/analyze
   */
  app.post('/api/reproduction/analyze', isAuthenticated, standardRateLimit, async (req: any, res) => {
    try {
      const { task } = req.body;
      
      if (!task) {
        return res.status(400).json({
          success: false,
          error: 'task is required',
        });
      }
      
      const decision = await reproductionService.analyzeTask(task);
      
      res.json({
        success: true,
        decision,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get pending approval requests
   * GET /api/reproduction/pending-approvals
   */
  app.get('/api/reproduction/pending-approvals', isAuthenticated, async (req: any, res) => {
    try {
      const pending = reproductionService.getPendingApprovals();
      
      res.json({
        success: true,
        pending,
        count: pending.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Approve reproduction request
   * POST /api/reproduction/approve/:taskId
   */
  app.post('/api/reproduction/approve/:taskId', isAuthenticated, standardRateLimit, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      
      reproductionService.approveReproduction(taskId);
      
      res.json({
        success: true,
        message: `Reproduction approved for task ${taskId}`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Deny reproduction request
   * POST /api/reproduction/deny/:taskId
   */
  app.post('/api/reproduction/deny/:taskId', isAuthenticated, standardRateLimit, async (req: any, res) => {
    try {
      const { taskId } = req.params;
      
      reproductionService.denyReproduction(taskId);
      
      res.json({
        success: true,
        message: `Reproduction denied for task ${taskId}`,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get active children
   * GET /api/reproduction/children
   */
  app.get('/api/reproduction/children', isAuthenticated, async (req: any, res) => {
    try {
      const children = reproductionService.getChildren();
      
      // Map to safe response (don't send worker objects)
      const safeChildren = children.map(c => ({
        id: c.id,
        taskId: c.task.id,
        status: c.status,
        startedAt: c.startedAt,
        completedAt: c.completedAt,
        error: c.error,
      }));
      
      res.json({
        success: true,
        children: safeChildren,
        count: safeChildren.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get reproduction statistics
   * GET /api/reproduction/stats
   */
  app.get('/api/reproduction/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = reproductionService.getStatistics();
      
      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}


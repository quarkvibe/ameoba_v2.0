import type { Express, Router } from "express";
import { environmentManagerService } from "../services/environmentManagerService";

/**
 * Environment Management Routes
 * Allows users to manage .env variables from the UI
 * 
 * SECURITY: These are admin-only routes
 */

export function registerEnvironmentRoutes(router: Router) {
  const app = router; // Alias for minimal code changes
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
  };

  /**
   * Get all environment variables (masked)
   * GET /api/environment/variables
   */
  app.get('/api/environment/variables', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const variables = await environmentManagerService.getAllVariables(userId);
      
      res.json({
        success: true,
        variables,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Get single environment variable
   * GET /api/environment/variables/:key
   */
  app.get('/api/environment/variables/:key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const variable = await environmentManagerService.getVariable(req.params.key, userId);
      
      if (!variable) {
        return res.status(404).json({ error: 'Variable not found' });
      }
      
      res.json({
        success: true,
        variable,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Set environment variable
   * PUT /api/environment/variables/:key
   */
  app.put('/api/environment/variables/:key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { value } = req.body;
      
      const result = await environmentManagerService.setVariable(
        req.params.key,
        value,
        userId
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        error: error.message,
      });
    }
  });

  /**
   * Delete environment variable
   * DELETE /api/environment/variables/:key
   */
  app.delete('/api/environment/variables/:key', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      const result = await environmentManagerService.deleteVariable(
        req.params.key,
        userId
      );
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        error: error.message,
      });
    }
  });

  /**
   * Bulk update environment variables
   * POST /api/environment/variables/bulk
   */
  app.post('/api/environment/variables/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { updates } = req.body;
      
      const result = await environmentManagerService.bulkUpdate(updates, userId);
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        error: error.message,
      });
    }
  });

  /**
   * Get .env file content
   * GET /api/environment/file
   */
  app.get('/api/environment/file', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const content = await environmentManagerService.getEnvFileContent(userId);
      
      res.json({
        success: true,
        content,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Update .env file content (advanced mode)
   * PUT /api/environment/file
   */
  app.put('/api/environment/file', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { content } = req.body;
      
      const result = await environmentManagerService.updateEnvFileContent(content, userId);
      
      res.json(result);
    } catch (error: any) {
      res.status(400).json({
        error: error.message,
      });
    }
  });

  /**
   * Validate environment
   * GET /api/environment/validate
   */
  app.get('/api/environment/validate', isAuthenticated, async (req: any, res) => {
    try {
      const validation = await environmentManagerService.validateEnvironment();
      
      res.json({
        success: true,
        ...validation,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Generate key (encryption or session)
   * POST /api/environment/generate-key
   */
  app.post('/api/environment/generate-key', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.body;
      
      let key: string;
      if (type === 'encryption') {
        key = environmentManagerService.generateEncryptionKey();
      } else if (type === 'session') {
        key = environmentManagerService.generateSessionSecret();
      } else {
        return res.status(400).json({ error: 'Invalid key type. Use "encryption" or "session"' });
      }
      
      res.json({
        success: true,
        key,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Get change log
   * GET /api/environment/changelog
   */
  app.get('/api/environment/changelog', isAuthenticated, async (req: any, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const changelog = environmentManagerService.getChangeLog(limit);
      
      res.json({
        success: true,
        changelog,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });
}


import type { Express, Router } from "express";
import { deploymentIntegrationService } from "../services/deploymentIntegrationService";
import { generousRateLimit } from "../middleware/rateLimiter";

/**
 * Deployment Integration Routes
 * Provides deployment analysis and DNS configuration guidance
 * 
 * Following ARCHITECTURE.md:
 * - RIBOSOME layer (HTTP handling only)
 * - Calls deployment service (GOLGI)
 */

export function registerDeploymentRoutes(router: Router) {
  const app = router; // Alias for minimal code changes
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
  };

  /**
   * Analyze deployment environment
   * GET /api/deployment/analyze
   */
  app.get('/api/deployment/analyze', isAuthenticated, generousRateLimit, async (req: any, res) => {
    try {
      const analysis = await deploymentIntegrationService.analyzeEnvironment();
      
      res.json({
        success: true,
        ...analysis,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Get deployment health
   * GET /api/deployment/health
   */
  app.get('/api/deployment/health', isAuthenticated, generousRateLimit, async (req: any, res) => {
    try {
      const health = await deploymentIntegrationService.getDeploymentHealth();
      
      res.json({
        success: true,
        ...health,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Detect existing services
   * GET /api/deployment/services
   */
  app.get('/api/deployment/services', isAuthenticated, generousRateLimit, async (req: any, res) => {
    try {
      const services = await deploymentIntegrationService.detectExistingServices();
      
      res.json({
        success: true,
        services,
        count: services.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Generate nginx configuration
   * POST /api/deployment/nginx-config
   */
  app.post('/api/deployment/nginx-config', isAuthenticated, generousRateLimit, async (req: any, res) => {
    try {
      const { subdomain, amoebaPort, sslEnabled, existingServices } = req.body;
      
      if (!subdomain || !amoebaPort) {
        return res.status(400).json({
          success: false,
          error: 'subdomain and amoebaPort are required',
        });
      }
      
      const config = deploymentIntegrationService.generateNginxConfig({
        subdomain,
        amoebaPort,
        sslEnabled: sslEnabled || false,
        existingServices,
      });
      
      res.json({
        success: true,
        config,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * Validate DNS configuration
   * POST /api/deployment/validate-dns
   */
  app.post('/api/deployment/validate-dns', isAuthenticated, generousRateLimit, async (req: any, res) => {
    try {
      const { domain } = req.body;
      
      if (!domain) {
        return res.status(400).json({
          success: false,
          error: 'domain is required',
        });
      }
      
      const validation = await deploymentIntegrationService.validateDNS(domain);
      
      res.json({
        success: true,
        ...validation,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });
}


import type { Express, Router } from "express";
import { reviewQueueService } from "../services/reviewQueueService";

/**
 * Review Queue Routes
 * Manages human review workflow for AI-generated content
 */

export function registerReviewRoutes(router: Router) {
  const app = router; // Alias for minimal code changes
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Not authenticated' });
  };

  /**
   * Get pending reviews
   * GET /api/reviews/pending
   */
  app.get('/api/reviews/pending', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const reviews = await reviewQueueService.getPendingReviews(userId);
      
      res.json({
        success: true,
        reviews,
        count: reviews.length,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Get all reviews with filters
   * GET /api/reviews?status=pending&templateId=xxx
   */
  app.get('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { status, templateId, startDate, endDate } = req.query;
      
      const reviews = await reviewQueueService.getReviews(userId, {
        status: status as any,
        templateId: templateId as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      
      res.json({
        success: true,
        reviews,
        count: reviews.length,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Get single review
   * GET /api/reviews/:id
   */
  app.get('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const review = await reviewQueueService.getReviewItem(req.params.id, userId);
      
      if (!review) {
        return res.status(404).json({ error: 'Review not found' });
      }
      
      res.json({
        success: true,
        review,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Approve content
   * POST /api/reviews/:id/approve
   */
  app.post('/api/reviews/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { notes } = req.body;
      
      await reviewQueueService.approve(req.params.id, userId, notes);
      
      res.json({
        success: true,
        message: 'Content approved and queued for delivery',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Reject content
   * POST /api/reviews/:id/reject
   */
  app.post('/api/reviews/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }
      
      await reviewQueueService.reject(req.params.id, userId, reason);
      
      res.json({
        success: true,
        message: 'Content rejected',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Request revision
   * POST /api/reviews/:id/revise
   */
  app.post('/api/reviews/:id/revise', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { feedback } = req.body;
      
      if (!feedback) {
        return res.status(400).json({ error: 'Revision feedback is required' });
      }
      
      await reviewQueueService.requestRevision(req.params.id, userId, feedback);
      
      res.json({
        success: true,
        message: 'Revision requested',
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Bulk approve
   * POST /api/reviews/bulk/approve
   */
  app.post('/api/reviews/bulk/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { reviewIds, notes } = req.body;
      
      if (!reviewIds || !Array.isArray(reviewIds)) {
        return res.status(400).json({ error: 'reviewIds array is required' });
      }
      
      const result = await reviewQueueService.bulkApprove(reviewIds, userId, notes);
      
      res.json({
        success: true,
        ...result,
        message: `Approved ${result.approved} of ${reviewIds.length} items`,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });

  /**
   * Get review statistics
   * GET /api/reviews/stats?days=30
   */
  app.get('/api/reviews/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const days = parseInt(req.query.days as string) || 30;
      
      const stats = await reviewQueueService.getStats(userId, days);
      
      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      res.status(500).json({
        error: error.message,
      });
    }
  });
}


import { storage } from '../storage';
import { activityMonitor } from './activityMonitor';
import { deliveryService } from './deliveryService';

/**
 * Review Queue Service
 * Manages human review workflow for AI-generated content
 */

export interface ReviewItem {
  id: string;
  contentId: string;
  userId: string;
  templateId: string;
  templateName?: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  original: string;
  processed: string;
  metadata: any;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface ReviewStats {
  totalPending: number;
  totalApproved: number;
  totalRejected: number;
  avgQualityScore: number;
  autoApprovalRate: number;
}

class ReviewQueueService {
  
  /**
   * Add content to review queue
   */
  async addToQueue(
    contentId: string,
    userId: string,
    templateId: string,
    result: {
      original: string;
      processed: string;
      metadata: any;
    }
  ): Promise<ReviewItem> {
    
    activityMonitor.logActivity('info', `📋 Adding content to review queue: ${contentId}`);
    
    // Get template name for display
    const template = await storage.getContentTemplate(templateId, userId);
    
    const reviewItem: ReviewItem = {
      id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contentId,
      userId,
      templateId,
      templateName: template?.name,
      status: 'pending',
      original: result.original,
      processed: result.processed,
      metadata: result.metadata,
      submittedAt: new Date(),
    };
    
    // Store in database (we'll add this to schema)
    // For now, we'll track in memory or generatedContent metadata
    await storage.updateGeneratedContent(contentId, userId, {
      reviewStatus: 'pending',
      reviewMetadata: result.metadata,
    });
    
    activityMonitor.logActivity('success', `✅ Added to review queue: ${contentId}`);
    
    return reviewItem;
  }
  
  /**
   * Get pending reviews for user
   */
  async getPendingReviews(userId: string): Promise<ReviewItem[]> {
    // Get all generated content with pending review status
    const allContent = await storage.getGeneratedContent(userId);
    
    const pending = allContent
      .filter((content: any) => content.reviewStatus === 'pending')
      .map((content: any) => ({
        id: `review_${content.id}`,
        contentId: content.id,
        userId: content.userId,
        templateId: content.templateId,
        templateName: content.templateName || 'Unknown',
        status: 'pending' as const,
        original: content.metadata?.original || content.content,
        processed: content.content,
        metadata: content.reviewMetadata || {},
        submittedAt: content.createdAt,
      })) as ReviewItem[];
    
    return pending;
  }
  
  /**
   * Get all reviews with filters
   */
  async getReviews(
    userId: string,
    filters?: {
      status?: 'pending' | 'approved' | 'rejected' | 'needs_revision';
      templateId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ReviewItem[]> {
    
    const allContent = await storage.getGeneratedContent(userId);
    
    let filtered = allContent.filter((content: any) => 
      content.reviewStatus !== undefined
    );
    
    if (filters?.status) {
      filtered = filtered.filter((c: any) => c.reviewStatus === filters.status);
    }
    
    if (filters?.templateId) {
      filtered = filtered.filter((c: any) => c.templateId === filters.templateId);
    }
    
    if (filters?.startDate) {
      filtered = filtered.filter((c: any) => 
        new Date(c.createdAt) >= filters.startDate!
      );
    }
    
    if (filters?.endDate) {
      filtered = filtered.filter((c: any) => 
        new Date(c.createdAt) <= filters.endDate!
      );
    }
    
    return filtered.map((content: any) => ({
      id: `review_${content.id}`,
      contentId: content.id,
      userId: content.userId,
      templateId: content.templateId,
      templateName: content.templateName,
      status: content.reviewStatus,
      original: content.metadata?.original || content.content,
      processed: content.content,
      metadata: content.reviewMetadata || {},
      submittedAt: content.createdAt,
      reviewedAt: content.reviewedAt,
      reviewedBy: content.reviewedBy,
      reviewNotes: content.reviewNotes,
    }));
  }
  
  /**
   * Get single review item
   */
  async getReviewItem(reviewId: string, userId: string): Promise<ReviewItem | null> {
    const contentId = reviewId.replace('review_', '');
    const allContent = await storage.getGeneratedContent(userId);
    
    const content = allContent.find((c: any) => c.id === contentId);
    if (!content) return null;
    
    const metadata = content.metadata as any || {};
    return {
      id: reviewId,
      contentId: content.id,
      userId: content.userId || '',
      templateId: content.templateId || '',
      templateName: metadata.templateName || '',
      status: metadata.reviewStatus || 'pending',
      original: metadata.original || content.content,
      processed: content.content,
      metadata: metadata.reviewData || {},
      submittedAt: content.generatedAt || new Date(),
      reviewedAt: metadata.reviewedAt,
      reviewedBy: metadata.reviewedBy,
      reviewNotes: metadata.reviewNotes,
    };
  }
  
  /**
   * Approve content
   */
  async approve(
    reviewId: string,
    userId: string,
    notes?: string
  ): Promise<void> {
    
    const contentId = reviewId.replace('review_', '');
    
    activityMonitor.logActivity('info', `✅ Approving content: ${contentId}`);
    
    await storage.updateGeneratedContent(contentId, userId, {
      reviewStatus: 'approved',
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNotes: notes,
    });
    
    // Auto-deliver approved content if delivery channels are configured
    try {
      await this.deliverApprovedContent(contentId, userId);
    } catch (error: any) {
      activityMonitor.logError(error, 'Auto-delivery after approval');
      // Don't fail the approval if delivery fails
    }
    
    activityMonitor.logActivity('success', `✅ Content approved: ${contentId}`);
  }
  
  /**
   * Reject content
   */
  async reject(
    reviewId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    
    const contentId = reviewId.replace('review_', '');
    
    activityMonitor.logActivity('info', `❌ Rejecting content: ${contentId}`);
    
    await storage.updateGeneratedContent(contentId, userId, {
      reviewStatus: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNotes: reason,
    });
    
    activityMonitor.logActivity('success', `❌ Content rejected: ${contentId}`);
  }
  
  /**
   * Request revision
   */
  async requestRevision(
    reviewId: string,
    userId: string,
    feedback: string
  ): Promise<void> {
    
    const contentId = reviewId.replace('review_', '');
    
    activityMonitor.logActivity('info', `🔄 Requesting revision: ${contentId}`);
    
    await storage.updateGeneratedContent(contentId, userId, {
      reviewStatus: 'needs_revision',
      reviewedAt: new Date(),
      reviewedBy: userId,
      reviewNotes: feedback,
    });
    
    activityMonitor.logActivity('success', `🔄 Revision requested: ${contentId}`);
  }
  
  /**
   * Bulk approve multiple items
   */
  async bulkApprove(
    reviewIds: string[],
    userId: string,
    notes?: string
  ): Promise<{ approved: number; failed: number }> {
    
    let approved = 0;
    let failed = 0;
    
    for (const reviewId of reviewIds) {
      try {
        await this.approve(reviewId, userId, notes);
        approved++;
      } catch (error) {
        failed++;
        activityMonitor.logError(error as Error, `Bulk approve ${reviewId}`);
      }
    }
    
    return { approved, failed };
  }
  
  /**
   * Get review statistics
   */
  async getStats(userId: string, days: number = 30): Promise<ReviewStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const reviews = await this.getReviews(userId, { startDate });
    
    const totalPending = reviews.filter(r => r.status === 'pending').length;
    const totalApproved = reviews.filter(r => r.status === 'approved').length;
    const totalRejected = reviews.filter(r => r.status === 'rejected').length;
    
    // Calculate average quality score
    const scoresWithQuality = reviews
      .filter(r => r.metadata?.qualityScore !== undefined)
      .map(r => r.metadata.qualityScore);
    
    const avgQualityScore = scoresWithQuality.length > 0
      ? scoresWithQuality.reduce((a, b) => a + b, 0) / scoresWithQuality.length
      : 0;
    
    // Calculate auto-approval rate
    const totalReviewed = totalApproved + totalRejected;
    const autoApprovalRate = totalReviewed > 0
      ? (totalApproved / totalReviewed) * 100
      : 0;
    
    return {
      totalPending,
      totalApproved,
      totalRejected,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      autoApprovalRate: Math.round(autoApprovalRate * 10) / 10,
    };
  }
  
  /**
   * Deliver approved content
   */
  private async deliverApprovedContent(contentId: string, userId: string): Promise<void> {
    activityMonitor.logActivity('info', `📤 Auto-delivering approved content: ${contentId}`);
    
    // Get content
    const allContent = await storage.getGeneratedContent(userId);
    const content = allContent.find((c: any) => c.id === contentId);
    
    if (!content) {
      throw new Error('Content not found');
    }
    
    // Get template to find associated output channels
    if (!content.templateId) {
      activityMonitor.logActivity('warning', 'No template ID, skipping auto-delivery');
      return;
    }
    
    const template = await storage.getContentTemplate(content.templateId, userId);
    
    if (!template) {
      activityMonitor.logActivity('warning', 'Template not found, skipping auto-delivery');
      return;
    }
    
    // Deliver via configured channels
    try {
      await deliveryService.deliver({
        content: content.content,
        contentId: content.id,
        userId: userId,
        templateId: content.templateId || undefined,
      });
      
      activityMonitor.logActivity('success', `📤 Auto-delivered content: ${contentId}`);
    } catch (error: any) {
      activityMonitor.logError(error, 'Auto-delivery');
      throw error;
    }
  }
}

export const reviewQueueService = new ReviewQueueService();


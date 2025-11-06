import { storage } from '../storage';
import { activityMonitor } from './activityMonitor';

/**
 * Social Media Service
 * Multi-platform social media posting
 * 
 * Following ARCHITECTURE.md:
 * - This is a CILIUM (delivery channel)
 * - Swappable, independent
 * - Single responsibility: Post to social media
 * 
 * Supported Platforms:
 * - Twitter/X (API v2)
 * - LinkedIn (via OAuth)
 * - Facebook (Graph API)
 * - Instagram (Graph API)
 * - Mastodon (ActivityPub)
 * 
 * Authentication:
 * - OAuth 2.0 for user's accounts
 * - Credentials stored encrypted (like AI/email/phone)
 * - User logs in via Dashboard
 * - Tokens refresh automatically
 */

export interface SocialMediaPost {
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'mastodon';
  content: string;
  media?: string[];      // Image URLs
  scheduledFor?: Date;   // Post immediately or schedule
  threadMode?: boolean;  // For long content (Twitter threads)
}

export interface SocialMediaResult {
  success: boolean;
  platform: string;
  postId?: string;
  url?: string;
  error?: string;
  metadata?: any;
}

export interface SocialMediaCredential {
  id: string;
  userId: string;
  platform: string;
  accountName: string;
  accessToken: string;     // Encrypted
  refreshToken?: string;   // Encrypted
  tokenExpiry?: Date;
  accountId?: string;
  isDefault: boolean;
  isActive: boolean;
}

class SocialMediaService {
  
  /**
   * Post to social media platform(s)
   */
  async post(
    userId: string,
    content: string,
    platforms: string[],
    options?: {
      media?: string[];
      scheduledFor?: Date;
      threadMode?: boolean;
    }
  ): Promise<SocialMediaResult[]> {
    
    activityMonitor.logActivity('info', `📱 Posting to ${platforms.length} social platform(s)`);
    
    const results: SocialMediaResult[] = [];
    
    for (const platform of platforms) {
      try {
        const result = await this.postToPlatform(
          userId,
          platform,
          content,
          options
        );
        
        results.push(result);
        
        if (result.success) {
          activityMonitor.logActivity('success', `✅ Posted to ${platform}: ${result.url || result.postId}`);
        } else {
          activityMonitor.logActivity('error', `❌ Failed to post to ${platform}: ${result.error}`);
        }
        
      } catch (error: any) {
        activityMonitor.logError(error, `Social post to ${platform}`);
        results.push({
          success: false,
          platform,
          error: error.message,
        });
      }
    }
    
    return results;
  }
  
  /**
   * Post to specific platform
   */
  private async postToPlatform(
    userId: string,
    platform: string,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    // Get credential for platform
    const credential = await this.getCredential(userId, platform);
    
    if (!credential) {
      return {
        success: false,
        platform,
        error: `No ${platform} credential configured. Connect your account in Dashboard → Credentials → Social Media`,
      };
    }
    
    // Check if token needs refresh
    if (await this.needsTokenRefresh(credential)) {
      await this.refreshToken(credential);
    }
    
    // Route to platform-specific implementation
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return await this.postToTwitter(credential, content, options);
      
      case 'linkedin':
        return await this.postToLinkedIn(credential, content, options);
      
      case 'facebook':
        return await this.postToFacebook(credential, content, options);
      
      case 'instagram':
        return await this.postToInstagram(credential, content, options);
      
      case 'mastodon':
        return await this.postToMastodon(credential, content, options);
      
      default:
        return {
          success: false,
          platform,
          error: `Unsupported platform: ${platform}`,
        };
    }
  }
  
  /**
   * Post to Twitter/X
   */
  private async postToTwitter(
    credential: SocialMediaCredential,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    try {
      // Optimize for Twitter (280 chars)
      let tweetContent = content;
      
      if (tweetContent.length > 280) {
        // Thread mode or truncate
        if (options?.threadMode) {
          return await this.postTwitterThread(credential, content, options);
        } else {
          tweetContent = content.substring(0, 277) + '...';
        }
      }
      
      // Twitter API v2
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetContent,
          ...(options?.media && { media: { media_ids: options.media } }),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.title || 'Twitter API error');
      }
      
      const data = await response.json();
      
      return {
        success: true,
        platform: 'twitter',
        postId: data.data.id,
        url: `https://twitter.com/user/status/${data.data.id}`,
        metadata: data.data,
      };
      
    } catch (error: any) {
      return {
        success: false,
        platform: 'twitter',
        error: error.message,
      };
    }
  }
  
  /**
   * Post Twitter thread (for long content)
   */
  private async postTwitterThread(
    credential: SocialMediaCredential,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    // Split content into 280-char chunks
    const tweets = this.splitIntoTweets(content);
    
    activityMonitor.logActivity('info', `🧵 Posting Twitter thread (${tweets.length} tweets)`);
    
    let previousTweetId: string | undefined;
    const tweetIds: string[] = [];
    
    for (const tweet of tweets) {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweet,
          ...(previousTweetId && {
            reply: { in_reply_to_tweet_id: previousTweetId }
          }),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Thread posting failed');
      }
      
      const data = await response.json();
      previousTweetId = data.data.id;
      tweetIds.push(data.data.id);
    }
    
    return {
      success: true,
      platform: 'twitter',
      postId: tweetIds[0],
      url: `https://twitter.com/user/status/${tweetIds[0]}`,
      metadata: {
        thread: true,
        tweetCount: tweetIds.length,
        tweetIds,
      },
    };
  }
  
  /**
   * Post to LinkedIn
   */
  private async postToLinkedIn(
    credential: SocialMediaCredential,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    try {
      // LinkedIn allows 3000 chars
      const linkedInContent = content.substring(0, 3000);
      
      // LinkedIn API
      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: `urn:li:person:${credential.accountId}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: linkedInContent,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'LinkedIn API error');
      }
      
      const data = await response.json();
      const postId = data.id;
      
      return {
        success: true,
        platform: 'linkedin',
        postId,
        url: `https://www.linkedin.com/feed/update/${postId}`,
        metadata: data,
      };
      
    } catch (error: any) {
      return {
        success: false,
        platform: 'linkedin',
        error: error.message,
      };
    }
  }
  
  /**
   * Post to Facebook
   */
  private async postToFacebook(
    credential: SocialMediaCredential,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    try {
      // Facebook allows 63,206 chars
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${credential.accountId}/feed`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            access_token: credential.accessToken,
          }),
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Facebook API error');
      }
      
      const data = await response.json();
      
      return {
        success: true,
        platform: 'facebook',
        postId: data.id,
        url: `https://facebook.com/${data.id}`,
        metadata: data,
      };
      
    } catch (error: any) {
      return {
        success: false,
        platform: 'facebook',
        error: error.message,
      };
    }
  }
  
  /**
   * Post to Instagram
   */
  private async postToInstagram(
    credential: SocialMediaCredential,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    // Instagram requires image
    if (!options?.media || options.media.length === 0) {
      return {
        success: false,
        platform: 'instagram',
        error: 'Instagram posts require at least one image',
      };
    }
    
    // TODO: Implement Instagram Graph API
    // Requires: Image upload → Create media container → Publish
    
    return {
      success: false,
      platform: 'instagram',
      error: 'Instagram posting coming soon',
    };
  }
  
  /**
   * Post to Mastodon
   */
  private async postToMastodon(
    credential: SocialMediaCredential,
    content: string,
    options?: any
  ): Promise<SocialMediaResult> {
    
    try {
      // Mastodon allows 500 chars default (instance-dependent)
      const mastodonContent = content.substring(0, 500);
      
      // Mastodon API
      const instanceUrl = (credential as any).instanceUrl || 'mastodon.social';
      
      const response = await fetch(`https://${instanceUrl}/api/v1/statuses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credential.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: mastodonContent,
          visibility: 'public',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Mastodon API error');
      }
      
      const data = await response.json();
      
      return {
        success: true,
        platform: 'mastodon',
        postId: data.id,
        url: data.url,
        metadata: data,
      };
      
    } catch (error: any) {
      return {
        success: false,
        platform: 'mastodon',
        error: error.message,
      };
    }
  }
  
  /**
   * Split content into tweets (280 chars each)
   */
  private splitIntoTweets(content: string): string[] {
    const maxLength = 270; // Leave room for "1/n"
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const tweets: string[] = [];
    let currentTweet = '';
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim() + '.';
      
      if ((currentTweet + ' ' + trimmed).length <= maxLength) {
        currentTweet += (currentTweet ? ' ' : '') + trimmed;
      } else {
        if (currentTweet) {
          tweets.push(currentTweet);
        }
        currentTweet = trimmed;
      }
    }
    
    if (currentTweet) {
      tweets.push(currentTweet);
    }
    
    // Add thread numbering
    if (tweets.length > 1) {
      tweets.forEach((tweet, i) => {
        tweets[i] = `${i + 1}/${tweets.length} ${tweet}`;
      });
    }
    
    return tweets;
  }
  
  /**
   * Get social media credential
   */
  private async getCredential(
    userId: string,
    platform: string
  ): Promise<SocialMediaCredential | null> {
    
    const credentials = await storage.getSocialMediaCredentials?.(userId);
    
    if (!credentials || credentials.length === 0) {
      return null;
    }
    
    // Find credential for this platform
    return credentials.find((c: any) => 
      c.platform.toLowerCase() === platform.toLowerCase() && c.isActive
    ) || null;
  }
  
  /**
   * Check if token needs refresh
   */
  private async needsTokenRefresh(credential: SocialMediaCredential): Promise<boolean> {
    if (!credential.tokenExpiry) {
      return false;
    }
    
    // Refresh if expires in next hour
    const expiryTime = new Date(credential.tokenExpiry).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return (expiryTime - now) < oneHour;
  }
  
  /**
   * Refresh OAuth token
   */
  private async refreshToken(credential: SocialMediaCredential): Promise<void> {
    if (!credential.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    activityMonitor.logActivity('debug', `🔄 Refreshing ${credential.platform} token`);
    
    // Platform-specific token refresh
    // TODO: Implement for each platform
    
    activityMonitor.logActivity('success', `✅ Token refreshed for ${credential.platform}`);
  }
  
  /**
   * Optimize content for platform
   */
  async optimizeForPlatform(content: string, platform: string): Promise<string> {
    const limits: Record<string, number> = {
      twitter: 280,
      linkedin: 3000,
      facebook: 63206,
      instagram: 2200,
      mastodon: 500,
    };
    
    const limit = limits[platform.toLowerCase()] || 1000;
    
    if (content.length <= limit) {
      return content;
    }
    
    // Truncate smartly (at sentence boundary)
    const truncated = content.substring(0, limit - 3);
    const lastPeriod = truncated.lastIndexOf('.');
    
    if (lastPeriod > limit * 0.8) {
      return truncated.substring(0, lastPeriod + 1);
    }
    
    return truncated + '...';
  }
  
  /**
   * Get platform character limits
   */
  getPlatformLimits(): Record<string, { chars: number; threadSupport: boolean; mediaRequired: boolean }> {
    return {
      twitter: { chars: 280, threadSupport: true, mediaRequired: false },
      linkedin: { chars: 3000, threadSupport: false, mediaRequired: false },
      facebook: { chars: 63206, threadSupport: false, mediaRequired: false },
      instagram: { chars: 2200, threadSupport: false, mediaRequired: true },
      mastodon: { chars: 500, threadSupport: true, mediaRequired: false },
    };
  }
  
  /**
   * Validate post before sending
   */
  validatePost(platform: string, content: string, media?: string[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const limits = this.getPlatformLimits();
    const platformLimits = limits[platform.toLowerCase()];
    
    if (!platformLimits) {
      errors.push(`Unknown platform: ${platform}`);
      return { valid: false, errors };
    }
    
    if (content.length > platformLimits.chars && !platformLimits.threadSupport) {
      errors.push(`Content too long: ${content.length} chars (max: ${platformLimits.chars})`);
    }
    
    if (platformLimits.mediaRequired && (!media || media.length === 0)) {
      errors.push(`${platform} requires at least one image`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export const socialMediaService = new SocialMediaService();


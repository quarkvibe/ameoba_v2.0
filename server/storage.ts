import {
  users,
  campaigns,
  emailLogs,
  emailConfigurations,
  queueJobs,
  agentConversations,
  systemConfigurations,
  type User,
  type UpsertUser,
  type Campaign,
  type InsertCampaign,
  type EmailLog,
  type InsertEmailLog,
  type EmailConfiguration,
  type InsertEmailConfiguration,
  type QueueJob,
  type InsertQueueJob,
  type AgentConversation,
  type InsertAgentConversation,
  type SystemConfiguration,
  type InsertSystemConfiguration,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, count, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Campaign operations
  getCampaigns(userId: string): Promise<Campaign[]>;
  getCampaign(id: string, userId: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, userId: string, updates: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string, userId: string): Promise<boolean>;
  
  // Email log operations
  getEmailLogs(userId: string, limit?: number): Promise<EmailLog[]>;
  createEmailLog(log: InsertEmailLog): Promise<EmailLog>;
  updateEmailLogStatus(id: string, status: string, metadata?: any): Promise<void>;
  getEmailMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  
  // Email configuration operations
  getEmailConfigurations(userId: string): Promise<EmailConfiguration[]>;
  getDefaultEmailConfiguration(userId: string): Promise<EmailConfiguration | undefined>;
  createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration>;
  updateEmailConfiguration(id: string, userId: string, updates: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration | undefined>;
  
  // Queue operations
  getQueueJobs(status?: string, limit?: number): Promise<QueueJob[]>;
  createQueueJob(job: InsertQueueJob): Promise<QueueJob>;
  updateQueueJob(id: string, updates: Partial<QueueJob>): Promise<void>;
  getQueueMetrics(): Promise<any>;
  
  // Agent operations
  getAgentConversations(userId: string, limit?: number): Promise<AgentConversation[]>;
  createAgentConversation(conversation: InsertAgentConversation): Promise<AgentConversation>;
  
  // System configuration operations
  getSystemConfiguration(userId: string, key: string): Promise<SystemConfiguration | undefined>;
  setSystemConfiguration(config: InsertSystemConfiguration): Promise<SystemConfiguration>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Campaign operations
  async getCampaigns(userId: string): Promise<Campaign[]> {
    return await db.select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string, userId: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, userId: string, updates: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)))
      .returning();
    return updated;
  }

  async deleteCampaign(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Email log operations
  async getEmailLogs(userId: string, limit = 50): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .orderBy(desc(emailLogs.queuedAt))
      .limit(limit);
  }

  async createEmailLog(log: InsertEmailLog): Promise<EmailLog> {
    const [newLog] = await db.insert(emailLogs).values(log).returning();
    return newLog;
  }

  async updateEmailLogStatus(id: string, status: string, metadata?: any): Promise<void> {
    const updates: any = { status };
    
    if (status === 'sent') updates.sentAt = new Date();
    if (status === 'delivered') updates.deliveredAt = new Date();
    if (status === 'bounced') updates.bouncedAt = new Date();
    if (status === 'failed') updates.failedAt = new Date();
    if (metadata) updates.metadata = metadata;

    await db.update(emailLogs)
      .set(updates)
      .where(eq(emailLogs.id, id));
  }

  async getEmailMetrics(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const whereClause = startDate && endDate 
      ? and(
          eq(emailLogs.userId, userId),
          gte(emailLogs.queuedAt, startDate),
          lte(emailLogs.queuedAt, endDate)
        )
      : eq(emailLogs.userId, userId);

    const [metrics] = await db.select({
      total: count(),
      sent: sql<number>`sum(case when status = 'sent' then 1 else 0 end)`,
      delivered: sql<number>`sum(case when status = 'delivered' then 1 else 0 end)`,
      bounced: sql<number>`sum(case when status = 'bounced' then 1 else 0 end)`,
      failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
    }).from(emailLogs).where(whereClause);

    return metrics;
  }

  // Email configuration operations
  async getEmailConfigurations(userId: string): Promise<EmailConfiguration[]> {
    return await db.select()
      .from(emailConfigurations)
      .where(eq(emailConfigurations.userId, userId))
      .orderBy(desc(emailConfigurations.isDefault));
  }

  async getDefaultEmailConfiguration(userId: string): Promise<EmailConfiguration | undefined> {
    const [config] = await db.select()
      .from(emailConfigurations)
      .where(and(
        eq(emailConfigurations.userId, userId),
        eq(emailConfigurations.isDefault, true),
        eq(emailConfigurations.isActive, true)
      ));
    return config;
  }

  async createEmailConfiguration(config: InsertEmailConfiguration): Promise<EmailConfiguration> {
    const [newConfig] = await db.insert(emailConfigurations).values(config).returning();
    return newConfig;
  }

  async updateEmailConfiguration(id: string, userId: string, updates: Partial<InsertEmailConfiguration>): Promise<EmailConfiguration | undefined> {
    const [updated] = await db.update(emailConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(emailConfigurations.id, id), eq(emailConfigurations.userId, userId)))
      .returning();
    return updated;
  }

  // Queue operations
  async getQueueJobs(status?: string, limit = 100): Promise<QueueJob[]> {
    const whereClause = status ? eq(queueJobs.status, status) : undefined;
    
    return await db.select()
      .from(queueJobs)
      .where(whereClause)
      .orderBy(desc(queueJobs.createdAt))
      .limit(limit);
  }

  async createQueueJob(job: InsertQueueJob): Promise<QueueJob> {
    const [newJob] = await db.insert(queueJobs).values(job).returning();
    return newJob;
  }

  async updateQueueJob(id: string, updates: Partial<QueueJob>): Promise<void> {
    await db.update(queueJobs)
      .set(updates)
      .where(eq(queueJobs.id, id));
  }

  async getQueueMetrics(): Promise<any> {
    const [metrics] = await db.select({
      total: count(),
      pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
      processing: sql<number>`sum(case when status = 'processing' then 1 else 0 end)`,
      completed: sql<number>`sum(case when status = 'completed' then 1 else 0 end)`,
      failed: sql<number>`sum(case when status = 'failed' then 1 else 0 end)`,
    }).from(queueJobs);

    return metrics;
  }

  // Agent operations
  async getAgentConversations(userId: string, limit = 20): Promise<AgentConversation[]> {
    return await db.select()
      .from(agentConversations)
      .where(eq(agentConversations.userId, userId))
      .orderBy(desc(agentConversations.createdAt))
      .limit(limit);
  }

  async createAgentConversation(conversation: InsertAgentConversation): Promise<AgentConversation> {
    const [newConversation] = await db.insert(agentConversations).values(conversation).returning();
    return newConversation;
  }

  // System configuration operations
  async getSystemConfiguration(userId: string, key: string): Promise<SystemConfiguration | undefined> {
    const [config] = await db.select()
      .from(systemConfigurations)
      .where(and(eq(systemConfigurations.userId, userId), eq(systemConfigurations.key, key)));
    return config;
  }

  async setSystemConfiguration(config: InsertSystemConfiguration): Promise<SystemConfiguration> {
    const [newConfig] = await db.insert(systemConfigurations)
      .values(config)
      .onConflictDoUpdate({
        target: [systemConfigurations.userId, systemConfigurations.key],
        set: {
          value: config.value,
          updatedAt: new Date(),
        },
      })
      .returning();
    return newConfig;
  }
}

export const storage = new DatabaseStorage();

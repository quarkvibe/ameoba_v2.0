import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email configurations
export const emailConfigurations = pgTable("email_configurations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  provider: varchar("provider").notNull(), // 'sendgrid', 'ses', etc.
  apiKey: text("api_key").notNull(),
  fromEmail: varchar("from_email").notNull(),
  fromName: varchar("from_name"),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email campaigns
export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  status: varchar("status").notNull().default('draft'), // 'draft', 'active', 'paused', 'completed'
  type: varchar("type").notNull(), // 'broadcast', 'sequence', 'trigger'
  triggerEvent: varchar("trigger_event"), // 'signup', 'purchase', etc.
  scheduleType: varchar("schedule_type"), // 'immediate', 'scheduled', 'recurring'
  scheduledAt: timestamp("scheduled_at"),
  cronExpression: varchar("cron_expression"),
  recipients: jsonb("recipients"), // array of email addresses or query conditions
  metadata: jsonb("metadata"), // additional campaign data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email logs
export const emailLogs = pgTable("email_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  userId: varchar("user_id").references(() => users.id),
  recipient: varchar("recipient").notNull(),
  subject: varchar("subject").notNull(),
  provider: varchar("provider").notNull(),
  status: varchar("status").notNull(), // 'queued', 'sent', 'delivered', 'bounced', 'failed'
  providerMessageId: varchar("provider_message_id"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
  queuedAt: timestamp("queued_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  bouncedAt: timestamp("bounced_at"),
  failedAt: timestamp("failed_at"),
});

// Queue jobs
export const queueJobs = pgTable("queue_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: varchar("type").notNull(), // 'email', 'campaign', 'cleanup'
  status: varchar("status").notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed'
  priority: integer("priority").default(0),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  data: jsonb("data").notNull(),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
});

// Agent conversations
export const agentConversations = pgTable("agent_conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: jsonb("context"), // conversation context and metadata
  createdAt: timestamp("created_at").defaultNow(),
});

// System configurations
export const systemConfigurations = pgTable("system_configurations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  key: varchar("key").notNull(),
  value: jsonb("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  emailConfigurations: many(emailConfigurations),
  campaigns: many(campaigns),
  emailLogs: many(emailLogs),
  agentConversations: many(agentConversations),
  systemConfigurations: many(systemConfigurations),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  user: one(users, {
    fields: [campaigns.userId],
    references: [users.id],
  }),
  emailLogs: many(emailLogs),
}));

export const emailLogsRelations = relations(emailLogs, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [emailLogs.campaignId],
    references: [campaigns.id],
  }),
  user: one(users, {
    fields: [emailLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertEmailConfigurationSchema = createInsertSchema(emailConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  queuedAt: true,
  sentAt: true,
  deliveredAt: true,
  bouncedAt: true,
  failedAt: true,
});

export const insertQueueJobSchema = createInsertSchema(queueJobs).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  completedAt: true,
  failedAt: true,
});

export const insertAgentConversationSchema = createInsertSchema(agentConversations).omit({
  id: true,
  createdAt: true,
});

export const insertSystemConfigurationSchema = createInsertSchema(systemConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type EmailConfiguration = typeof emailConfigurations.$inferSelect;
export type InsertEmailConfiguration = z.infer<typeof insertEmailConfigurationSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type QueueJob = typeof queueJobs.$inferSelect;
export type InsertQueueJob = z.infer<typeof insertQueueJobSchema>;
export type AgentConversation = typeof agentConversations.$inferSelect;
export type InsertAgentConversation = z.infer<typeof insertAgentConversationSchema>;
export type SystemConfiguration = typeof systemConfigurations.$inferSelect;
export type InsertSystemConfiguration = z.infer<typeof insertSystemConfigurationSchema>;

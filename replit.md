# Overview

Amoeba is an intelligent email operations microservice with a comprehensive dashboard interface. It's designed as a self-contained email utility that combines an AI agent with a sleek management interface, allowing users to control email operations through both a visual dashboard and natural language commands. The system supports multiple email providers (SendGrid, AWS SES), campaign management, queue processing, and real-time monitoring.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client is built with React and TypeScript using a modern component-based architecture:

- **UI Framework**: React with TypeScript for type safety
- **Styling**: Tailwind CSS with a custom design system using CSS variables
- **Component Library**: Radix UI primitives with custom shadcn/ui components
- **State Management**: TanStack React Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket integration for live dashboard updates

The frontend follows a dashboard-centric design with modular components for metrics, campaigns, queue monitoring, and AI agent interaction.

## Backend Architecture

The server is built with Express.js and follows a service-oriented pattern:

- **Web Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: Replit OIDC integration with session management
- **Real-time Communication**: WebSocket server for live updates
- **Service Layer**: Modular services for email operations, queue management, and AI agent

Key services include:
- **EmailService**: Handles multi-provider email sending (SendGrid, AWS SES)
- **QueueService**: Manages email queue processing with configurable workers
- **AIAgent**: OpenAI-powered conversational interface for email operations
- **Storage**: Database abstraction layer for all data operations

## Database Design

Uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **Users**: Authentication and user management
- **Email Configurations**: Multi-provider email service settings
- **Campaigns**: Email campaign management and tracking
- **Email Logs**: Comprehensive email delivery tracking
- **Queue Jobs**: Asynchronous email processing queue
- **Agent Conversations**: AI agent interaction history
- **System Configurations**: Application-wide settings
- **Sessions**: Secure session storage for authentication

## Authentication & Authorization

Implements Replit OIDC authentication with secure session management:

- **OpenID Connect**: Integration with Replit's authentication system
- **Session Management**: PostgreSQL-backed session storage with configurable TTL
- **Route Protection**: Middleware-based authentication for API endpoints
- **User Context**: Secure user identification across all operations

## Queue Management

Sophisticated email queue processing system:

- **Multi-worker Processing**: Configurable number of concurrent workers
- **Job Prioritization**: Support for different job types and priorities
- **Retry Logic**: Automatic retry with exponential backoff
- **Real-time Monitoring**: Live queue metrics and status updates
- **Pause/Resume Controls**: Administrative controls for queue management

## AI Agent Integration

OpenAI-powered conversational interface for email operations:

- **Natural Language Processing**: GPT-based understanding of user commands
- **Context Awareness**: Integration with system metrics and user data
- **Action Execution**: Ability to perform email operations based on conversation
- **Learning System**: Conversation history for improved responses
- **Suggestion Engine**: Proactive recommendations based on email performance

# External Dependencies

## Email Service Providers

- **SendGrid**: Primary email delivery service with API key authentication
- **AWS SES**: Secondary/backup email provider with IAM credential authentication
- **Multi-provider Fallback**: Automatic failover between email providers

## Database & Storage

- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Connection Pooling**: Neon serverless connection management
- **Migration System**: Drizzle Kit for database schema management

## AI & Machine Learning

- **OpenAI API**: GPT model integration for intelligent agent capabilities
- **Natural Language Processing**: Conversation understanding and response generation

## Authentication Services

- **Replit OIDC**: External authentication provider integration
- **OpenID Connect**: Standard authentication protocol implementation

## Development & Build Tools

- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **Tailwind CSS**: Utility-first styling framework
- **ESBuild**: Fast JavaScript bundling for production builds

## Monitoring & Real-time Features

- **WebSocket**: Real-time communication for live dashboard updates
- **Query Invalidation**: Automatic data refresh on state changes
- **Error Tracking**: Comprehensive error handling and logging

The system is designed for deployment as a single service with all dependencies managed through environment variables, making it easily deployable to various hosting platforms while maintaining full functionality.
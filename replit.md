# Overview

Amoeba is a universal AI content generation and dissemination platform. It's a self-contained microservice that allows users to bring their own API keys for any AI provider (OpenAI, Anthropic, etc.), configure content generation workflows with precision (prompts, token limits, parameters), and automate delivery via scheduled email or API endpoints. The system features a comprehensive dashboard with real-time monitoring, queue processing, and an AI agent for natural language control.

# User Preferences

Preferred communication style: Simple, everyday language.

# Core Features

## Bring Your Own Keys
- Users supply their own API keys for AI providers (OpenAI, Anthropic, etc.)
- Users supply their own email service credentials (SendGrid, AWS SES, etc.)
- Secure encrypted storage of all credentials
- No vendor lock-in - use any provider you want

## Workflow Configuration
- Create custom AI content generation workflows
- Configure prompts, token limits, model parameters
- Define variables and dynamic content substitution
- Reusable workflow templates

## Delivery Options
- **Scheduled Email**: Cron-based scheduling with user-supplied email service credentials
- **API Delivery**: Generate API keys for curl-based content retrieval
- **Webhook Support**: Push content to external endpoints
- **Queue Processing**: Reliable async delivery with retry logic

## Real-time Monitoring
- Live dashboard with WebSocket updates
- Queue status and metrics
- Execution logs and error tracking
- Terminal console for command execution

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
- **AIProviderRegistry**: Manages multiple AI providers with user-supplied credentials
- **GenerationEngine**: Executes workflows against configured AI providers
- **DeliveryService**: Handles multi-channel delivery (email, API, webhook)
- **QueueService**: Manages async processing with configurable workers
- **AIAgent**: Conversational interface for workflow control
- **Storage**: Database abstraction layer for all data operations

## Database Design

Uses PostgreSQL with Drizzle ORM for type-safe database operations:

- **Users**: Authentication and user management
- **AI Credentials**: User-supplied API keys for AI providers (encrypted)
- **Email Credentials**: User-supplied credentials for email services (encrypted)
- **Workflows**: Content generation configurations (prompts, models, parameters)
- **Executions**: Workflow execution history and results
- **Delivery Configs**: Scheduled email and API delivery settings
- **API Keys**: Generated keys for curl-based content access
- **Queue Jobs**: Asynchronous workflow processing queue
- **Agent Conversations**: AI agent interaction history
- **Sessions**: Secure session storage for authentication

## Authentication & Authorization

Implements Replit OIDC authentication with secure session management:

- **OpenID Connect**: Integration with Replit's authentication system
- **Session Management**: PostgreSQL-backed session storage with configurable TTL
- **Route Protection**: Middleware-based authentication for API endpoints
- **User Context**: Secure user identification across all operations

## Queue Management

Sophisticated workflow queue processing system:

- **Multi-worker Processing**: Configurable number of concurrent workers
- **Job Prioritization**: Support for different job types and priorities
- **Retry Logic**: Automatic retry with exponential backoff
- **Real-time Monitoring**: Live queue metrics and status updates
- **Pause/Resume Controls**: Administrative controls for queue management

## AI Agent Integration

OpenAI-powered conversational interface for workflow operations:

- **Natural Language Processing**: GPT-based understanding of user commands
- **Context Awareness**: Integration with system metrics and user data
- **Action Execution**: Ability to perform workflow operations based on conversation
- **Learning System**: Conversation history for improved responses
- **Suggestion Engine**: Proactive recommendations based on workflow performance

# External Dependencies

## AI Service Providers (User-Supplied)

- **OpenAI**: User provides their own API keys for GPT models
- **Anthropic**: User provides their own API keys for Claude models
- **Other Providers**: Extensible architecture for any AI provider with API access
- **Multi-provider Support**: Users can configure multiple providers with different workflows

## Email Service Providers (User-Supplied)

- **SendGrid**: User provides API key for email delivery
- **AWS SES**: User provides IAM credentials for email delivery
- **Other Email Services**: Extensible support for additional email providers

## Database & Storage

- **PostgreSQL**: Primary database using Neon serverless PostgreSQL
- **Connection Pooling**: Neon serverless connection management
- **Migration System**: Drizzle Kit for database schema management

## AI & Machine Learning

- **AI Provider Registry**: Modular system supporting multiple AI providers
- **User-Managed Credentials**: Secure storage of user-supplied API keys
- **Workflow Engine**: Configurable content generation with custom prompts and parameters
- **Natural Language Processing**: Dashboard agent for conversation-based control

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

# Current Implementation Status

## Completed Features
- Landing page updated to reflect universal AI generator platform
- Dashboard with WebSocket-based real-time updates
- Terminal console for command execution
- Queue processing system with retry logic
- Session-based authentication with Replit OIDC

## In Progress / Planned
- Provider-agnostic data model for workflows and credentials
- AI Provider Registry for multi-provider support
- Workflow configuration UI
- API key generation for curl-based content delivery
- User-supplied credential management (AI providers, email services)
# Amoeba Horoscope Service - Integration Guide

## Overview

Amoeba is an intelligent horoscope microservice designed to integrate seamlessly with external applications like Zodiac Buddy. It provides AI-generated daily horoscopes, premium email distribution, and comprehensive API access for third-party integrations.

## Quick Start for Zodiac Buddy Integration

### 1. API Key Setup

First, you'll need to generate an API key for your Zodiac Buddy application:

**Contact the Amoeba service administrator to obtain an API key with these permissions:**
- `read:horoscopes` - Access daily horoscopes
- `read:bulk` - Bulk horoscope exports (optional)
- `read:analytics` - Integration analytics (optional)

### 2. Health Check

Verify the service is running:

```bash
curl https://your-amoeba-instance.com/api/integration/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "Amoeba Horoscope Service",
  "version": "1.0.0",
  "timestamp": "2025-09-10T04:00:00.000Z"
}
```

### 3. Get Today's Horoscopes

Fetch all 12 zodiac sign horoscopes for today:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-amoeba-instance.com/api/integration/horoscopes/today
```

Response format:
```json
{
  "date": "2025-09-10",
  "horoscopes": [
    {
      "sign": "aries",
      "content": "Today brings exciting opportunities for new beginnings...",
      "mood": "positive",
      "luckNumber": 7,
      "luckyColor": "red",
      "date": "2025-09-10",
      "generatedAt": "2025-09-10T00:15:00.000Z"
    }
    // ... 11 more signs
  ],
  "total": 12
}
```

### 4. Get Specific Horoscope

Fetch a horoscope for a specific sign and date:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-amoeba-instance.com/api/integration/horoscopes/leo/2025-09-10
```

## API Endpoints

### Base URL
`https://your-amoeba-instance.com/api/integration`

### Authentication
All API endpoints (except health check) require authentication using API keys:

```
Authorization: Bearer YOUR_API_KEY
```

### Rate Limits
- Daily horoscopes: 200 requests/minute
- Specific horoscopes: 500 requests/minute  
- Bulk exports: 10 requests/minute
- Analytics: 50 requests/minute

### Available Endpoints

#### 1. Health Check
```
GET /health
```
No authentication required. Returns service status.

#### 2. Today's Horoscopes
```
GET /horoscopes/today
```
**Required Permission:** `read:horoscopes`

Returns all 12 zodiac sign horoscopes for the current date.

#### 3. Specific Horoscope
```
GET /horoscopes/{sign}/{date}
```
**Required Permission:** `read:horoscopes`

Parameters:
- `sign`: Zodiac sign (aries, taurus, gemini, cancer, leo, virgo, libra, scorpio, sagittarius, capricorn, aquarius, pisces)
- `date`: Date in YYYY-MM-DD format

#### 4. Bulk Export
```
GET /horoscopes/bulk/{startDate}/{endDate}
```
**Required Permission:** `read:bulk`

Parameters:
- `startDate`, `endDate`: Date range in YYYY-MM-DD format (max 30 days)

Returns horoscopes for all signs within the date range.

#### 5. Integration Analytics
```
GET /analytics?days=7
```
**Required Permission:** `read:analytics`

Returns API usage statistics for monitoring integration health.

## Webhook Notifications (Optional)

Set up webhooks to receive real-time notifications when new horoscopes are generated:

### Register a Webhook
```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Zodiac Buddy Webhook",
       "url": "https://your-zodiac-buddy-app.com/api/webhooks/amoeba",
       "events": ["horoscopes.daily_complete"]
     }' \
     https://your-amoeba-instance.com/api/integration/webhooks
```

### Webhook Events

1. **`horoscopes.daily_complete`** - Triggered when all 12 daily horoscopes are generated
   ```json
   {
     "event": "horoscopes.daily_complete",
     "timestamp": "2025-09-10T00:15:00.000Z",
     "data": {
       "date": "2025-09-10",
       "completedCount": 12,
       "totalSigns": 12,
       "timestamp": "2025-09-10T00:15:00.000Z"
     }
   }
   ```

### Webhook Security

Webhooks include signature verification:
- Header: `X-Amoeba-Signature: sha256=<signature>`
- Header: `X-Amoeba-Event: <event_type>`

Verify the signature using HMAC-SHA256 with your webhook secret.

## Sample Integration Code

### Node.js/JavaScript Example

```javascript
class AmoebaClient {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async getTodaysHoroscopes() {
    const response = await fetch(`${this.baseUrl}/horoscopes/today`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getHoroscope(sign, date) {
    const response = await fetch(`${this.baseUrl}/horoscopes/${sign}/${date}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
}

// Usage
const amoeba = new AmoebaClient('your-api-key', 'https://your-amoeba-instance.com/api/integration');

// Get today's horoscopes
const todaysHoroscopes = await amoeba.getTodaysHoroscopes();

// Get specific horoscope
const leoHoroscope = await amoeba.getHoroscope('leo', '2025-09-10');
```

### Python Example

```python
import requests
from typing import Dict, List

class AmoebaClient:
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def get_todays_horoscopes(self) -> Dict:
        response = requests.get(
            f'{self.base_url}/horoscopes/today',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_horoscope(self, sign: str, date: str) -> Dict:
        response = requests.get(
            f'{self.base_url}/horoscopes/{sign}/{date}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage
amoeba = AmoebaClient('your-api-key', 'https://your-amoeba-instance.com/api/integration')

# Get today's horoscopes
todays_horoscopes = amoeba.get_todays_horoscopes()

# Get specific horoscope
leo_horoscope = amoeba.get_horoscope('leo', '2025-09-10')
```

## Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid/missing API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (horoscope not available)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

Error response format:
```json
{
  "error": "Bad Request",
  "message": "Date must be in YYYY-MM-DD format"
}
```

## Best Practices

### 1. Caching Strategy
- Cache horoscopes for at least 1 hour to reduce API calls
- Use today's horoscopes endpoint for dashboard displays
- Use specific endpoints for user-requested signs

### 2. Error Handling
- Implement exponential backoff for rate limit errors
- Cache last successful response as fallback
- Monitor API health with regular health checks

### 3. Performance
- Use bulk exports for historical data
- Implement webhook listeners for real-time updates
- Monitor integration analytics for optimization

### 4. Security
- Store API keys securely (environment variables)
- Implement webhook signature verification
- Use HTTPS for all API calls

## Deployment Configuration

When deploying the Amoeba service:

### Environment Variables
```bash
# Required
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=your-postgresql-connection-string

# Optional email configuration
SENDGRID_API_KEY=your-sendgrid-key
```

### Service Configuration
The service automatically:
- Generates daily horoscopes at 12:00 AM UTC
- Sends premium emails at 6:00 AM UTC
- Maintains 7-day horoscope history
- Provides real-time webhook notifications

### Monitoring
- Health check endpoint for uptime monitoring
- Integration analytics for usage tracking
- Webhook delivery status monitoring
- Queue processing metrics

## Support and Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Verify API key is correct and active
   - Check that key has required permissions

2. **404 Not Found**
   - Ensure date format is YYYY-MM-DD
   - Verify zodiac sign spelling (lowercase)
   - Check if horoscopes exist for requested date

3. **429 Rate Limited**
   - Implement rate limit handling with backoff
   - Consider caching strategies
   - Check if bulk endpoints are more appropriate

### Debug Information
Enable request logging to track:
- API call frequency and patterns
- Response times and success rates
- Error frequencies and types

For additional support, contact the Amoeba service administrator with:
- Your API key name (not the key itself)
- Timestamp of the issue
- Request details and error responses

## Migration from Direct Database Access

If you're currently accessing horoscope data directly from a database:

1. **Phase 1**: Implement API client alongside existing system
2. **Phase 2**: Gradually switch endpoints to use Amoeba API
3. **Phase 3**: Remove direct database dependencies
4. **Phase 4**: Enable webhooks for real-time updates

This approach ensures zero downtime during migration.
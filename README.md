# Orbit Flag Client

A simple TypeScript/JavaScript SDK for evaluating feature flags from your Orbit Flag service, similar to LaunchDarkly's client SDK.

## Installation

```bash
npm install @kurioh/client
```

## Usage

### Basic Setup

```typescript
import { OrbitFlagClient } from "@kurioh/client";

const client = new OrbitFlagClient({
  teamId: "your-team-id-here",
  context: {
    // Optional: context sent with every flag evaluation
    userId: "user-123",
    environment: "production",
    version: "1.2.0",
  },
  baseUrl: "http://localhost:3000", // Optional, defaults to localhost:3000
  timeout: 5000, // Optional, defaults to 5000ms
  enableCaching: true, // Optional, defaults to true
  cacheTTL: 300000, // Optional, defaults to 5 minutes
});
```

### Evaluating Boolean Feature Flags

The client evaluates boolean feature flags with fallback values:

```typescript
// Evaluate a feature flag (returns boolean)
const isNewFeatureEnabled = await client.evaluate("new-feature", false);

// Fallback defaults to false if not specified
const isBetaEnabled = await client.evaluate("beta-features");

// Use in conditional logic
if (await client.evaluate("maintenance-mode", false)) {
  console.log("Application is in maintenance mode");
}
```

### Error Handling

The client automatically falls back to your provided default values if:

- The API request fails
- The flag doesn't exist
- Network timeouts occur
- Any other errors happen

```typescript
// This will return false if anything goes wrong
const featureEnabled = await client.evaluate("risky-feature", false);

if (featureEnabled) {
  // Safe to use the new feature
}
```

### Caching

The client automatically caches flag values to reduce API calls:

```typescript
// First call hits the API
const value1 = await client.evaluate("cached-flag", false);

// Second call uses cached value (within TTL)
const value2 = await client.evaluate("cached-flag", false);

// Clear cache manually if needed
client.clearCache();
```

### Checking Flag Existence

```typescript
const exists = await client.flagExists("some-flag");
if (exists) {
  const value = await client.evaluate("some-flag", false);
}
```

## API Format

The client sends requests to your `/api/evaluate` endpoint in this format:

```json
{
  "teamId": "your-team-id",
  "flagKey": "flag-name",
  "context": {
    "userId": "user-123",
    "environment": "production",
    "version": "1.2.0"
  }
}
```

Note: The `context` field is only included if you provide it in the client configuration.

## Configuration Options

```typescript
interface ClientConfig {
  teamId: string; // Required: Your team ID
  context?: Record<string, any>; // Optional: Context object sent with each evaluation
  baseUrl?: string; // Optional: API base URL (default: http://localhost:3000)
  timeout?: number; // Optional: Request timeout in ms (default: 5000)
  enableCaching?: boolean; // Optional: Enable flag caching (default: true)
  cacheTTL?: number; // Optional: Cache TTL in ms (default: 300000)
}
```

## Browser and Node.js Support

The client works in both browser and Node.js environments:

- **Browser**: Uses native `fetch` API
- **Node.js 18+**: Uses built-in `fetch`
- **Node.js < 18**: Automatically imports `node-fetch` (install separately)

## TypeScript Support

Full TypeScript support with proper typing for all flag variations and configurations.

## License

MIT

# Healthcare Chain of Custody - API Documentation

## Table of Contents
- [Authentication](#authentication)
- [Core Endpoints](#core-endpoints)
- [Blockchain Endpoints](#blockchain-endpoints)
- [WebSocket Events](#websocket-events)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Base URL
```
Development: http://localhost:3000/api
Production: https://api.healthcare-chain.com/api
```

## Authentication

All API requests require authentication via JWT tokens in the Authorization header:

```bash
Authorization: Bearer <jwt_token>
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure_password"
}

Response 200:
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid_123",
      "email": "user@example.com",
      "role": "MANAGER",
      "organizationId": "org_123"
    },
    "token": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}

Response 200:
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "refreshToken": "new_refresh_token"
  }
}
```

## Core Endpoints

### Items

#### List Items
```http
GET /api/items?page=1&limit=20&status=AVAILABLE&type=SPECIMEN

Response 200:
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "item_123",
        "barcode": "HC2024001",
        "name": "Blood Sample A1",
        "type": "SPECIMEN",
        "status": "AVAILABLE",
        "currentLocation": {
          "id": "loc_123",
          "name": "Lab Storage A"
        },
        "metadata": {
          "patientId": "PATIENT123",
          "collectionDate": "2024-01-15"
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  }
}
```

#### Create Item
```http
POST /api/items
Content-Type: application/json

{
  "barcode": "HC2024002",
  "name": "Blood Sample B2",
  "type": "SPECIMEN",
  "locationId": "loc_123",
  "metadata": {
    "patientId": "PATIENT456",
    "collectionDate": "2024-01-16",
    "priority": "HIGH"
  }
}

Response 201:
{
  "success": true,
  "data": {
    "id": "item_456",
    "barcode": "HC2024002",
    "name": "Blood Sample B2",
    "type": "SPECIMEN",
    "status": "AVAILABLE",
    "createdAt": "2024-01-16T10:30:00Z"
  }
}
```

#### Transfer Item
```http
POST /api/items/:id/transfer
Content-Type: application/json

{
  "toLocationId": "loc_456",
  "notes": "Transfer for urgent analysis",
  "expectedArrival": "2024-01-16T14:00:00Z"
}

Response 200:
{
  "success": true,
  "data": {
    "custodyEventId": "custody_789",
    "fromLocation": "Lab Storage A",
    "toLocation": "Analysis Lab B",
    "status": "IN_TRANSIT",
    "transferredAt": "2024-01-16T11:00:00Z"
  }
}
```

### Custody Events

#### Get Custody Chain
```http
GET /api/items/:id/custody

Response 200:
{
  "success": true,
  "data": {
    "itemId": "item_123",
    "events": [
      {
        "id": "custody_001",
        "type": "CREATION",
        "timestamp": "2024-01-15T08:00:00Z",
        "location": "Collection Point",
        "handledBy": {
          "id": "user_123",
          "name": "John Doe"
        }
      },
      {
        "id": "custody_002",
        "type": "TRANSFER",
        "timestamp": "2024-01-15T10:00:00Z",
        "fromLocation": "Collection Point",
        "toLocation": "Lab Storage A",
        "handledBy": {
          "id": "user_456",
          "name": "Jane Smith"
        },
        "verificationMethod": "BARCODE_SCAN"
      }
    ]
  }
}
```

### IoT Monitoring

#### Get IoT Data
```http
GET /api/iot/devices/:deviceId/data?metric=temperature&from=2024-01-15&to=2024-01-16

Response 200:
{
  "success": true,
  "data": {
    "deviceId": "iot_123",
    "metric": "temperature",
    "unit": "celsius",
    "data": [
      {
        "timestamp": "2024-01-15T10:00:00Z",
        "value": -20.5,
        "inRange": true
      },
      {
        "timestamp": "2024-01-15T10:05:00Z",
        "value": -19.8,
        "inRange": true
      }
    ],
    "statistics": {
      "min": -21.0,
      "max": -19.5,
      "average": -20.2,
      "complianceRate": 100
    }
  }
}
```

#### Create IoT Alert
```http
POST /api/iot/alerts
Content-Type: application/json

{
  "deviceId": "iot_123",
  "alertType": "TEMPERATURE_HIGH",
  "severity": "CRITICAL",
  "threshold": -18.0,
  "currentValue": -15.5,
  "message": "Temperature exceeded critical threshold"
}

Response 201:
{
  "success": true,
  "data": {
    "alertId": "alert_789",
    "status": "ACTIVE",
    "createdAt": "2024-01-16T11:30:00Z",
    "workflowTriggered": true,
    "notificationsSent": 3
  }
}
```

### Workflows

#### List Workflows
```http
GET /api/workflows?active=true

Response 200:
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "workflow_123",
        "name": "Cold Chain Violation Response",
        "workflowType": "COLD_CHAIN_COMPLIANCE",
        "triggerType": "IOT_ALERT",
        "isActive": true,
        "priority": 10,
        "conditions": [
          {
            "field": "metric",
            "operator": "EQUALS",
            "value": "temperature"
          }
        ],
        "actions": [
          {
            "type": "QUARANTINE",
            "config": {
              "message": "Item quarantined due to temperature violation"
            }
          }
        ]
      }
    ]
  }
}
```

#### Execute Workflow
```http
POST /api/workflows/:id/execute
Content-Type: application/json

{
  "triggerData": {
    "itemId": "item_123",
    "alertType": "TEMPERATURE_HIGH",
    "currentValue": -15.5
  }
}

Response 200:
{
  "success": true,
  "data": {
    "instanceId": "instance_456",
    "status": "IN_PROGRESS",
    "startedAt": "2024-01-16T11:35:00Z",
    "steps": [
      {
        "stepType": "QUARANTINE",
        "status": "PENDING"
      }
    ]
  }
}
```

## Blockchain Endpoints

### Wallet Management

#### Get Organization Wallet
```http
GET /api/blockchain/wallet/:organizationId

Response 200:
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8f123",
    "network": "avalanche-fuji",
    "created": true
  }
}
```

#### Get Token Balance
```http
GET /api/blockchain/balance/:address

Response 200:
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f8f123",
    "balance": "1250.50",
    "symbol": "CHAIN",
    "totalRewards": "5420.75",
    "compliance": 92.5,
    "lastUpdated": "2024-01-16T12:00:00Z"
  }
}
```

### Rewards

#### Mint Reward (Admin Only)
```http
POST /api/blockchain/reward/mint
Content-Type: application/json
X-Admin-Key: admin_secret_key

{
  "recipientAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f8f123",
  "amount": "100",
  "reason": "Excellence in cold chain compliance",
  "organizationId": "org_123"
}

Response 200:
{
  "success": true,
  "data": {
    "transactionHash": "0x123abc...def456",
    "amount": "100",
    "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f8f123",
    "blockNumber": 12345678,
    "gasUsed": "85000"
  }
}
```

#### Issue Compliance Reward
```http
POST /api/blockchain/reward/compliance
Content-Type: application/json

{
  "organizationId": "org_123",
  "metrics": {
    "coldChainScore": 95,
    "auditTrailScore": 98,
    "responseTimeScore": 92,
    "overallScore": 95
  }
}

Response 200:
{
  "success": true,
  "data": {
    "transactionHash": "0x456def...789abc",
    "rewardAmount": "500",
    "tier": "PLATINUM",
    "complianceScore": 95,
    "message": "Platinum tier compliance reward issued"
  }
}
```

### Transaction History

#### Get Transactions
```http
GET /api/blockchain/transactions?page=1&limit=20&type=COMPLIANCE_REWARD

Response 200:
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "tx_123",
        "hash": "0x789abc...123def",
        "type": "COMPLIANCE_REWARD",
        "amount": "200",
        "status": "CONFIRMED",
        "purpose": "Gold tier compliance reward",
        "fromAddress": "0x0000...0000",
        "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f8f123",
        "timestamp": "2024-01-15T16:00:00Z",
        "blockNumber": 12345677,
        "gasUsed": "75000"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

### Network Statistics

#### Get Network Stats
```http
GET /api/blockchain/network/stats

Response 200:
{
  "success": true,
  "data": {
    "network": "avalanche-fuji",
    "chainId": 43113,
    "blockNumber": 12345680,
    "gasPrice": "25000000000",
    "contractsDeployed": true,
    "tokenAddress": "0xABC123...DEF456",
    "rewardsAddress": "0xDEF456...ABC123",
    "totalSupply": "1000000000",
    "circulatingSupply": "150000"
  }
}
```

## WebSocket Events

### Connection
```javascript
const socket = io('https://api.healthcare-chain.com', {
  auth: {
    token: 'jwt_token_here'
  }
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});
```

### Real-time Events

#### IoT Data Update
```javascript
socket.on('iot:update', (data) => {
  console.log('IoT Update:', {
    deviceId: data.deviceId,
    metric: data.metric,
    value: data.value,
    timestamp: data.timestamp,
    alert: data.alert
  });
});
```

#### Workflow Status
```javascript
socket.on('workflow:started', (data) => {
  console.log('Workflow Started:', {
    instanceId: data.instanceId,
    workflowName: data.workflowName,
    status: data.status
  });
});

socket.on('workflow:completed', (data) => {
  console.log('Workflow Completed:', {
    instanceId: data.instanceId,
    duration: data.duration,
    rewardEarned: data.rewardAmount
  });
});
```

#### Blockchain Rewards
```javascript
socket.on('reward:earned', (data) => {
  console.log('Reward Earned:', {
    amount: data.amount,
    type: data.type,
    transactionHash: data.transactionHash,
    newBalance: data.newBalance
  });
});
```

#### Alerts
```javascript
socket.on('alert:created', (data) => {
  console.log('Alert Created:', {
    alertId: data.alertId,
    severity: data.severity,
    message: data.message,
    requiresAction: data.requiresAction
  });
});
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "barcode",
      "constraint": "Must be unique"
    }
  }
}
```

### Common Error Codes
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `DUPLICATE_ENTRY` | 409 | Resource already exists |
| `BLOCKCHAIN_ERROR` | 500 | Blockchain transaction failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### Example Error Responses

#### Validation Error
```http
Response 400:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "barcode": "Barcode already exists",
      "locationId": "Location not found"
    }
  }
}
```

#### Blockchain Error
```http
Response 500:
{
  "success": false,
  "error": {
    "code": "BLOCKCHAIN_ERROR",
    "message": "Failed to mint reward tokens",
    "details": {
      "reason": "Insufficient gas",
      "estimatedGas": "150000",
      "availableGas": "100000"
    }
  }
}
```

## Rate Limiting

API endpoints are rate-limited to ensure fair usage:

| Endpoint Type | Limit | Window |
|---------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Read Operations | 100 requests | 1 minute |
| Write Operations | 30 requests | 1 minute |
| Blockchain Operations | 10 requests | 1 minute |

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642360800
```

### Rate Limit Exceeded Response
```http
Response 429:
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

## Pagination

All list endpoints support pagination:

```http
GET /api/items?page=2&limit=50&sort=createdAt&order=desc
```

### Pagination Parameters
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Field to sort by
- `order`: Sort order (asc/desc)

### Pagination Response
```json
{
  "pagination": {
    "page": 2,
    "limit": 50,
    "total": 245,
    "pages": 5,
    "hasNext": true,
    "hasPrev": true
  }
}
```

---

For more examples and detailed integration guides, visit our [Developer Portal](https://developers.healthcare-chain.com).
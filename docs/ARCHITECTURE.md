# Healthcare Chain of Custody - System Architecture

## Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Blockchain Architecture](#blockchain-architecture)
- [Deployment Architecture](#deployment-architecture)

## Overview

The Healthcare Chain of Custody application is a comprehensive system for tracking medical specimens, equipment, and supplies throughout their lifecycle. It ensures compliance, maintains audit trails, and incentivizes quality through blockchain-based rewards.

### Key Features
- Real-time IoT monitoring
- Automated workflow management
- Blockchain-based compliance rewards
- Complete audit trail
- Multi-organization support
- Role-based access control

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (Angular)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   Dashboard  │  │   Inventory  │  │  Workflows │  │   Wallet  │ │
│  │  Components  │  │  Management  │  │   Engine   │  │Integration│ │
│  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ HTTPS
┌─────────────────────────────────┴───────────────────────────────────┐
│                         API Gateway (Express)                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │    Auth     │  │   REST API   │  │ WebSocket  │  │Blockchain │ │
│  │ Middleware  │  │  Endpoints   │  │   Server   │  │    API    │ │
│  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                        Backend Services Layer                        │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   Workflow  │  │     IoT      │  │   Audit    │  │ Avalanche │ │
│  │   Service   │  │   Service    │  │  Service   │  │  Service  │ │
│  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
┌─────────────────────────────────┴───────────────────────────────────┐
│                          Data Layer                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │
│  │ PostgreSQL  │  │    Redis     │  │   MQTT     │  │Blockchain │ │
│  │  (Primary)  │  │   (Cache)    │  │  Broker    │  │   Node    │ │
│  └─────────────┘  └──────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Angular 17 (Standalone Components)
- **UI Library**: Angular Material
- **State Management**: RxJS
- **Charts**: Chart.js
- **Blockchain**: ethers.js, MetaMask integration
- **Build Tool**: Angular CLI with esbuild

### Backend
- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Cache**: Redis (optional)
- **WebSocket**: Socket.io
- **Blockchain**: ethers.js, Hardhat

### Blockchain
- **Network**: Avalanche C-Chain
- **Smart Contracts**: Solidity 0.8.20
- **Token Standard**: ERC-20
- **Development**: Hardhat
- **Libraries**: OpenZeppelin

### Infrastructure
- **Container**: Docker
- **CI/CD**: GitHub Actions
- **Monitoring**: OpenTelemetry ready
- **Cloud**: AWS/Azure/GCP compatible

## Component Architecture

### Frontend Components

```typescript
// Core Module Structure
src/app/
├── core/
│   ├── services/        # Singleton services
│   ├── guards/          # Route guards
│   └── interceptors/    # HTTP interceptors
├── shared/
│   ├── components/      # Reusable components
│   ├── services/        # Shared services
│   └── models/          # TypeScript interfaces
├── features/
│   ├── dashboard/       # Dashboard module
│   ├── inventory/       # Inventory management
│   ├── workflows/       # Workflow automation
│   └── blockchain/      # Blockchain features
└── layouts/            # Layout components
```

### Backend Services

```typescript
// Service Layer Architecture
interface Service {
  // Core CRUD operations
  create(data: CreateDTO): Promise<Entity>;
  findAll(filters: FilterDTO): Promise<Entity[]>;
  findOne(id: string): Promise<Entity>;
  update(id: string, data: UpdateDTO): Promise<Entity>;
  delete(id: string): Promise<void>;
}

// Example: Workflow Service
class WorkflowService implements Service {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService,
    private notificationService: NotificationService,
    private avalancheService: AvalancheService
  ) {}
  
  async executeWorkflow(workflowId: string, context: any): Promise<WorkflowInstance> {
    // 1. Validate conditions
    // 2. Execute actions
    // 3. Award blockchain rewards
    // 4. Create audit trail
  }
}
```

### Database Schema

```prisma
// Core Entities
model Organization {
  id            String   @id @default(cuid())
  name          String
  code          String   @unique
  wallet        OrganizationWallet?
  items         Item[]
  workflows     Workflow[]
  users         User[]
}

model Item {
  id               String   @id @default(cuid())
  barcode          String   @unique
  name             String
  type             ItemType
  status           ItemStatus
  currentLocation  Location @relation("CurrentLocation")
  custodyEvents    CustodyEvent[]
  iotData          IoTData[]
}

model Workflow {
  id            String   @id @default(cuid())
  name          String
  triggerType   WorkflowTriggerType
  conditions    Json
  actions       Json
  instances     WorkflowInstance[]
}

model BlockchainTransaction {
  id              String   @id @default(cuid())
  hash            String   @unique
  type            TransactionType
  amount          String
  status          TransactionStatus
  organizationId  String
}
```

## Data Flow

### 1. Item Tracking Flow
```
User Scans Item → API Gateway → Item Service → Database
                                      ↓
                              Custody Event Created
                                      ↓
                              Audit Trail Updated
                                      ↓
                              WebSocket Notification
```

### 2. IoT Monitoring Flow
```
IoT Device → MQTT Broker → IoT Service → Threshold Check
                                              ↓
                                    Workflow Triggered (if threshold violated)
                                              ↓
                                         Alert Created
                                              ↓
                                    Notification Sent
```

### 3. Blockchain Reward Flow
```
Workflow Completed → Calculate Reward → Get Organization Wallet
                                              ↓
                                    Mint CHAIN Tokens
                                              ↓
                                 Record Transaction
                                              ↓
                                  Update Balance
```

## Security Architecture

### Authentication & Authorization
- **JWT-based authentication** with refresh tokens
- **Role-based access control** (ADMIN, MANAGER, USER, VIEWER)
- **Organization-level data isolation**
- **API rate limiting** and throttling

### Data Security
- **Encryption at rest** for sensitive data
- **TLS/SSL** for all communications
- **Private key encryption** for blockchain wallets
- **Input validation** and sanitization
- **SQL injection prevention** via Prisma ORM

### Blockchain Security
- **Multi-signature wallet support**
- **Role-based smart contract access**
- **Pausable contracts** for emergencies
- **Reentrancy protection**
- **Integer overflow protection**

## Blockchain Architecture

### Smart Contract Architecture
```
┌─────────────────────────────────────────────────────┐
│                  ChainToken.sol                      │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   ERC-20    │  │   Pausable   │  │   Roles   │ │
│  │   Base      │  │  Emergency   │  │  Access   │ │
│  └─────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────┐
│              ComplianceRewards.sol                   │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   Reward    │  │   Scoring    │  │   Tier    │ │
│  │Distribution │  │    Logic     │  │  System   │ │
│  └─────────────┘  └──────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────┘
```

### Token Economics
- **Total Supply**: 1,000,000,000 CHAIN
- **Decimal Places**: 18
- **Distribution**:
  - Compliance Rewards: 40%
  - Quality Bonuses: 20%
  - Workflow Incentives: 20%
  - Reserve: 20%

### Reward Structure
```
Compliance Tiers:
- Platinum (95-100%): 500 CHAIN
- Gold (85-94%): 200 CHAIN
- Silver (75-84%): 100 CHAIN
- Bronze (60-74%): 50 CHAIN

Workflow Rewards:
- Emergency Response: 100 CHAIN
- Cold Chain Compliance: 50 CHAIN
- Quality Control: 40 CHAIN
- Standard Transfer: 10-25 CHAIN
```

## Deployment Architecture

### Development Environment
```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend
    ports: ["4200:4200"]
    
  backend:
    build: ./backend
    ports: ["3000:3000"]
    environment:
      - DATABASE_URL=postgresql://...
      - AVALANCHE_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
      
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    
  redis:
    image: redis:7
    ports: ["6379:6379"]
```

### Production Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   CloudFlare    │────▶│  Load Balancer  │────▶│   API Gateway   │
│      CDN        │     │   (AWS ALB)     │     │  (Express/PM2)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                           │
                              ┌────────────────────────────┼────────────┐
                              │                            │            │
                     ┌────────▼────────┐         ┌────────▼────────┐   │
                     │   Backend       │         │   Backend       │   │
                     │   Instance 1    │         │   Instance 2    │   │
                     └────────┬────────┘         └────────┬────────┘   │
                              │                            │            │
                     ┌────────▼────────────────────────────▼────────┐  │
                     │          PostgreSQL (Primary)                │  │
                     │          with Read Replicas                  │  │
                     └──────────────────────────────────────────────┘  │
                                                                       │
                     ┌──────────────────────────────────────────────┐  │
                     │        Avalanche C-Chain Node                │◀─┘
                     │         (Fuji/Mainnet)                       │
                     └──────────────────────────────────────────────┘
```

### Scaling Strategy
1. **Horizontal Scaling**: Multiple backend instances behind load balancer
2. **Database Scaling**: Read replicas for query distribution
3. **Caching Layer**: Redis for session and frequently accessed data
4. **CDN**: Static assets served via CloudFlare
5. **Auto-scaling**: Based on CPU/memory metrics

## Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Response times, error rates, throughput
- **Business Metrics**: Items tracked, workflows executed, tokens distributed
- **Infrastructure Metrics**: CPU, memory, disk, network
- **Blockchain Metrics**: Gas usage, transaction success rate

### Logging Strategy
```typescript
// Structured logging
logger.info('Workflow executed', {
  workflowId: workflow.id,
  duration: executionTime,
  status: 'success',
  rewardAmount: tokenAmount,
  organizationId: org.id
});
```

### Alerting Rules
- High error rate (>5%)
- Slow response time (>2s)
- Failed blockchain transactions
- Low wallet balance for gas
- IoT threshold violations

## API Design Principles

### RESTful Endpoints
```
GET    /api/items              # List items
POST   /api/items              # Create item
GET    /api/items/:id          # Get item
PUT    /api/items/:id          # Update item
DELETE /api/items/:id          # Delete item

GET    /api/items/:id/custody  # Get custody chain
POST   /api/items/:id/transfer # Transfer item
GET    /api/items/:id/iot      # Get IoT data
```

### WebSocket Events
```typescript
// Real-time events
socket.on('iot:update', (data) => { /* Temperature update */ });
socket.on('workflow:started', (data) => { /* Workflow status */ });
socket.on('alert:created', (data) => { /* New alert */ });
socket.on('reward:earned', (data) => { /* Token reward */ });
```

## Development Workflow

### Git Strategy
```
main
  ├── develop
  │     ├── feature/blockchain-integration
  │     ├── feature/iot-monitoring
  │     └── feature/workflow-engine
  └── release/v1.0.0
```

### Code Quality
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier
- **Testing**: Jest for unit tests, Cypress for E2E
- **Coverage**: Minimum 80% code coverage
- **Pre-commit**: Husky hooks for quality checks

---

This architecture provides a scalable, secure, and maintainable foundation for the Healthcare Chain of Custody application with integrated blockchain rewards.
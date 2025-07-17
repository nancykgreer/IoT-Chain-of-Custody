# Healthcare Chain of Custody - Deployment Guide

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Blockchain Setup](#blockchain-setup)
- [Monitoring Setup](#monitoring-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: v20.0.0 or higher
- **PostgreSQL**: v15.0 or higher
- **Redis**: v7.0 or higher (optional, for caching)
- **Docker**: v24.0 or higher (for containerized deployment)
- **Git**: v2.30 or higher

### Development Tools
- **npm**: v10.0.0 or higher
- **Angular CLI**: v17.0.0 or higher
- **Hardhat**: For smart contract deployment
- **MetaMask**: Browser extension for wallet testing

## Environment Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/healthcare-chain-custody.git
cd healthcare-chain-custody
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install smart contract dependencies
cd ../contracts
npm install
```

### 3. Environment Variables

#### Backend (.env)
```bash
# Create backend/.env file
cp backend/.env.example backend/.env
```

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/healthcare_chain"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Blockchain
AVALANCHE_RPC_URL="https://api.avax-test.network/ext/bc/C/rpc"
AVALANCHE_PRIVATE_KEY="your-deployment-wallet-private-key"
AVALANCHE_NETWORK="fuji"
CHAIN_TOKEN_ADDRESS="0x0000000000000000000000000000000000000000"
COMPLIANCE_REWARDS_ADDRESS="0x0000000000000000000000000000000000000000"

# Redis (Optional)
REDIS_URL="redis://localhost:6379"

# Email (Optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Monitoring (Optional)
SENTRY_DSN="https://your-sentry-dsn"
OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
```

#### Frontend (environment.ts)
```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'http://localhost:3000',
  avalancheNetwork: 'fuji',
  chainTokenAddress: '0x0000000000000000000000000000000000000000'
};
```

## Local Development

### 1. Database Setup
```bash
# Start PostgreSQL (using Docker)
docker run -d \
  --name healthcare-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=healthcare_chain \
  -p 5432:5432 \
  postgres:15

# Run database migrations
cd backend
npx prisma migrate dev

# Seed database with demo data (optional)
npm run seed
```

### 2. Start Development Servers
```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm start

# Terminal 3: Start Redis (optional)
docker run -d --name healthcare-redis -p 6379:6379 redis:7
```

### 3. Deploy Smart Contracts (Local)
```bash
cd contracts

# Start local Hardhat node
npx hardhat node

# Deploy contracts to local network
npm run deploy:local

# Copy deployed addresses to .env files
```

### 4. Access the Application
- Frontend: http://localhost:4200
- Backend API: http://localhost:3000/api
- API Documentation: http://localhost:3000/api-docs

## Docker Deployment

### 1. Build Docker Images
```bash
# Build all services
docker-compose build

# Or build individually
docker build -t healthcare-chain/frontend ./frontend
docker build -t healthcare-chain/backend ./backend
```

### 2. Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - API_URL=http://backend:3000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/healthcare_chain
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=healthcare_chain
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 3. Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

### 1. Cloud Platform Setup (AWS Example)

#### Infrastructure Requirements
- **EC2 Instances**: t3.medium or larger for backend
- **RDS PostgreSQL**: db.t3.medium or larger
- **ElastiCache Redis**: cache.t3.micro or larger
- **Application Load Balancer**: For high availability
- **S3 Bucket**: For static asset storage
- **CloudFront**: CDN for frontend

#### Security Groups
```bash
# Backend Security Group
- Port 3000: From ALB only
- Port 22: From your IP (SSH)

# Database Security Group
- Port 5432: From backend security group only

# Redis Security Group
- Port 6379: From backend security group only

# ALB Security Group
- Port 443: From anywhere (HTTPS)
- Port 80: From anywhere (HTTP, redirect to HTTPS)
```

### 2. Backend Deployment

#### Using PM2
```bash
# Install PM2
npm install -g pm2

# Build the application
cd backend
npm run build

# Start with PM2
pm2 start dist/main.js --name healthcare-backend -i max

# Save PM2 configuration
pm2 save
pm2 startup
```

#### PM2 Ecosystem File
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'healthcare-backend',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 3. Frontend Deployment

#### Build for Production
```bash
cd frontend
npm run build -- --configuration=production
```

#### Deploy to S3 + CloudFront
```bash
# Create S3 bucket
aws s3 mb s3://healthcare-chain-frontend

# Enable static website hosting
aws s3 website s3://healthcare-chain-frontend \
  --index-document index.html \
  --error-document error.html

# Upload build files
aws s3 sync dist/healthcare-chain s3://healthcare-chain-frontend \
  --delete \
  --cache-control "max-age=3600"

# Create CloudFront distribution
aws cloudfront create-distribution \
  --origin-domain-name healthcare-chain-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

### 4. Database Setup

#### RDS PostgreSQL Configuration
```sql
-- Create production database
CREATE DATABASE healthcare_chain_prod;

-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE healthcare_chain_prod TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
```

#### Run Migrations
```bash
# Set production database URL
export DATABASE_URL="postgresql://user:pass@rds-endpoint:5432/healthcare_chain_prod"

# Run migrations
cd backend
npx prisma migrate deploy
```

### 5. SSL/TLS Configuration

#### Using Certbot for Let's Encrypt
```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot

# Generate certificate
sudo certbot certonly --standalone -d api.healthcare-chain.com

# Auto-renewal
sudo certbot renew --dry-run
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/healthcare-api
server {
    listen 80;
    server_name api.healthcare-chain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.healthcare-chain.com;

    ssl_certificate /etc/letsencrypt/live/api.healthcare-chain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.healthcare-chain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Blockchain Setup

### 1. Deploy to Avalanche Fuji Testnet

#### Get Test AVAX
```bash
# Visit Avalanche Faucet
https://faucet.avax.network/

# Request test AVAX for your deployment wallet
```

#### Deploy Contracts
```bash
cd contracts

# Configure deployment wallet
export AVALANCHE_PRIVATE_KEY="your-deployment-wallet-private-key"

# Deploy to Fuji testnet
npm run deploy:fuji

# Output will show:
# ChainToken deployed to: 0x...
# ComplianceRewards deployed to: 0x...
```

#### Update Environment Variables
```bash
# Update backend/.env
CHAIN_TOKEN_ADDRESS="0x... (from deployment)"
COMPLIANCE_REWARDS_ADDRESS="0x... (from deployment)"
```

### 2. Deploy to Avalanche Mainnet

#### Pre-deployment Checklist
- [ ] Audit smart contracts
- [ ] Test thoroughly on Fuji
- [ ] Secure deployment wallet
- [ ] Have sufficient AVAX for gas
- [ ] Backup private keys securely

#### Deploy to Mainnet
```bash
# Update network configuration
export AVALANCHE_NETWORK="mainnet"
export AVALANCHE_RPC_URL="https://api.avax.network/ext/bc/C/rpc"

# Deploy contracts
npm run deploy:mainnet

# Verify contracts on Snowtrace
npm run verify:mainnet
```

### 3. Contract Verification
```bash
# Verify on Snowtrace
npx hardhat verify --network mainnet \
  DEPLOYED_CONTRACT_ADDRESS \
  "Constructor Argument 1" \
  "Constructor Argument 2"
```

## Monitoring Setup

### 1. Application Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'healthcare-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Healthcare Chain Custody",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "http_request_duration_seconds"
          }
        ]
      },
      {
        "title": "Blockchain Transactions",
        "targets": [
          {
            "expr": "blockchain_transactions_total"
          }
        ]
      }
    ]
  }
}
```

### 2. Log Aggregation

#### Using ELK Stack
```bash
# Filebeat configuration
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/healthcare-chain/*.log
  json.keys_under_root: true
  json.add_error_key: true

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "healthcare-chain-%{+yyyy.MM.dd}"
```

### 3. Alerts Configuration

#### Critical Alerts
```yaml
# alerts.yml
groups:
  - name: healthcare_chain
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
          
      - alert: BlockchainTransactionFailed
        expr: blockchain_transaction_failures_total > 0
        for: 1m
        annotations:
          summary: "Blockchain transaction failed"
          
      - alert: DatabaseConnectionLost
        expr: pg_up == 0
        for: 1m
        annotations:
          summary: "Database connection lost"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection string
psql $DATABASE_URL

# Check firewall rules
sudo ufw status
```

#### 2. Blockchain Transaction Failures
```bash
# Check wallet balance
cd contracts
npx hardhat run scripts/check-balance.js --network fuji

# Check gas prices
curl https://api.avax.network/ext/bc/C/rpc \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}'
```

#### 3. Frontend Build Issues
```bash
# Clear cache
rm -rf node_modules/.cache
rm -rf dist

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Build with verbose logging
npm run build -- --verbose
```

#### 4. WebSocket Connection Issues
```bash
# Check CORS settings
# Ensure backend allows frontend origin

# Test WebSocket connection
wscat -c ws://localhost:3000

# Check nginx WebSocket configuration
# Ensure Upgrade and Connection headers are proxied
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_organization ON items(organization_id);
CREATE INDEX idx_custody_events_item ON custody_events(item_id);
CREATE INDEX idx_iot_data_device_timestamp ON iot_data(device_id, timestamp);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM items WHERE organization_id = 'org_123';
```

#### 2. Redis Caching
```typescript
// Cache frequently accessed data
await redis.setex(`org:${orgId}:items`, 3600, JSON.stringify(items));

// Cache blockchain balances
await redis.setex(`wallet:${address}:balance`, 300, balance);
```

#### 3. Frontend Optimization
```bash
# Enable production build optimizations
ng build --aot --build-optimizer --optimization

# Analyze bundle size
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/healthcare-chain/stats.json
```

## Backup and Recovery

### 1. Database Backup
```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="healthcare_chain_backup_$DATE.sql"

pg_dump $DATABASE_URL > $BACKUP_FILE
aws s3 cp $BACKUP_FILE s3://healthcare-backups/
rm $BACKUP_FILE
```

### 2. Disaster Recovery Plan
1. **RTO**: 1 hour
2. **RPO**: 15 minutes
3. **Backup frequency**: Every 15 minutes
4. **Backup retention**: 30 days
5. **Test recovery**: Monthly

---

For additional support, contact the DevOps team or refer to our [internal wiki](https://wiki.healthcare-chain.internal).
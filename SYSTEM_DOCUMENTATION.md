# Healthcare Chain of Custody System - Complete Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Features Implemented](#features-implemented)
4. [Technology Stack](#technology-stack)
5. [API Documentation](#api-documentation)
6. [Database Schema](#database-schema)
7. [IoT Integration](#iot-integration)
8. [Real-Time Monitoring](#real-time-monitoring)
9. [Security & Compliance](#security-compliance)
10. [Deployment Guide](#deployment-guide)
11. [Future Enhancements](#future-enhancements)

## System Overview

The Healthcare Chain of Custody System is a comprehensive platform for tracking and managing healthcare items (laboratory specimens, patient samples, medical devices, and pharmaceuticals) throughout their lifecycle. The system ensures compliance with HIPAA, GDPR, and FDA regulations while providing real-time environmental monitoring through IoT integration.

### Key Capabilities
- **Multi-organization support** with data isolation
- **Real-time IoT monitoring** via Helium Network
- **Automated compliance** with audit trails
- **Role-based access control** (RBAC)
- **Blockchain-ready architecture** for Avalanche integration
- **Mobile-responsive** design for field operations

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Angular)                         │
├─────────────────────────────────────────────────────────────────┤
│  Auth Module │ Dashboard │ Items │ Custody │ Audit │ Monitoring │
└─────────────────────────────────────────────────────────────────┘
                                 │
                         WebSocket │ HTTP
                                 │
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API (Node.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  Auth │ Items │ Custody │ Audit │ IoT │ WebSocket │ Workflow   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
        ┌───────────┴──────────┐   ┌─────────┴─────────┐
        │   PostgreSQL DB      │   │  Helium Network   │
        │  - Items             │   │  - IoT Devices    │
        │  - Users             │   │  - Sensor Data    │
        │  - Custody Events    │   │  - Webhooks       │
        │  - Audit Logs        │   └───────────────────┘
        │  - IoT Data          │
        └──────────────────────┘
```

## Features Implemented

### 1. Core Chain of Custody
- **Item Management**: Create, track, and manage multiple item types
- **Custody Transfers**: Record chain of custody with digital signatures
- **Location Tracking**: GPS and facility-based location management
- **Environmental Monitoring**: Temperature, humidity, pressure tracking

### 2. IoT Integration (Helium Network)
- **Device Management**: Register and configure IoT sensors
- **Real-time Data Ingestion**: Webhook-based data collection
- **Automated Alerts**: Threshold-based environmental alerts
- **Battery Monitoring**: Device health and maintenance tracking

### 3. Real-Time Monitoring Dashboard
- **Live Sensor Data**: WebSocket-based real-time updates
- **Interactive Alerts Panel**: Severity-based alert management
- **Device Status Overview**: Online/offline/warning states
- **Environmental Metrics**: Temperature and humidity averages

### 4. Security & Compliance
- **JWT Authentication**: Secure token-based auth
- **Role-Based Access**: 8 distinct user roles
- **Audit Logging**: Immutable audit trail for all actions
- **Data Encryption**: At-rest and in-transit encryption
- **Rate Limiting**: API protection against abuse

### 5. User Roles
- **ADMIN**: Full system access
- **LAB_TECHNICIAN**: Lab operations and testing
- **NURSE**: Patient care and sample collection
- **DOCTOR**: Medical procedures and orders
- **RESEARCHER**: Research sample access
- **COMPLIANCE_OFFICER**: Audit and compliance oversight
- **AUDITOR**: Read-only audit access
- **TRANSPORT_STAFF**: Transportation and logistics

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with bcrypt
- **Real-time**: Socket.IO
- **Security**: Helmet, CORS, rate limiting
- **Logging**: Winston
- **IoT**: Helium Network integration

### Frontend
- **Framework**: Angular 17
- **UI Library**: Angular Material
- **State Management**: RxJS
- **Real-time**: Socket.IO Client
- **Charts**: Chart.js (ready for integration)
- **Styling**: SCSS with responsive design

### Infrastructure
- **Blockchain**: Avalanche (ready for integration)
- **IoT Network**: Helium LoRaWAN
- **Deployment**: Docker-ready
- **Monitoring**: Built-in metrics and logging

## API Documentation

### Authentication Endpoints
```
POST   /api/auth/login          - User login
POST   /api/auth/register       - User registration
POST   /api/auth/logout         - User logout
POST   /api/auth/refresh        - Refresh JWT token
```

### Item Management
```
GET    /api/items               - List items (paginated)
GET    /api/items/:id           - Get item details
POST   /api/items               - Create new item
PUT    /api/items/:id           - Update item
DELETE /api/items/:id           - Soft delete item
```

### Custody Management
```
GET    /api/custody/item/:id    - Get custody history
POST   /api/custody/transfer    - Transfer custody
POST   /api/custody/receive     - Confirm receipt
POST   /api/custody/alert       - Report environmental alert
GET    /api/custody/stats       - Get custody statistics
```

### IoT Integration
```
POST   /helium/webhook/:id      - Helium data webhook
GET    /api/iot/devices         - List IoT devices
GET    /api/iot/devices/:id     - Get device details
POST   /api/iot/devices         - Register new device
PUT    /api/iot/devices/:id     - Update device config
GET    /api/iot/alerts          - Get IoT alerts
PATCH  /api/iot/alerts/:id      - Resolve alert
GET    /api/iot/analytics       - Get IoT analytics
```

### Audit & Compliance
```
GET    /api/audit/logs          - Get audit logs
GET    /api/audit/summary       - Get audit summary
GET    /api/audit/compliance    - Get compliance report
POST   /api/audit/export        - Export audit data
```

## Database Schema

### Core Tables
- **organizations**: Healthcare facilities and labs
- **users**: System users with roles and permissions
- **items**: Tracked items (specimens, devices, etc.)
- **locations**: Physical locations and storage areas
- **custody_events**: Chain of custody transfers
- **digital_signatures**: Cryptographic signatures
- **audit_logs**: Immutable audit trail

### IoT Tables
- **iot_devices**: Registered IoT sensors
- **sensor_readings**: Environmental data points
- **iot_alerts**: Threshold-based alerts
- **helium_webhooks**: Webhook configurations

### Relationships
- Items belong to organizations
- Users belong to organizations
- Custody events link items, users, and locations
- IoT devices can be attached to items or locations
- All actions create audit logs

## IoT Integration

### Helium Network Setup
1. **Device Registration**: Add devices in Helium Console
2. **Webhook Configuration**: Set up HTTP integration
3. **Data Flow**: Device → Helium → Webhook → Database → WebSocket → UI

### Supported Device Types
- **Temperature Sensors**: Cold chain monitoring
- **GPS Trackers**: Location tracking
- **Smart Containers**: Tamper detection
- **Facility Monitors**: Room environmental monitoring

### Alert Thresholds
- **Temperature**: 2-8°C for specimens
- **Humidity**: <80% for storage
- **Battery**: <20% warning
- **Location**: Geofencing violations

## Real-Time Monitoring

### WebSocket Events
- **sensor:data**: Live sensor readings
- **alert:new**: New alert notifications
- **alert:resolved**: Alert resolution updates
- **device:status**: Online/offline changes
- **custody:transfer**: Real-time transfers

### Dashboard Components
- **Real-time Metrics**: KPI cards with live updates
- **Device Status**: Online/offline overview
- **Alerts Panel**: Active alerts with actions
- **Environmental Charts**: Temperature/humidity trends

## Security & Compliance

### HIPAA Compliance
- **Access Controls**: Role-based permissions
- **Audit Trails**: All PHI access logged
- **Encryption**: AES-256 for data at rest
- **Session Management**: Automatic timeout

### GDPR Compliance
- **Data Portability**: Export user data
- **Right to Erasure**: Soft delete with retention
- **Consent Management**: Tracked consent status
- **Data Minimization**: Role-based data access

### Security Features
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: API abuse prevention
- **CORS Protection**: Cross-origin security
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization

## Deployment Guide

### Prerequisites
- Node.js 20+ 
- PostgreSQL 15+
- Docker (optional)
- Helium Console account

### Environment Variables
```bash
# Backend (.env)
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/chain_custody
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=32-character-key
CORS_ORIGIN=https://your-domain.com
HELIUM_API_KEY=your-helium-key
```

### Installation Steps
1. Clone repository
2. Install dependencies: `npm install`
3. Setup database: `npx prisma migrate deploy`
4. Build backend: `npm run build`
5. Build frontend: `cd frontend && npm run build`
6. Start services: `npm start`

### Docker Deployment
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - DATABASE_URL=postgresql://...
    ports:
      - "3000:3000"
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
  
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
```

## Future Enhancements

### In Progress
- **Workflow Engine**: Automated custody transfer workflows
- **Environmental Charts**: Chart.js integration
- **Push Notifications**: Real-time alert notifications

### Planned Features
- **Avalanche Integration**: Blockchain audit trails
- **Token Economics**: Compliance incentives
- **Barcode Scanning**: Mobile QR/barcode support
- **Advanced Analytics**: Predictive maintenance
- **Mobile App**: Native iOS/Android apps

### Blockchain Integration
- **Avalanche Subnet**: Healthcare-specific blockchain
- **Smart Contracts**: Automated compliance rules
- **Token Rewards**: CHAIN token for quality metrics
- **Immutable Records**: On-chain audit trails

## Support & Maintenance

### Monitoring
- Application logs: `/logs/combined.log`
- Error logs: `/logs/error.log`
- Audit logs: `/logs/audit.log`
- Database backups: Daily automated

### Common Issues
1. **WebSocket Connection**: Check CORS settings
2. **IoT Data**: Verify webhook secret
3. **Authentication**: Ensure JWT secret matches
4. **Database**: Check connection string

### Contact
- Technical Support: support@your-domain.com
- Security Issues: security@your-domain.com
- Documentation: https://docs.your-domain.com

---

*Last Updated: January 2025*
*Version: 1.0.0*
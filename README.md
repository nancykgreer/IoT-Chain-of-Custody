# 🏥 Healthcare Chain of Custody

A comprehensive chain of custody application for healthcare items featuring IoT monitoring, workflow automation, and blockchain integration.

## ⚠️ Demo Application Notice

This is a **demonstration application** with simulated data and placeholder integrations. It is designed to showcase capabilities and is **not intended for production use with real patient data**.

## 🎯 Key Features

### 🔒 **Compliance & Security**
- HIPAA, GDPR, and FDA 21 CFR Part 11 ready architecture
- End-to-end audit trails with digital signatures
- Role-based access control (8 user roles)
- Multi-organization data isolation

### 📦 **Multi-Item Support**
- Laboratory specimens
- Patient samples  
- Medical devices
- Pharmaceuticals

### 🌐 **IoT Integration**
- Real-time environmental monitoring
- Helium Network integration for LoRaWAN devices
- Temperature, humidity, and pressure tracking
- Automated alert system

### ⚙️ **Workflow Automation**
- Custom workflow engine with rule-based triggers
- Cold chain compliance monitoring
- Emergency recall procedures
- Approval workflows for high-value transfers

### 🪙 **Blockchain Integration**
- Avalanche blockchain for future tokenomics
- CHAIN token incentive system
- Compliance rewards and quality metrics

### 📱 **Mobile-First Design**
- Progressive Web App (PWA) capabilities
- Barcode/QR code scanning
- Touch-optimized interfaces
- Offline capability support

## 🏗️ Architecture

### **Backend**
- **Node.js** with TypeScript
- **Express.js** API framework
- **PostgreSQL** with Prisma ORM
- **Socket.IO** for real-time updates
- **JWT** authentication

### **Frontend**
- **Angular 17** with Material Design
- **Chart.js** for environmental monitoring
- **WebSocket** integration for live updates
- **PWA** with mobile optimization

### **Infrastructure**
- **Docker** containerization ready
- **Helium Network** IoT integration
- **Avalanche** blockchain (future)
- **WebSocket** real-time communication

## 🚀 Quick Start

### Prerequisites
- Node.js v20.16.0+
- PostgreSQL 12+
- npm or yarn

### Setup
```bash
# 1. Clone repository
git clone <repository-url>
cd healthcare-chain-custody

# 2. Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials

# 3. Database setup
npm run db:migrate
npm run demo:seed

# 4. Start backend
npm run dev

# 5. Frontend setup (optional)
cd ../frontend
npm install
npm start
```

### Demo System
```bash
# Reset demo data
npm run demo:full-reset

# Run demo scenarios
npm run demo:scenario specimen    # Laboratory specimen journey
npm run demo:scenario recall      # Emergency recall
npm run demo:scenario iot         # IoT monitoring

# Real-time simulation
npm run demo:simulate start
```

## 🔑 Demo Credentials

- **Admin**: `admin@demo.com` / `password`
- **Doctor**: `sarah@demo.com` / `password`  
- **Lab Tech**: `mike@demo.com` / `password`
- **Compliance**: `lisa@demo.com` / `password`
- **Transport**: `tom@demo.com` / `password`

## 📊 Demo Scenarios

### 1. **Laboratory Specimen Journey** (15 minutes)
Experience the complete lifecycle from patient collection to lab results:
- Mobile specimen collection
- IoT sensor attachment
- Cold chain monitoring
- Temperature violation alerts
- Automated workflow response
- Compliance resolution
- Token rewards

### 2. **Emergency Pharmaceutical Recall** (10 minutes)
Rapid response to contamination alerts:
- Real-time recall triggers
- Automated quarantine
- Multi-facility notifications
- Progress tracking
- Regulatory reporting

### 3. **IoT Environmental Monitoring** (8 minutes)
Preventing cold chain breaks:
- Live sensor dashboards
- Threshold monitoring
- Mobile alert response
- Environmental analytics

## 🛠️ Development

### Available Scripts
```bash
# Backend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Code linting
npm run typecheck    # TypeScript checking

# Database
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio

# Demo System
npm run demo:seed    # Seed demo data
npm run demo:clean   # Clean demo data
npm run demo:scenario <type>  # Run specific scenario
npm run demo:simulate <command>  # Start simulation
```

### Project Structure
```
healthcare-chain-custody/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── middleware/      # Authentication, logging, etc.
│   │   ├── models/          # Data models
│   │   ├── routes/          # API routes
│   │   ├── scripts/         # Demo simulation scripts
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utilities
│   ├── prisma/              # Database schema
│   └── package.json
├── frontend/                # Angular application
│   ├── src/
│   │   ├── app/             # Angular components
│   │   └── assets/          # Static assets
│   └── package.json
├── docs/                    # Documentation
└── README.md
```

## 🔒 Security

### Demo Security
- All credentials are clearly marked as demo-only
- No real patient data included
- Simulated IoT devices and readings
- Placeholder blockchain integration

### Production Considerations
- Implement proper secret management
- Enable database encryption
- Configure proper CORS policies
- Set up SSL/TLS certificates
- Implement audit logging
- Configure backup strategies

## 📚 Documentation

- [`SETUP_AND_DEMO_INSTRUCTIONS.md`](SETUP_AND_DEMO_INSTRUCTIONS.md) - Complete setup guide
- [`GITHUB_SECURITY_GUIDE.md`](GITHUB_SECURITY_GUIDE.md) - Security considerations
- [`docs/DEMONSTRATION_GUIDE.md`](docs/DEMONSTRATION_GUIDE.md) - Presentation guide
- [`docs/AVALANCHE_TOKENOMICS.md`](docs/AVALANCHE_TOKENOMICS.md) - Token economics
- [`backend/src/scripts/README.md`](backend/src/scripts/README.md) - Simulation scripts

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## ⚠️ Disclaimer

This is a demonstration application created for educational and presentation purposes. It should not be used in production environments with real patient data without proper security audits, compliance reviews, and production-grade infrastructure setup.

For production deployment, ensure:
- Comprehensive security audit
- HIPAA compliance validation
- Proper infrastructure setup
- Regular security updates
- Professional penetration testing

## 🎬 Demo

For a complete demonstration, see [`DEMONSTRATION_GUIDE.md`](docs/DEMONSTRATION_GUIDE.md) which includes:
- Pre-demo setup instructions
- Three main demo scenarios
- Audience engagement strategies
- Technical deep-dive presentations
- Business value propositions

---

**Built with ❤️ for healthcare compliance and blockchain innovation**
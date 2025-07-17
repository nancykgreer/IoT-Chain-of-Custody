# 🎮 Demo Simulation Scripts

This directory contains comprehensive simulation scripts for demonstrating the Healthcare Chain of Custody application. These scripts provide realistic data, scenarios, and automation for impressive presentations and testing.

## 📋 Available Scripts

### 1. Demo Data Seeder (`demo-data-seeder.ts`)
Seeds the database with realistic demo data including organizations, users, locations, items, IoT devices, and workflows.

```bash
# Seed complete demo dataset
npm run demo:seed

# Clean database
npm run demo:clean

# Full reset (clean + seed)
npm run demo:full-reset
```

**What it creates:**
- 4 Organizations (Hospital, Lab, Transport, Pharma)
- 8 Users with different roles and credentials
- 8 Locations across organizations
- 45+ Items (specimens, devices, pharmaceuticals, samples)
- 15 IoT Devices (temperature sensors, GPS trackers, smart containers)
- 5 Workflows (cold chain, approvals, alerts, recalls)
- 24 hours of historical IoT data
- Sample custody transfer events

### 2. Demo Simulator (`demo-simulator.ts`)
Provides real-time simulation of IoT data, alerts, workflows, and custody transfers during demonstrations.

```bash
# Start full simulation (30 minutes)
npm run demo:simulate start

# Trigger emergency recall
npm run demo:simulate recall PHARMACEUTICAL "Quality control failure"

# Show current metrics
npm run demo:simulate metrics
```

**Features:**
- Real-time IoT sensor data generation
- Automatic threshold violation detection
- Workflow trigger simulation
- Token reward calculations
- WebSocket broadcasting for live updates
- Emergency scenario simulation

### 3. Demo Scenarios (`demo-scenarios.ts`)
Pre-configured scenarios that match the demonstration guide for consistent presentations.

```bash
# Laboratory Specimen Journey (15 minutes)
npm run demo:scenario specimen

# Emergency Pharmaceutical Recall (10 minutes)
npm run demo:scenario recall

# IoT Environmental Monitoring (8 minutes)
npm run demo:scenario iot

# Run all scenarios sequentially
npm run demo:scenario all
```

## 🎬 Demo Workflow

### Quick Start
```bash
# 1. Reset and prepare demo data
npm run demo:full-reset

# 2. Start the main application
npm run dev

# 3. In another terminal, start scenario simulation
npm run demo:scenario all

# 4. In a third terminal, start real-time simulation
npm run demo:simulate start
```

### Demo Login Credentials
- **Admin**: `admin@demo.com` / `password`
- **Doctor**: `sarah@demo.com` / `password`
- **Lab Tech**: `mike@demo.com` / `password`
- **Compliance**: `lisa@demo.com` / `password`
- **Transport**: `tom@demo.com` / `password`

## 📊 Simulation Features

### IoT Data Simulation
- Realistic temperature, humidity, pressure readings
- Battery level monitoring
- Threshold violation detection
- Environmental trend generation

### Workflow Automation
- Cold chain compliance monitoring
- High-value transfer approvals
- Battery low warnings
- Emergency recall procedures
- Daily lab transfers

### Real-time Events
- Custody transfer simulations
- Alert generation and resolution
- Token reward calculations
- Mobile response scenarios

### WebSocket Integration
- Live dashboard updates
- Real-time alert broadcasting
- Workflow progress tracking
- Token award notifications

## 🎯 Demo Scenarios

### Scenario 1: Laboratory Specimen Journey
Demonstrates the complete lifecycle of a specimen from collection to lab results, including:
- Specimen creation with mobile interface
- IoT sensor attachment and monitoring
- Transport with temperature spike
- Automated workflow response
- Compliance resolution
- Token rewards

### Scenario 2: Emergency Pharmaceutical Recall
Shows rapid response to contamination alerts including:
- Emergency recall trigger
- Automated item quarantine
- Facility notifications
- Progress tracking
- Analytics generation

### Scenario 3: IoT Environmental Monitoring
Focuses on preventing cold chain breaks with:
- Real-time dashboard monitoring
- Live sensor data visualization
- Threshold violation alerts
- Mobile response simulation

## 🔧 Configuration

### Simulation Parameters
```typescript
interface SimulationConfig {
  duration: number;        // minutes
  iotDeviceCount: number;
  temperatureRange: [number, number];
  humidityRange: [number, number];
  alertProbability: number;
  transferProbability: number;
}
```

### WebSocket Ports
- Demo Simulator: `3002`
- Demo Scenarios: `3003`
- Main Application: `3001`

## 📈 Metrics and Analytics

The simulation generates realistic metrics including:
- System uptime: 99.95%
- Compliance rate: 99.8%
- Alert response time: ~47 seconds
- Token earnings tracking
- Device status monitoring
- Environmental trend analysis

## 🚨 Troubleshooting

### Common Issues
1. **Database Connection**: Ensure PostgreSQL is running
2. **Port Conflicts**: Check if ports 3001-3003 are available
3. **WebSocket Issues**: Verify CORS settings and firewall rules
4. **Missing Dependencies**: Run `npm install` in backend directory

### Reset Commands
```bash
# Reset everything
npm run demo:full-reset

# Clean specific data
npm run demo:clean

# Restart simulation
npm run demo:simulate start
```

## 🔒 Security Notes

- Demo credentials are for testing only
- Simulation data is clearly marked as demo content
- No production data should be used in demonstrations
- Reset database after each demo session

## 📱 Mobile Support

All scenarios include mobile-responsive components:
- Touch-optimized interfaces
- Barcode scanning simulation
- Mobile notification alerts
- Field technician workflows

## 🎪 Presentation Tips

1. **Pre-Demo**: Run `demo:full-reset` 30 minutes before
2. **During Demo**: Use `demo:scenario` commands to trigger events
3. **Real-time**: Keep `demo:simulate` running for live updates
4. **Audience**: Use multiple devices to show different user perspectives
5. **Recovery**: Keep `demo:full-reset` ready for quick recovery

These scripts provide everything needed for impressive, realistic demonstrations of the Healthcare Chain of Custody system!
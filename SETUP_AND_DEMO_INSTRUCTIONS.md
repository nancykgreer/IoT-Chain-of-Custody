# 🚀 Healthcare Chain of Custody - Setup & Demo Instructions

## 🎯 Running in Visual Studio Code (Recommended)

### 1. **Open the Project**
```bash
# Navigate to your project directory
cd /home/nancy/Projects/Ahamparam

# Open in VS Code
code .
```

### 2. **Terminal Setup in VS Code**
VS Code's integrated terminal is perfect for this. You can run multiple terminals:

**Press `Ctrl+Shift+`` (backtick) to open terminal, then:**

```bash
# Terminal 1: Backend setup
cd backend
npm install
npm run db:migrate
npm run demo:seed

# Terminal 2: Start main application
npm run dev

# Terminal 3: Run demo scenarios
npm run demo:scenario specimen
```

### 3. **VS Code Extensions (Recommended)**
Install these extensions for the best experience:
- **Prisma** - Database schema syntax highlighting
- **TypeScript Importer** - Auto-imports
- **ES7+ React/Redux/React-Native snippets** - For Angular/TypeScript
- **REST Client** - Test API endpoints
- **Angular Language Service** - For frontend work

### 4. **Multiple Terminal Windows**
In VS Code, you can split terminals or open multiple:
- Click the `+` icon in terminal panel for new terminals
- Use `Ctrl+Shift+5` to split terminal
- Each terminal can run different commands simultaneously

## 🚀 Step-by-Step Demo Setup

### **Option A: VS Code Integrated Terminal (Recommended)**
```bash
# Terminal 1: Backend
cd backend
npm run demo:full-reset
npm run dev

# Terminal 2: Frontend (if you want to run it)
cd frontend
npm start

# Terminal 3: Demo simulation
cd backend
npm run demo:scenario all
```

### **Option B: VS Code + External Terminals**
- Use VS Code for code editing
- Use separate terminal windows for running commands
- Good if you prefer larger terminal windows

## 📁 VS Code Workspace Structure
Your VS Code file explorer will show:
```
Ahamparam/
├── backend/
│   ├── src/scripts/
│   │   ├── demo-simulator.ts       ← Your new simulation scripts
│   │   ├── demo-scenarios.ts
│   │   ├── demo-data-seeder.ts
│   │   └── README.md
│   ├── package.json               ← Updated with demo commands
│   └── ...
├── frontend/
└── docs/
    └── DEMONSTRATION_GUIDE.md      ← Your demo guide
```

## 🎮 Quick Start Commands

Once you have VS Code open with the project:

```bash
# 1. Setup (run once)
cd backend
npm install
npm run db:migrate

# 2. Reset demo data
npm run demo:full-reset

# 3. Start application
npm run dev

# 4. In another terminal - run demo
npm run demo:scenario specimen
```

## 🔧 VS Code Configuration

Create `.vscode/launch.json` for debugging:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Backend",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/backend/src/server.ts",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"],
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

## 🌐 Alternative Setup Options

### **Option 1: Docker (if you prefer containers)**
```bash
# If you want to containerize everything
docker-compose up
```

### **Option 2: Command Line Only**
```bash
# Traditional terminal approach
# Use multiple terminal tabs/windows or tmux
tmux new-session -d -s demo

# Terminal 1: Backend
cd /home/nancy/Projects/Ahamparam/backend
npm run demo:full-reset
npm run dev

# Terminal 2: Demo scenarios
cd /home/nancy/Projects/Ahamparam/backend
npm run demo:scenario all

# Terminal 3: Real-time simulation
cd /home/nancy/Projects/Ahamparam/backend
npm run demo:simulate start
```

### **Option 3: IDE Alternatives**
- **WebStorm** - Excellent TypeScript support
- **Cursor** - AI-powered VS Code alternative
- **Neovim** - If you prefer terminal-based editing

## 📋 Available Demo Scripts

### 1. Demo Data Seeder
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

### 2. Demo Simulator
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

### 3. Demo Scenarios
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

## 🔑 Demo Login Credentials
- **Admin**: `admin@demo.com` / `password`
- **Doctor**: `sarah@demo.com` / `password`
- **Lab Tech**: `mike@demo.com` / `password`
- **Compliance**: `lisa@demo.com` / `password`
- **Transport**: `tom@demo.com` / `password`

## 🎬 Complete Demo Workflow

### **Preparation (5 minutes before demo)**
```bash
# 1. Open VS Code
cd /home/nancy/Projects/Ahamparam
code .

# 2. Reset demo data (in VS Code terminal)
cd backend
npm run demo:full-reset

# 3. Start main application
npm run dev
```

### **During Demo**
```bash
# Terminal 1: Keep main app running
npm run dev

# Terminal 2: Run specific scenarios
npm run demo:scenario specimen    # 15-minute scenario
npm run demo:scenario recall      # 10-minute scenario
npm run demo:scenario iot         # 8-minute scenario

# Terminal 3: Real-time simulation
npm run demo:simulate start
```

### **Demo URLs**
- **Main Application**: `http://localhost:3001`
- **Frontend (if running)**: `http://localhost:4200`
- **Database Studio**: `npm run db:studio` → `http://localhost:5555`

## 🎯 Recommended Approach: VS Code

**Why VS Code is perfect:**
- ✅ Great TypeScript/Node.js support
- ✅ Integrated terminal for running commands
- ✅ Git integration for version control
- ✅ Extensions for Prisma, Angular, etc.
- ✅ Debug capabilities
- ✅ File explorer for easy navigation

**Quick start command:**
```bash
cd /home/nancy/Projects/Ahamparam
code .
```

Then use the integrated terminal (`Ctrl+Shift+``) to run the demo commands!

## 🔧 Troubleshooting

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

### Check if Services are Running
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# Check if ports are available
netstat -tulpn | grep :3001
netstat -tulpn | grep :4200

# Check Node.js version
node --version    # Should be v20.16.0 or higher
npm --version
```

## 📱 Mobile Demo Support

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

## 📊 What the Demo Shows

### Laboratory Specimen Journey
- Specimen creation with nurse mobile interface
- IoT sensor attachment and cold chain monitoring
- Transport with temperature spike simulation
- Automated workflow response to violations
- Compliance officer resolution process
- Token rewards for perfect custody chain

### Emergency Pharmaceutical Recall
- Real-time contamination alert triggers
- Automated item quarantine across facilities
- Stakeholder notification system
- Progress tracking dashboard
- Regulatory compliance reporting

### IoT Environmental Monitoring
- Live sensor data visualization
- Threshold monitoring and alerts
- Mobile field technician response
- Environmental trend analysis

## 🚀 Ready to Demo!

Your Healthcare Chain of Custody application is now fully equipped with realistic simulation scripts and comprehensive demonstration capabilities. The system showcases enterprise-grade features including blockchain integration, IoT monitoring, workflow automation, and regulatory compliance - all wrapped in a user-friendly interface optimized for healthcare professionals.

**Start here:** `code /home/nancy/Projects/Ahamparam`
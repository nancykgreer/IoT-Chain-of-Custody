# Helium IoT Network Setup Guide

## Prerequisites

### 1. Helium Console Account
- Sign up at [console.helium.com](https://console.helium.com)
- Create organization for your healthcare facility
- Generate API key for programmatic access

### 2. Hardware Requirements
- **Temperature/Humidity Sensors**: RAK7204, Dragino LHT65, Sensecap S2103
- **GPS Trackers**: Digital Matter Oyster3, RAK7200, Browan Tabs Object Locator
- **Smart Container Sensors**: Custom LoRaWAN devices with RFID/NFC

## Step 1: Device Registration

### Add Device to Helium Console
1. Navigate to Devices → Add Device
2. Enter device details:
   - **Name**: Descriptive name (e.g., "Cold Storage Monitor #1")
   - **DevEUI**: Device's unique identifier
   - **AppEUI**: Application identifier
   - **AppKey**: Encryption key for device

3. Assign to organization
4. Configure data transmission interval

### Device Configuration Example
```json
{
  "name": "Specimen Storage Temp Sensor",
  "dev_eui": "70B3D57ED005B5A7",
  "app_eui": "1000000000000001",
  "app_key": "2B7E151628AED2A6ABF7158809CF4F3C",
  "organization_id": "your-org-id"
}
```

## Step 2: Webhook Setup

### Create Webhook in Helium Console
1. Go to Integrations → Webhooks
2. Create new HTTP integration:
   - **Name**: Healthcare Chain of Custody
   - **Endpoint**: `https://your-domain.com/helium/webhook/{webhook-id}`
   - **HTTP Method**: POST
   - **Secret**: Generate secure random string

### Webhook Payload Format
```json
{
  "device_id": "device-uuid",
  "timestamp": "2025-01-16T10:30:00Z",
  "payload": "base64-encoded-data",
  "temperature": 4.2,
  "humidity": 65.3,
  "battery": 87,
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy": 10
  },
  "rssi": -85,
  "snr": 8.5,
  "spreading_factor": 7
}
```

## Step 3: Application Configuration

### Environment Variables
Add to your `.env` file:
```bash
HELIUM_API_KEY=your-helium-console-api-key
HELIUM_ORGANIZATION_ID=your-helium-organization-id
WEBHOOK_BASE_URL=https://your-domain.com
```

### Database Migration
Run Prisma migration to create IoT tables:
```bash
npx prisma migrate dev --name add-iot-support
npx prisma generate
```

## Step 4: Device Deployment

### Temperature/Humidity Sensors
**Use Case**: Cold chain monitoring for specimens
**Placement**: Inside refrigerators, transport containers
**Configuration**:
- Transmission interval: 15 minutes
- Temperature thresholds: 2°C - 8°C
- Humidity threshold: <80%

### GPS Trackers
**Use Case**: Vehicle and container tracking
**Placement**: Transport vehicles, mobile equipment
**Configuration**:
- Transmission interval: 5 minutes (moving), 30 minutes (stationary)
- Geofencing: 1km radius around facilities
- Speed alerts: >80 km/h

### Smart Containers
**Use Case**: Secure specimen transport
**Features**: RFID scanning, tamper detection, environmental monitoring
**Configuration**:
- Transmission interval: 30 minutes or on event
- Tamper alerts: Immediate
- Access logging: Real-time

## Step 5: Testing and Validation

### Device Testing Checklist
- [ ] Device appears online in Helium Console
- [ ] Payload data received in webhook
- [ ] Temperature/humidity readings accurate
- [ ] GPS coordinates correct
- [ ] Alerts trigger at proper thresholds
- [ ] Battery level reporting functional

### Network Coverage Testing
- [ ] Test at all facility locations
- [ ] Verify coverage on transport routes
- [ ] Measure signal strength (RSSI/SNR)
- [ ] Test backup hotspot connectivity

## Step 6: Monitoring and Maintenance

### Dashboard Metrics
- Device online/offline status
- Battery levels and replacement alerts
- Signal quality (RSSI/SNR)
- Data transmission frequency
- Alert response times

### Maintenance Schedule
- **Weekly**: Check device status and alerts
- **Monthly**: Review battery levels
- **Quarterly**: Physical device inspection
- **Annually**: Firmware updates and recalibration

## Cost Analysis

### Network Costs (Helium)
- **Device Registration**: $1.00 one-time
- **Data Credits**: ~$0.00001 per 24-byte packet
- **Monthly Cost per Device**: $1-5 depending on transmission frequency

### Hardware Costs
- **Basic Temp Sensor**: $25-50
- **GPS Tracker**: $75-150
- **Smart Container**: $200-400

### Annual ROI
- **Prevented Losses**: $10,000+ (specimen spoilage prevention)
- **Compliance Automation**: $5,000+ (reduced manual monitoring)
- **Insurance Savings**: $2,000+ (better risk profile)

## Troubleshooting

### Common Issues
1. **Device Not Connecting**
   - Check DevEUI/AppEUI/AppKey configuration
   - Verify Helium Network coverage
   - Confirm device is within range of hotspot

2. **No Data Received**
   - Verify webhook endpoint accessibility
   - Check webhook secret configuration
   - Review device transmission interval

3. **Inaccurate Readings**
   - Calibrate sensors according to manufacturer specs
   - Check for physical obstructions or interference
   - Verify sensor placement and mounting

### Support Resources
- [Helium Documentation](https://docs.helium.com)
- [LoRaWAN Specification](https://lora-alliance.org)
- Device manufacturer support portals

## Security Considerations

### Data Encryption
- End-to-end encryption from device to application
- Webhook signature verification
- Secure API key management

### Access Control
- Role-based device access
- Audit logging for all device interactions
- Regular security assessments

### Compliance
- HIPAA-compliant data handling
- GDPR privacy requirements
- FDA device validation (if applicable)
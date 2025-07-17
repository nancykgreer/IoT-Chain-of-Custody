#!/usr/bin/env ts-node

/**
 * Healthcare Chain of Custody - Demo Data Seeder
 * 
 * Seeds the database with realistic demo data for presentations and testing
 */

import { PrismaClient, ItemType, ItemStatus, UserRole, LocationType, DeviceType, WorkflowTriggerType, WorkflowStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

class DemoDataSeeder {
  private orgIds: string[] = [];
  private userIds: string[] = [];
  private locationIds: string[] = [];
  private itemIds: string[] = [];
  private deviceIds: string[] = [];

  async seedAll(): Promise<void> {
    console.log('🌱 Starting demo data seeding...');
    
    try {
      // Clean existing data
      await this.cleanDatabase();
      
      // Seed in order due to relationships
      await this.seedOrganizations();
      await this.seedUsers();
      await this.seedLocations();
      await this.seedItems();
      await this.seedIoTDevices();
      await this.seedWorkflows();
      await this.seedInitialData();
      
      console.log('✅ Demo data seeding completed successfully!');
      await this.printSummary();
      
    } catch (error) {
      console.error('❌ Failed to seed demo data:', error);
      throw error;
    }
  }

  private async cleanDatabase(): Promise<void> {
    console.log('🧹 Cleaning existing demo data...');
    
    // Delete in reverse dependency order
    await prisma.workflowInstance.deleteMany();
    await prisma.workflowStep.deleteMany();
    await prisma.workflow.deleteMany();
    await prisma.ioTAlert.deleteMany();
    await prisma.ioTData.deleteMany();
    await prisma.ioTDevice.deleteMany();
    await prisma.custodyEvent.deleteMany();
    await prisma.item.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
    
    console.log('✅ Database cleaned');
  }

  private async seedOrganizations(): Promise<void> {
    console.log('🏢 Seeding organizations...');
    
    const organizations = [
      {
        name: 'City General Hospital',
        type: 'HEALTHCARE_FACILITY',
        address: '123 Medical Center Dr, Healthcare City, HC 12345',
        contactEmail: 'admin@citygeneral.com',
        contactPhone: '+1-555-0101',
        settings: {
          timezone: 'America/New_York',
          complianceLevel: 'HIPAA_FDA',
          alertPreferences: ['EMAIL', 'SMS', 'DASHBOARD']
        }
      },
      {
        name: 'MedLab Analytics',
        type: 'LABORATORY',
        address: '456 Research Blvd, Science Park, SP 67890',
        contactEmail: 'info@medlabanalytics.com',
        contactPhone: '+1-555-0102',
        settings: {
          timezone: 'America/New_York',
          complianceLevel: 'FDA_CLIA',
          alertPreferences: ['EMAIL', 'DASHBOARD']
        }
      },
      {
        name: 'Transport Inc',
        type: 'LOGISTICS_PROVIDER',
        address: '789 Logistics Way, Distribution Hub, DH 54321',
        contactEmail: 'dispatch@transportinc.com',
        contactPhone: '+1-555-0103',
        settings: {
          timezone: 'America/New_York',
          complianceLevel: 'DOT_FDA',
          alertPreferences: ['SMS', 'MOBILE_APP']
        }
      },
      {
        name: 'Pharma Corp',
        type: 'PHARMACEUTICAL_COMPANY',
        address: '101 Innovation Dr, Pharma Valley, PV 98765',
        contactEmail: 'supply@pharmacorp.com',
        contactPhone: '+1-555-0104',
        settings: {
          timezone: 'America/New_York',
          complianceLevel: 'FDA_GMP',
          alertPreferences: ['EMAIL', 'DASHBOARD', 'INTEGRATION']
        }
      }
    ];

    for (const org of organizations) {
      const created = await prisma.organization.create({ data: org });
      this.orgIds.push(created.id);
      console.log(`   ✓ ${org.name}`);
    }
  }

  private async seedUsers(): Promise<void> {
    console.log('👥 Seeding users...');
    
    const users = [
      {
        email: 'admin@demo.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
        orgIndex: 0,
        password: 'password'
      },
      {
        email: 'sarah@demo.com',
        name: 'Dr. Sarah Chen',
        role: UserRole.DOCTOR,
        orgIndex: 0,
        password: 'password'
      },
      {
        email: 'mike@demo.com',
        name: 'Mike Rodriguez',
        role: UserRole.LAB_TECHNICIAN,
        orgIndex: 1,
        password: 'password'
      },
      {
        email: 'lisa@demo.com',
        name: 'Lisa Wang',
        role: UserRole.COMPLIANCE_OFFICER,
        orgIndex: 0,
        password: 'password'
      },
      {
        email: 'tom@demo.com',
        name: 'Tom Johnson',
        role: UserRole.TRANSPORT_STAFF,
        orgIndex: 2,
        password: 'password'
      },
      {
        email: 'nurse@demo.com',
        name: 'Jennifer Martinez',
        role: UserRole.NURSE,
        orgIndex: 0,
        password: 'password'
      },
      {
        email: 'security@demo.com',
        name: 'David Kim',
        role: UserRole.SECURITY_STAFF,
        orgIndex: 0,
        password: 'password'
      },
      {
        email: 'manager@demo.com',
        name: 'Rachel Thompson',
        role: UserRole.FACILITY_MANAGER,
        orgIndex: 1,
        password: 'password'
      }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      const created = await prisma.user.create({
        data: {
          email: user.email,
          name: user.name,
          role: user.role,
          passwordHash: hashedPassword,
          organizationId: this.orgIds[user.orgIndex],
          isActive: true,
          settings: {
            notifications: {
              email: true,
              sms: false,
              push: true
            },
            preferences: {
              theme: 'light',
              language: 'en'
            }
          }
        }
      });
      
      this.userIds.push(created.id);
      console.log(`   ✓ ${user.name} (${user.role})`);
    }
  }

  private async seedLocations(): Promise<void> {
    console.log('📍 Seeding locations...');
    
    const locations = [
      // City General Hospital locations
      {
        name: 'Emergency Room',
        type: LocationType.COLLECTION_POINT,
        orgIndex: 0,
        address: 'City General Hospital, ER Wing',
        capacity: 50,
        environmentalRequirements: {
          temperatureMin: 18,
          temperatureMax: 24,
          humidityMin: 40,
          humidityMax: 70
        }
      },
      {
        name: 'ICU Storage',
        type: LocationType.STORAGE_FACILITY,
        orgIndex: 0,
        address: 'City General Hospital, ICU Level 3',
        capacity: 100,
        environmentalRequirements: {
          temperatureMin: 2,
          temperatureMax: 8,
          humidityMin: 45,
          humidityMax: 65
        }
      },
      {
        name: 'Hospital Loading Dock',
        type: LocationType.TRANSFER_POINT,
        orgIndex: 0,
        address: 'City General Hospital, Loading Dock B',
        capacity: 200,
        environmentalRequirements: {
          temperatureMin: 15,
          temperatureMax: 25,
          humidityMin: 30,
          humidityMax: 80
        }
      },
      
      // MedLab Analytics locations
      {
        name: 'Main Laboratory',
        type: LocationType.LABORATORY,
        orgIndex: 1,
        address: 'MedLab Analytics, Main Floor',
        capacity: 500,
        environmentalRequirements: {
          temperatureMin: 20,
          temperatureMax: 25,
          humidityMin: 45,
          humidityMax: 60
        }
      },
      {
        name: 'Cold Storage Room',
        type: LocationType.STORAGE_FACILITY,
        orgIndex: 1,
        address: 'MedLab Analytics, Basement Level',
        capacity: 1000,
        environmentalRequirements: {
          temperatureMin: -20,
          temperatureMax: -10,
          humidityMin: 40,
          humidityMax: 60
        }
      },
      
      // Transport Inc locations
      {
        name: 'Transport Vehicle Fleet',
        type: LocationType.MOBILE_UNIT,
        orgIndex: 2,
        address: 'Mobile Transport Units',
        capacity: 20,
        environmentalRequirements: {
          temperatureMin: 2,
          temperatureMax: 8,
          humidityMin: 45,
          humidityMax: 75
        }
      },
      {
        name: 'Distribution Hub',
        type: LocationType.TRANSFER_POINT,
        orgIndex: 2,
        address: 'Transport Inc, Main Distribution Center',
        capacity: 300,
        environmentalRequirements: {
          temperatureMin: 15,
          temperatureMax: 25,
          humidityMin: 40,
          humidityMax: 70
        }
      },
      
      // Pharma Corp locations
      {
        name: 'Pharmaceutical Warehouse',
        type: LocationType.STORAGE_FACILITY,
        orgIndex: 3,
        address: 'Pharma Corp, Warehouse Complex A',
        capacity: 10000,
        environmentalRequirements: {
          temperatureMin: 15,
          temperatureMax: 25,
          humidityMin: 45,
          humidityMax: 65
        }
      }
    ];

    for (const location of locations) {
      const created = await prisma.location.create({
        data: {
          name: location.name,
          type: location.type,
          organizationId: this.orgIds[location.orgIndex],
          address: location.address,
          capacity: location.capacity,
          environmentalRequirements: location.environmentalRequirements,
          isActive: true
        }
      });
      
      this.locationIds.push(created.id);
      console.log(`   ✓ ${location.name} (${location.type})`);
    }
  }

  private async seedItems(): Promise<void> {
    console.log('📦 Seeding items...');
    
    const items = [
      // Lab Specimens
      ...Array.from({ length: 15 }, (_, i) => ({
        identifier: `SPEC${(Date.now() + i).toString().slice(-12)}`,
        type: ItemType.LAB_SPECIMEN,
        description: `Blood sample #${i + 1} for ${['Glucose', 'Cholesterol', 'CBC', 'Liver Panel', 'Thyroid'][i % 5]} testing`,
        locationIndex: 0, // Emergency Room
        metadata: {
          patientId: `PATIENT-${String(i + 1).padStart(3, '0')}`,
          testType: ['Glucose', 'Cholesterol', 'CBC', 'Liver Panel', 'Thyroid'][i % 5],
          priority: ['HIGH', 'NORMAL', 'LOW'][i % 3],
          collectedBy: 'Dr. Sarah Chen',
          collectionDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
        }
      })),
      
      // Medical Devices
      ...Array.from({ length: 8 }, (_, i) => ({
        identifier: `DEVICE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        type: ItemType.MEDICAL_DEVICE,
        description: `${['Ventilator', 'Defibrillator', 'Infusion Pump', 'Patient Monitor'][i % 4]} - Model ${String.fromCharCode(65 + i)}`,
        locationIndex: 1, // ICU Storage
        metadata: {
          manufacturer: ['MedTech Inc', 'HealthDevices Corp', 'MedEquipment Ltd'][i % 3],
          model: `MD-${1000 + i}`,
          serialNumber: `SN${(Date.now() + i * 1000).toString()}`,
          calibrationDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          nextCalibration: new Date(Date.now() + (365 - Math.random() * 60) * 24 * 60 * 60 * 1000)
        }
      })),
      
      // Pharmaceuticals
      ...Array.from({ length: 12 }, (_, i) => ({
        identifier: `PHARMA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        type: ItemType.PHARMACEUTICAL,
        description: `${['Insulin', 'Antibiotics', 'Pain Relief', 'Vaccines', 'Chemotherapy'][i % 5]} - Batch ${String.fromCharCode(65 + Math.floor(i / 3))}`,
        locationIndex: 7, // Pharmaceutical Warehouse
        metadata: {
          batchNumber: `BATCH-2024-${String(i + 1).padStart(3, '0')}`,
          expirationDate: new Date(Date.now() + (365 + Math.random() * 365) * 24 * 60 * 60 * 1000),
          manufacturer: 'Pharma Corp',
          dosage: ['10mg', '25mg', '50mg', '100mg'][i % 4],
          quantity: Math.floor(Math.random() * 1000) + 100
        }
      })),
      
      // Patient Samples
      ...Array.from({ length: 10 }, (_, i) => ({
        identifier: `SAMPLE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        type: ItemType.PATIENT_SAMPLE,
        description: `${['Tissue', 'Urine', 'Saliva', 'Biopsy'][i % 4]} sample for analysis`,
        locationIndex: 3, // Main Laboratory
        metadata: {
          patientId: `PATIENT-${String(i + 100).padStart(3, '0')}`,
          sampleType: ['Tissue', 'Urine', 'Saliva', 'Biopsy'][i % 4],
          collectionDate: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000),
          preservationMethod: ['Frozen', 'Refrigerated', 'Room Temperature'][i % 3]
        }
      }))
    ];

    for (const item of items) {
      const created = await prisma.item.create({
        data: {
          identifier: item.identifier,
          type: item.type,
          status: ItemStatus.ACTIVE,
          description: item.description,
          currentLocationId: this.locationIds[item.locationIndex],
          createdBy: this.userIds[1], // Dr. Sarah Chen
          metadata: item.metadata
        }
      });
      
      this.itemIds.push(created.id);
    }
    
    console.log(`   ✓ Created ${items.length} items`);
  }

  private async seedIoTDevices(): Promise<void> {
    console.log('📱 Seeding IoT devices...');
    
    const devices = [
      // Temperature sensors
      ...Array.from({ length: 8 }, (_, i) => ({
        deviceId: `TEMP-SENSOR-${String(i + 1).padStart(3, '0')}`,
        name: `Temperature Sensor ${i + 1}`,
        type: DeviceType.TEMPERATURE_SENSOR,
        locationIndex: i % this.locationIds.length,
        heliumDeviceId: `helium_temp_${i + 1}`,
        configuration: {
          sampleRate: 60, // seconds
          alertThresholds: {
            temperatureMin: 2,
            temperatureMax: 8,
            humidityMin: 45,
            humidityMax: 85
          },
          batteryAlertLevel: 20
        }
      })),
      
      // GPS trackers
      ...Array.from({ length: 4 }, (_, i) => ({
        deviceId: `GPS-TRACKER-${String(i + 1).padStart(3, '0')}`,
        name: `GPS Tracker ${i + 1}`,
        type: DeviceType.GPS_TRACKER,
        locationIndex: 5, // Transport vehicles
        heliumDeviceId: `helium_gps_${i + 1}`,
        configuration: {
          sampleRate: 300, // 5 minutes
          geofencing: {
            enabled: true,
            radius: 100 // meters
          },
          batteryAlertLevel: 15
        }
      })),
      
      // Smart containers
      ...Array.from({ length: 3 }, (_, i) => ({
        deviceId: `CONTAINER-${String(i + 1).padStart(3, '0')}`,
        name: `Smart Container ${i + 1}`,
        type: DeviceType.SMART_CONTAINER,
        locationIndex: [1, 4, 7][i], // Cold storage locations
        heliumDeviceId: `helium_container_${i + 1}`,
        configuration: {
          sampleRate: 120, // 2 minutes
          sensors: ['temperature', 'humidity', 'pressure', 'tamper'],
          alertThresholds: {
            temperatureMin: -25,
            temperatureMax: 8,
            humidityMin: 40,
            humidityMax: 70
          }
        }
      }))
    ];

    for (const device of devices) {
      const created = await prisma.ioTDevice.create({
        data: {
          deviceId: device.deviceId,
          name: device.name,
          type: device.type,
          locationId: this.locationIds[device.locationIndex],
          heliumDeviceId: device.heliumDeviceId,
          status: 'ACTIVE',
          lastSeen: new Date(),
          batteryLevel: 75 + Math.random() * 25, // 75-100%
          configuration: device.configuration
        }
      });
      
      this.deviceIds.push(created.id);
    }
    
    console.log(`   ✓ Created ${devices.length} IoT devices`);
  }

  private async seedWorkflows(): Promise<void> {
    console.log('⚙️ Seeding workflows...');
    
    const workflows = [
      {
        name: 'Cold Chain Compliance',
        description: 'Automated response to temperature violations',
        triggerType: WorkflowTriggerType.IOT_ALERT,
        triggerConditions: {
          alertTypes: ['TEMPERATURE_VIOLATION'],
          severityLevels: ['MEDIUM', 'HIGH']
        },
        actions: [
          { type: 'QUARANTINE_ITEM', parameters: { reason: 'Temperature violation' } },
          { type: 'NOTIFY_STAKEHOLDERS', parameters: { roles: ['COMPLIANCE_OFFICER', 'FACILITY_MANAGER'] } },
          { type: 'CREATE_INCIDENT_REPORT', parameters: { template: 'temperature_violation' } }
        ],
        isActive: true
      },
      {
        name: 'High Value Transfer Approval',
        description: 'Require approval for high-value item transfers',
        triggerType: WorkflowTriggerType.CUSTODY_TRANSFER,
        triggerConditions: {
          itemTypes: ['MEDICAL_DEVICE', 'PHARMACEUTICAL'],
          valueThreshold: 10000
        },
        actions: [
          { type: 'REQUEST_APPROVAL', parameters: { approvers: ['COMPLIANCE_OFFICER'], timeout: 3600 } },
          { type: 'HOLD_TRANSFER', parameters: { reason: 'Pending approval' } },
          { type: 'NOTIFY_REQUESTER', parameters: { message: 'Transfer pending approval' } }
        ],
        isActive: true
      },
      {
        name: 'Battery Low Warning',
        description: 'Alert when IoT device battery is low',
        triggerType: WorkflowTriggerType.IOT_ALERT,
        triggerConditions: {
          alertTypes: ['LOW_BATTERY'],
          severityLevels: ['MEDIUM', 'HIGH']
        },
        actions: [
          { type: 'NOTIFY_MAINTENANCE', parameters: { message: 'Device battery replacement needed' } },
          { type: 'SCHEDULE_MAINTENANCE', parameters: { priority: 'HIGH', window: 24 } }
        ],
        isActive: true
      },
      {
        name: 'Emergency Recall',
        description: 'Rapid response for product recalls',
        triggerType: WorkflowTriggerType.MANUAL,
        triggerConditions: {
          itemTypes: ['PHARMACEUTICAL', 'MEDICAL_DEVICE'],
          scope: 'ORGANIZATION'
        },
        actions: [
          { type: 'IDENTIFY_AFFECTED_ITEMS', parameters: { criteria: 'batch_number' } },
          { type: 'QUARANTINE_ITEMS', parameters: { reason: 'Emergency recall' } },
          { type: 'NOTIFY_ALL_FACILITIES', parameters: { urgency: 'EMERGENCY' } },
          { type: 'GENERATE_RECALL_REPORT', parameters: { regulatory: true } }
        ],
        isActive: true
      },
      {
        name: 'Daily Lab Transfer',
        description: 'Scheduled transfer of specimens to lab',
        triggerType: WorkflowTriggerType.SCHEDULED,
        triggerConditions: {
          schedule: 'DAILY',
          time: '14:00',
          itemTypes: ['LAB_SPECIMEN']
        },
        actions: [
          { type: 'BATCH_TRANSFER', parameters: { destination: 'Main Laboratory' } },
          { type: 'GENERATE_MANIFEST', parameters: { format: 'PDF' } },
          { type: 'NOTIFY_RECEIVERS', parameters: { advance_notice: 30 } }
        ],
        isActive: false // Disabled for demo
      }
    ];

    for (const workflow of workflows) {
      const created = await prisma.workflow.create({
        data: {
          name: workflow.name,
          description: workflow.description,
          triggerType: workflow.triggerType,
          triggerConditions: workflow.triggerConditions,
          actions: workflow.actions,
          isActive: workflow.isActive,
          createdBy: this.userIds[0] // Admin user
        }
      });
      
      console.log(`   ✓ ${workflow.name}`);
    }
  }

  private async seedInitialData(): Promise<void> {
    console.log('📊 Seeding initial IoT data...');
    
    // Generate some historical IoT data
    const devices = await prisma.ioTDevice.findMany();
    const now = new Date();
    
    for (const device of devices) {
      // Generate data for the last 24 hours
      for (let i = 0; i < 288; i++) { // Every 5 minutes for 24 hours
        const timestamp = new Date(now.getTime() - (i * 5 * 60 * 1000));
        
        await prisma.ioTData.create({
          data: {
            deviceId: device.id,
            temperature: 4 + (Math.random() - 0.5) * 2, // 3-5°C
            humidity: 65 + (Math.random() - 0.5) * 10, // 60-70%
            pressure: 1013 + (Math.random() - 0.5) * 5,
            batteryLevel: device.batteryLevel || 85,
            timestamp
          }
        });
      }
    }
    
    console.log(`   ✓ Generated 24h of historical data for ${devices.length} devices`);
    
    // Create some sample custody events
    console.log('📋 Seeding custody events...');
    
    const sampleItems = this.itemIds.slice(0, 5);
    
    for (const itemId of sampleItems) {
      await prisma.custodyEvent.create({
        data: {
          itemId,
          fromLocationId: this.locationIds[0],
          toLocationId: this.locationIds[3],
          transferredBy: this.userIds[1], // Dr. Sarah Chen
          receivedBy: this.userIds[2], // Mike Rodriguez
          eventType: 'TRANSFER',
          timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
          digitalSignature: `DEMO_SIG_${Date.now()}`,
          notes: 'Demo transfer for testing'
        }
      });
    }
    
    console.log(`   ✓ Created custody events for ${sampleItems.length} items`);
  }

  private async printSummary(): Promise<void> {
    console.log('\n📊 Demo Data Summary:');
    
    const counts = {
      organizations: await prisma.organization.count(),
      users: await prisma.user.count(),
      locations: await prisma.location.count(),
      items: await prisma.item.count(),
      iotDevices: await prisma.ioTDevice.count(),
      workflows: await prisma.workflow.count(),
      iotData: await prisma.ioTData.count(),
      custodyEvents: await prisma.custodyEvent.count()
    };
    
    console.log(`   🏢 Organizations: ${counts.organizations}`);
    console.log(`   👥 Users: ${counts.users}`);
    console.log(`   📍 Locations: ${counts.locations}`);
    console.log(`   📦 Items: ${counts.items}`);
    console.log(`   📱 IoT Devices: ${counts.iotDevices}`);
    console.log(`   ⚙️ Workflows: ${counts.workflows}`);
    console.log(`   📊 IoT Data Points: ${counts.iotData}`);
    console.log(`   📋 Custody Events: ${counts.custodyEvents}`);
    
    console.log('\n🔑 Demo Login Credentials:');
    console.log('   Email: admin@demo.com | Password: password (Admin)');
    console.log('   Email: sarah@demo.com | Password: password (Doctor)');
    console.log('   Email: mike@demo.com | Password: password (Lab Tech)');
    console.log('   Email: lisa@demo.com | Password: password (Compliance)');
    console.log('   Email: tom@demo.com | Password: password (Transport)');
    
    console.log('\n🚀 Ready for demo! Run: npm run demo:scenario all');
  }

  async destroy(): Promise<void> {
    await prisma.$disconnect();
  }
}

// CLI interface
if (require.main === module) {
  const seeder = new DemoDataSeeder();
  
  const command = process.argv[2];

  switch (command) {
    case 'clean':
      seeder.cleanDatabase()
        .then(() => console.log('✅ Database cleaned'))
        .catch(console.error)
        .finally(() => seeder.destroy());
      break;
    
    case 'seed':
    case 'all':
    default:
      seeder.seedAll()
        .catch(console.error)
        .finally(() => seeder.destroy());
      break;
  }
}

export default DemoDataSeeder;
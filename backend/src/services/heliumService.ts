import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface HeliumDevice {
  id: string;
  name: string;
  dev_eui: string;
  app_eui: string;
  app_key: string;
  organization_id: string;
  last_seen_at?: string;
  total_packets?: number;
}

export interface HeliumWebhookConfig {
  name: string;
  url: string;
  secret: string;
  organization_id: string;
}

export class HeliumService {
  private apiKey: string;
  private baseUrl = 'https://console.helium.com/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  // Device Management
  async getDevices(organizationId: string): Promise<HeliumDevice[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/organizations/${organizationId}/devices`,
        { headers: this.getHeaders() }
      );
      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching Helium devices:', error);
      throw new Error('Failed to fetch devices from Helium Console');
    }
  }

  async getDevice(deviceId: string): Promise<HeliumDevice> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/devices/${deviceId}`,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching Helium device:', error);
      throw new Error('Failed to fetch device from Helium Console');
    }
  }

  async createDevice(deviceData: Partial<HeliumDevice>): Promise<HeliumDevice> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/devices`,
        deviceData,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error creating Helium device:', error);
      throw new Error('Failed to create device in Helium Console');
    }
  }

  async updateDevice(deviceId: string, updates: Partial<HeliumDevice>): Promise<HeliumDevice> {
    try {
      const response = await axios.put(
        `${this.baseUrl}/devices/${deviceId}`,
        updates,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error updating Helium device:', error);
      throw new Error('Failed to update device in Helium Console');
    }
  }

  async deleteDevice(deviceId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/devices/${deviceId}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      logger.error('Error deleting Helium device:', error);
      throw new Error('Failed to delete device from Helium Console');
    }
  }

  // Webhook Management
  async createWebhook(config: HeliumWebhookConfig): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/webhooks`,
        config,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Error creating Helium webhook:', error);
      throw new Error('Failed to create webhook in Helium Console');
    }
  }

  async getWebhooks(organizationId: string): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/organizations/${organizationId}/webhooks`,
        { headers: this.getHeaders() }
      );
      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching Helium webhooks:', error);
      throw new Error('Failed to fetch webhooks from Helium Console');
    }
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.baseUrl}/webhooks/${webhookId}`,
        { headers: this.getHeaders() }
      );
    } catch (error) {
      logger.error('Error deleting Helium webhook:', error);
      throw new Error('Failed to delete webhook from Helium Console');
    }
  }

  // Data Retrieval
  async getDeviceEvents(deviceId: string, limit = 100): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/devices/${deviceId}/events?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching device events:', error);
      throw new Error('Failed to fetch device events from Helium Console');
    }
  }

  async getDevicePackets(deviceId: string, limit = 100): Promise<any[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/devices/${deviceId}/packets?limit=${limit}`,
        { headers: this.getHeaders() }
      );
      return response.data.data || [];
    } catch (error) {
      logger.error('Error fetching device packets:', error);
      throw new Error('Failed to fetch device packets from Helium Console');
    }
  }

  // Integration Functions
  async syncDevices(organizationId: string): Promise<void> {
    try {
      const heliumDevices = await this.getDevices(organizationId);
      
      for (const heliumDevice of heliumDevices) {
        // Check if device exists in our database
        const existingDevice = await prisma.ioTDevice.findUnique({
          where: { heliumDeviceId: heliumDevice.id }
        });

        if (!existingDevice) {
          // Create new device in our database
          await prisma.ioTDevice.create({
            data: {
              heliumDeviceId: heliumDevice.id,
              name: heliumDevice.name,
              deviceType: 'UNKNOWN', // Will need to be updated manually
              organizationId, // This should map to our organization ID
              lastSeen: heliumDevice.last_seen_at ? new Date(heliumDevice.last_seen_at) : new Date(),
              isActive: true
            }
          });
          
          logger.info('Synced new device from Helium:', {
            heliumDeviceId: heliumDevice.id,
            name: heliumDevice.name
          });
        } else {
          // Update existing device
          await prisma.ioTDevice.update({
            where: { heliumDeviceId: heliumDevice.id },
            data: {
              name: heliumDevice.name,
              lastSeen: heliumDevice.last_seen_at ? new Date(heliumDevice.last_seen_at) : existingDevice.lastSeen
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error syncing devices from Helium:', error);
      throw error;
    }
  }

  async setupWebhookForOrganization(organizationId: string, webhookUrl: string): Promise<string> {
    try {
      const secret = this.generateWebhookSecret();
      
      const webhook = await this.createWebhook({
        name: `Healthcare Chain of Custody - ${organizationId}`,
        url: webhookUrl,
        secret,
        organization_id: organizationId
      });

      // Store webhook in our database
      await prisma.heliumWebhook.create({
        data: {
          webhookId: webhook.id,
          name: webhook.name,
          endpoint: webhookUrl,
          secret,
          organizationId, // This should map to our organization ID
          isActive: true
        }
      });

      logger.info('Webhook created for organization:', {
        organizationId,
        webhookId: webhook.id,
        endpoint: webhookUrl
      });

      return webhook.id;
    } catch (error) {
      logger.error('Error setting up webhook:', error);
      throw error;
    }
  }

  private generateWebhookSecret(): string {
    return require('crypto').randomBytes(32).toString('hex');
  }

  // Device Configuration Helpers
  static getDeviceTypeConfig(deviceType: string) {
    const configs = {
      TEMP_SENSOR: {
        transmissionInterval: 15, // minutes
        thresholds: {
          tempMin: 2.0,
          tempMax: 8.0,
          humidityMax: 80.0
        }
      },
      GPS_TRACKER: {
        transmissionInterval: 5, // minutes
        thresholds: {
          geofence: {
            radius: 1000 // meters
          }
        }
      },
      SMART_CONTAINER: {
        transmissionInterval: 30, // minutes
        thresholds: {
          tempMin: 2.0,
          tempMax: 8.0,
          tamperDetection: true
        }
      },
      FACILITY_MONITOR: {
        transmissionInterval: 60, // minutes
        thresholds: {
          tempMin: 18.0,
          tempMax: 25.0,
          humidityMin: 30.0,
          humidityMax: 70.0
        }
      }
    };

    return configs[deviceType as keyof typeof configs] || configs.TEMP_SENSOR;
  }
}

// Factory function to create Helium service instance
export function createHeliumService(apiKey?: string): HeliumService {
  const key = apiKey || process.env.HELIUM_API_KEY;
  if (!key) {
    throw new Error('Helium API key is required');
  }
  return new HeliumService(key);
}
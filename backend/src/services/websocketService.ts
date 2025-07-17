import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface SocketUser {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  socketId: string;
}

export class WebSocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, SocketUser> = new Map();

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.use(this.authenticateSocket.bind(this));

    this.io.on('connection', (socket) => {
      const user = socket.data.user as SocketUser;
      user.socketId = socket.id;
      
      this.connectedUsers.set(socket.id, user);
      
      logger.info('User connected via WebSocket:', {
        userId: user.id,
        socketId: socket.id,
        organizationId: user.organizationId
      });

      // Join organization room for targeted updates
      socket.join(`org:${user.organizationId}`);
      
      // Join user-specific room for personal notifications
      socket.join(`user:${user.id}`);

      // Handle subscription to specific device updates
      socket.on('subscribe:device', (deviceId: string) => {
        this.handleDeviceSubscription(socket, deviceId);
      });

      socket.on('unsubscribe:device', (deviceId: string) => {
        socket.leave(`device:${deviceId}`);
      });

      // Handle subscription to location updates
      socket.on('subscribe:location', (locationId: string) => {
        this.handleLocationSubscription(socket, locationId);
      });

      socket.on('unsubscribe:location', (locationId: string) => {
        socket.leave(`location:${locationId}`);
      });

      // Handle alert acknowledgment
      socket.on('acknowledge:alert', (alertId: string) => {
        this.handleAlertAcknowledgment(socket, alertId);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id);
        logger.info('User disconnected from WebSocket:', {
          userId: user.id,
          socketId: socket.id
        });
      });

      // Send initial connection confirmation
      socket.emit('connection:confirmed', {
        message: 'Connected to real-time monitoring',
        timestamp: new Date().toISOString()
      });
    });
  }

  private async authenticateSocket(socket: any, next: Function): Promise<void> {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('No authentication token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Fetch user details
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
          isActive: true
        }
      });

      if (!user || !user.isActive) {
        return next(new Error('Invalid or inactive user'));
      }

      socket.data.user = user;
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  }

  private async handleDeviceSubscription(socket: any, deviceId: string): Promise<void> {
    try {
      const user = socket.data.user as SocketUser;
      
      // Verify user has access to this device
      const device = await prisma.ioTDevice.findUnique({
        where: { heliumDeviceId: deviceId },
        select: { organizationId: true }
      });

      if (!device) {
        socket.emit('error', { message: 'Device not found' });
        return;
      }

      // Check access permissions
      if (device.organizationId !== user.organizationId && !['ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role)) {
        socket.emit('error', { message: 'Access denied to device' });
        return;
      }

      socket.join(`device:${deviceId}`);
      socket.emit('subscribed:device', { deviceId });
      
      logger.info('User subscribed to device updates:', {
        userId: user.id,
        deviceId
      });
    } catch (error) {
      logger.error('Error handling device subscription:', error);
      socket.emit('error', { message: 'Subscription failed' });
    }
  }

  private async handleLocationSubscription(socket: any, locationId: string): Promise<void> {
    try {
      const user = socket.data.user as SocketUser;
      
      // Verify user has access to this location
      const location = await prisma.location.findUnique({
        where: { id: locationId },
        select: { organizationId: true }
      });

      if (!location || (location.organizationId !== user.organizationId && !['ADMIN', 'COMPLIANCE_OFFICER'].includes(user.role))) {
        socket.emit('error', { message: 'Access denied to location' });
        return;
      }

      socket.join(`location:${locationId}`);
      socket.emit('subscribed:location', { locationId });
    } catch (error) {
      logger.error('Error handling location subscription:', error);
      socket.emit('error', { message: 'Subscription failed' });
    }
  }

  private async handleAlertAcknowledgment(socket: any, alertId: string): Promise<void> {
    try {
      const user = socket.data.user as SocketUser;
      
      const alert = await prisma.ioTAlert.update({
        where: { id: alertId },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
          resolvedBy: user.id
        },
        include: {
          device: {
            select: { organizationId: true, name: true }
          }
        }
      });

      // Notify organization about alert resolution
      this.emitToOrganization(alert.device.organizationId, 'alert:resolved', {
        alertId,
        resolvedBy: user.id,
        timestamp: new Date().toISOString(),
        deviceName: alert.device.name
      });

      logger.info('Alert acknowledged via WebSocket:', {
        alertId,
        resolvedBy: user.id
      });
    } catch (error) {
      logger.error('Error acknowledging alert:', error);
      socket.emit('error', { message: 'Failed to acknowledge alert' });
    }
  }

  // Public methods for emitting events
  public emitSensorData(deviceId: string, data: any): void {
    this.io.to(`device:${deviceId}`).emit('sensor:data', {
      deviceId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public emitAlert(alert: any): void {
    const { device } = alert;
    
    // Emit to organization
    this.emitToOrganization(device.organizationId, 'alert:new', alert);
    
    // Emit to device subscribers
    this.io.to(`device:${alert.deviceId}`).emit('device:alert', alert);
    
    // Emit to location subscribers if device has location
    if (device.locationId) {
      this.io.to(`location:${device.locationId}`).emit('location:alert', alert);
    }
  }

  public emitDeviceStatusChange(deviceId: string, status: string, organizationId: string): void {
    this.emitToOrganization(organizationId, 'device:status', {
      deviceId,
      status,
      timestamp: new Date().toISOString()
    });

    this.io.to(`device:${deviceId}`).emit('device:status_change', {
      deviceId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  public emitCustodyTransfer(transfer: any): void {
    this.emitToOrganization(transfer.item.organizationId, 'custody:transfer', transfer);
  }

  public emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public emitToOrganization(organizationId: string, event: string, data: any): void {
    this.io.to(`org:${organizationId}`).emit(event, data);
  }

  public emitSystemAlert(level: 'info' | 'warning' | 'error', message: string, data?: any): void {
    this.io.emit('system:alert', {
      level,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  // Get connected users statistics
  public getConnectionStats(): any {
    const stats = {
      totalConnections: this.connectedUsers.size,
      usersByOrganization: new Map<string, number>(),
      usersByRole: new Map<string, number>()
    };

    this.connectedUsers.forEach(user => {
      // Count by organization
      const orgCount = stats.usersByOrganization.get(user.organizationId) || 0;
      stats.usersByOrganization.set(user.organizationId, orgCount + 1);
      
      // Count by role
      const roleCount = stats.usersByRole.get(user.role) || 0;
      stats.usersByRole.set(user.role, roleCount + 1);
    });

    return {
      ...stats,
      usersByOrganization: Object.fromEntries(stats.usersByOrganization),
      usersByRole: Object.fromEntries(stats.usersByRole)
    };
  }

  public getConnectedUsers(): SocketUser[] {
    return Array.from(this.connectedUsers.values());
  }
}

export let websocketService: WebSocketService;

export function initializeWebSocket(server: HttpServer): WebSocketService {
  websocketService = new WebSocketService(server);
  return websocketService;
}
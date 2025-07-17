import { createServer } from 'http';
import app from './app';
import { logger } from './utils/logger';
import { initializeWebSocket } from './services/websocketService';

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const websocketService = initializeWebSocket(server);

server.listen(PORT, () => {
  logger.info(`🚀 Healthcare Chain of Custody API running on port ${PORT}`);
  logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 Security headers enabled`);
  logger.info(`📊 Audit logging active`);
  logger.info(`⚡ WebSocket server initialized`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export default server;
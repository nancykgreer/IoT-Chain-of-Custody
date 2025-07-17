import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Chain of Custody API',
      version,
      description: 'Comprehensive API for tracking medical specimens with blockchain rewards',
      contact: {
        name: 'API Support',
        email: 'support@healthcare-chain.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api',
        description: 'Development server',
      },
      {
        url: 'https://api.healthcare-chain.com/api',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR',
                },
                message: {
                  type: 'string',
                  example: 'Invalid input data',
                },
                details: {
                  type: 'object',
                },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1,
            },
            limit: {
              type: 'integer',
              example: 20,
            },
            total: {
              type: 'integer',
              example: 100,
            },
            pages: {
              type: 'integer',
              example: 5,
            },
          },
        },
        Item: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'item_123',
            },
            barcode: {
              type: 'string',
              example: 'HC2024001',
            },
            name: {
              type: 'string',
              example: 'Blood Sample A1',
            },
            type: {
              type: 'string',
              enum: ['SPECIMEN', 'EQUIPMENT', 'MEDICATION', 'SUPPLY'],
              example: 'SPECIMEN',
            },
            status: {
              type: 'string',
              enum: ['AVAILABLE', 'IN_TRANSIT', 'QUARANTINED', 'DISPOSED'],
              example: 'AVAILABLE',
            },
            currentLocation: {
              $ref: '#/components/schemas/Location',
            },
            metadata: {
              type: 'object',
              additionalProperties: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Location: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'loc_123',
            },
            name: {
              type: 'string',
              example: 'Lab Storage A',
            },
            type: {
              type: 'string',
              example: 'STORAGE',
            },
            address: {
              type: 'string',
            },
          },
        },
        CustodyEvent: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'custody_123',
            },
            type: {
              type: 'string',
              enum: ['CREATION', 'TRANSFER', 'UPDATE', 'DISPOSAL'],
              example: 'TRANSFER',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            fromLocation: {
              $ref: '#/components/schemas/Location',
            },
            toLocation: {
              $ref: '#/components/schemas/Location',
            },
            handledBy: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                },
                name: {
                  type: 'string',
                },
              },
            },
            verificationMethod: {
              type: 'string',
              enum: ['BARCODE_SCAN', 'MANUAL', 'RFID', 'BIOMETRIC'],
            },
            notes: {
              type: 'string',
            },
          },
        },
        Workflow: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: 'workflow_123',
            },
            name: {
              type: 'string',
              example: 'Cold Chain Violation Response',
            },
            workflowType: {
              type: 'string',
              example: 'COLD_CHAIN_COMPLIANCE',
            },
            triggerType: {
              type: 'string',
              enum: ['IOT_ALERT', 'SCHEDULE', 'MANUAL', 'EVENT'],
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  operator: {
                    type: 'string',
                  },
                  value: {
                    type: 'any',
                  },
                },
              },
            },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                  },
                  config: {
                    type: 'object',
                  },
                },
              },
            },
          },
        },
        TokenBalance: {
          type: 'object',
          properties: {
            address: {
              type: 'string',
              example: '0x742d35Cc6634C0532925a3b844Bc9e7595f8f123',
            },
            balance: {
              type: 'string',
              example: '1250.50',
            },
            symbol: {
              type: 'string',
              example: 'CHAIN',
            },
            totalRewards: {
              type: 'string',
              example: '5420.75',
            },
            compliance: {
              type: 'number',
              example: 92.5,
            },
          },
        },
        BlockchainTransaction: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
            },
            hash: {
              type: 'string',
              example: '0x123abc...def456',
            },
            type: {
              type: 'string',
              enum: ['COMPLIANCE_REWARD', 'WORKFLOW_REWARD', 'QUALITY_BONUS', 'TOKEN_MINT'],
            },
            amount: {
              type: 'string',
              example: '100',
            },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'FAILED'],
            },
            fromAddress: {
              type: 'string',
            },
            toAddress: {
              type: 'string',
            },
            blockNumber: {
              type: 'integer',
            },
            gasUsed: {
              type: 'string',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
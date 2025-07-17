import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../swagger';

const router = Router();

// Swagger UI options
const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true,
  },
  customCss: `
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info .title { color: #2c3e50; }
    .swagger-ui .info .description { color: #34495e; }
    .swagger-ui .scheme-container { background: #f8f9fa; }
    .swagger-ui .btn.authorize { background-color: #007bff; border-color: #007bff; }
    .swagger-ui .btn.authorize:hover { background-color: #0056b3; border-color: #0056b3; }
  `,
  customSiteTitle: 'Healthcare Chain of Custody API',
  customfavIcon: '/favicon.ico',
};

// Serve Swagger UI
router.use('/docs', swaggerUi.serve);
router.get('/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Serve OpenAPI JSON spec
router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve OpenAPI YAML spec
router.get('/openapi.yaml', (req, res) => {
  const yaml = require('yaml');
  res.setHeader('Content-Type', 'application/yaml');
  res.send(yaml.stringify(swaggerSpec));
});

export default router;
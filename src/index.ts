import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

const PORT = Number(process.env.PORT || 4000);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: { title: 'Bazeni-na-dan API', version: '1.0.0' },
    servers: [{ url: '/api' }]
  },
  apis: ['src/index.ts']
});

const app = express();
app.use(express.json());

// ----- Routes (keep super simple) -----

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/api/health', (_req, res) => {
  res.json({ state: 'success', uptime: process.uptime() });
});

/**
 * @openapi
 * /pools:
 *   get:
 *     summary: List pools (placeholder)
 *     responses:
 *       200:
 *         description: OK
 */
app.get('/api/pools', (_req, res) => {
  res.json({ state: 'success', pools: [] });
});

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start
app.listen(PORT, () => {
  console.log(`API:   http://localhost:${PORT}/api/health`);
  console.log(`Docs:  http://localhost:${PORT}/docs`);
});

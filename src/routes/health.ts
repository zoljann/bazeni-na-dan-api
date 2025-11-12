import { Router } from 'express';
import { pingMongo, mongoReadyState } from '../config/db';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check (process)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 *                   example: 123.456
 */
router.get('/health', (_req, res) => {
  res.json({ uptime: process.uptime() });
});

/**
 * @openapi
 * /health/db:
 *   get:
 *     tags: [Health]
 *     summary: MongoDB connectivity check
 *     responses:
 *       200:
 *         description: Mongo reachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mongo:
 *                   type: string
 *                   example: ok
 *                 readyState:
 *                   type: integer
 *                   description: Mongoose connection state (0..3)
 *                   example: 1
 *       500:
 *         description: Mongo unreachable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 state:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Mongo not reachable
 *                 readyState:
 *                   type: integer
 *                   example: 0
 */
router.get('/health/db', async (_req, res) => {
  try {
    await pingMongo();
    res.json({ mongo: 'ok', readyState: mongoReadyState() });
  } catch {
    res
      .status(500)
      .json({ state: 'error', message: 'Mongo not reachable', readyState: mongoReadyState() });
  }
});

export default router;

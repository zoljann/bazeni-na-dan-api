import { Router } from 'express';
import { pingMongo, mongoReadyState } from '../config/db';
const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/health', (_req, res) => {
  res.json({ uptime: process.uptime() });
});

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

import { Router } from 'express';
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
  res.json({ state: 'success', uptime: process.uptime() });
});

export default router;

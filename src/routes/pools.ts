import { Router } from 'express';
const router = Router();

/**
 * @openapi
 * /pools:
 *   get:
 *     summary: List pools (placeholder)
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/pools', (_req, res) => {
  res.json({ state: 'success', pools: [] });
});

export default router;

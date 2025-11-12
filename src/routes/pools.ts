import { Router } from 'express';
import { Types } from 'mongoose';
import { Pool } from '../models/pool';
import { adminSecretRequired, authRequired } from '../helpers/authRequired';

const router = Router();
const isObjectId = (v: unknown): v is string => typeof v === 'string' && Types.ObjectId.isValid(v);
const inRange = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Filters:
 *       type: object
 *       properties:
 *         heated:
 *           type: boolean
 *           example: true
 *         petsAllowed:
 *           type: boolean
 *           example: false
 *     Pool:
 *       type: object
 *       required: [id, userId, title, city, capacity, images]
 *       properties:
 *         id: { type: string, example: "665c1a2f7a2f0a3f9b6d1a11" }
 *         userId: { type: string, example: "665c1a2f7a2f0a3f9b6d1a10" }
 *         title: { type: string, example: "Vila Sunce" }
 *         city: { type: string, example: "Mostar" }
 *         capacity: { type: integer, example: 8 }
 *         images:
 *           type: array
 *           items: { type: string, example: "https://example.com/pool.jpg" }
 *         pricePerDay: { type: number, nullable: true, example: 150 }
 *         description: { type: string, nullable: true, example: "Kratak opis..." }
 *         busyDays:
 *           type: array
 *           nullable: true
 *           items: { type: string, format: date, example: "2025-06-12" }
 *         filters:
 *           $ref: '#/components/schemas/Filters'
 *         isVisible: { type: boolean, example: true }
 *         visibleUntil:
 *           type: string
 *           nullable: true
 *           format: date-time
 *           example: "2026-01-01T00:00:00.000Z"
 *     NewPool:
 *       type: object
 *       required: [title, city, capacity, images]
 *       properties:
 *         title: { type: string, example: "Mostarska Terasa" }
 *         city: { type: string, example: "Mostar" }
 *         capacity: { type: integer, example: 9 }
 *         images:
 *           type: array
 *           items: { type: string }
 *         pricePerDay: { type: number, nullable: true }
 *         description: { type: string, nullable: true }
 *         filters:
 *           $ref: '#/components/schemas/Filters'
 *         busyDays:
 *           type: array
 *           items: { type: string, format: date }
 *     CreatePoolRequest:
 *       type: object
 *       required: [pool]
 *       properties:
 *         pool:
 *           $ref: '#/components/schemas/NewPool'
 *     VisibilityUpdate:
 *       type: object
 *       required: [isVisible]
 *       properties:
 *         isVisible: { type: boolean, example: true }
 *         visibleUntil:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-01-01T00:00:00.000Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 */

/**
 * @openapi
 * /pools:
 *   get:
 *     tags: [Pools]
 *     summary: List pools
 *     description: |
 *       - If `userId` is a valid ObjectId, returns **all** pools for that owner (ignores visibility).
 *       - Otherwise returns only pools that are visible and not expired.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: false
 *         schema: { type: string }
 *         description: Filter by owner id (ObjectId). If provided and valid, visibility is ignored.
 *     responses:
 *       200:
 *         description: List of pools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pools:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pool'
 */
router.get('/pools', async (req, res) => {
  const userId = typeof req.query.userId === 'string' ? req.query.userId.trim() : undefined;
  const now = new Date();

  const filter = isObjectId(userId)
    ? { userId: new Types.ObjectId(userId) }
    : { isVisible: true, $or: [{ visibleUntil: null }, { visibleUntil: { $gte: now } }] };

  const pools = await Pool.find(filter).sort({ createdAt: -1 });
  return res.json({ pools: pools.map((p) => p.toObject()) });
});

/**
 * @openapi
 * /pool:
 *   get:
 *     tags: [Pools]
 *     summary: Get a single pool (public)
 *     description: Returns pool only if it is visible and not expired.
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Pool found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pool:
 *                   $ref: '#/components/schemas/Pool'
 *       400:
 *         description: Invalid id
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Pool not found (or not public)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/pool', async (req, res) => {
  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const pool = await Pool.findById(id);
  if (!pool) return res.status(404).json({ message: 'Pool not found' });

  const now = new Date();
  const isPublic = pool.isVisible === true && (!pool.visibleUntil || pool.visibleUntil >= now);
  if (!isPublic) return res.status(404).json({ message: 'Pool not found' });

  return res.json({ pool: pool.toObject() });
});

/**
 * @openapi
 * /pools:
 *   post:
 *     tags: [Pools]
 *     summary: Create a pool
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreatePoolRequest' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pool:
 *                   $ref: '#/components/schemas/Pool'
 *       400:
 *         description: Invalid pool data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 */
router.post('/pools', authRequired, async (req, res) => {
  const authUserId = (req as any).userId as string;
  const bodyPool = req.body?.pool || {};

  const title = (bodyPool.title ?? '').trim();
  const city = (bodyPool.city ?? '').trim();
  const capacity = Number(bodyPool.capacity);
  const images: string[] = Array.isArray(bodyPool.images) ? bodyPool.images : [];
  const pricePerDay = bodyPool.pricePerDay === undefined ? undefined : Number(bodyPool.pricePerDay);
  const description =
    typeof bodyPool.description === 'string' ? bodyPool.description.trim() : undefined;
  const filters =
    bodyPool.filters && typeof bodyPool.filters === 'object'
      ? { heated: !!bodyPool.filters.heated, petsAllowed: !!bodyPool.filters.petsAllowed }
      : undefined;
  const busyDays: string[] | undefined = Array.isArray(bodyPool.busyDays)
    ? bodyPool.busyDays
    : undefined;

  const titleOk = title.length >= 3 && title.length <= 40;
  const cityOk = !!city;
  const capOk = inRange(capacity, 1, 100);
  const imagesOk = inRange(images.length, 1, 7);
  const priceOk = pricePerDay === undefined || inRange(pricePerDay, 1, 10000);
  const descOk = description === undefined || inRange(description.length, 1, 300);

  if (!titleOk || !cityOk || !capOk || !imagesOk || !priceOk || !descOk) {
    return res.status(400).json({ message: 'Invalid pool data' });
  }

  const created = await Pool.create({
    userId: new Types.ObjectId(authUserId),
    title,
    city,
    capacity,
    images,
    pricePerDay,
    description,
    filters,
    busyDays
  });

  return res.status(201).json({ pool: created.toObject() });
});

/**
 * @openapi
 * /pools/{id}/visibility:
 *   put:
 *     tags: [Pools]
 *     summary: Update pool visibility (admin/private)
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/VisibilityUpdate' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pool:
 *                   $ref: '#/components/schemas/Pool'
 *       400:
 *         description: Invalid id/visibleUntil
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Pool not found
 */
router.put('/pools/:id/visibility', adminSecretRequired, async (req, res) => {
  const id = req.params.id;
  if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const isVisible = !!req.body?.isVisible;
  const visibleUntilISO = req.body?.visibleUntil as string | undefined;

  let visibleUntil: Date | null = null;
  if (visibleUntilISO) {
    const dt = new Date(visibleUntilISO);
    if (isNaN(dt.getTime())) return res.status(400).json({ message: 'Invalid visibleUntil' });
    visibleUntil = dt;
  }

  const updated = await Pool.findByIdAndUpdate(
    id,
    { $set: { isVisible, visibleUntil: isVisible ? visibleUntil : null } },
    { new: true }
  );
  if (!updated) return res.status(404).json({ message: 'Pool not found' });

  return res.json({ pool: updated.toObject() });
});

/**
 * @openapi
 * /pools/{id}:
 *   delete:
 *     tags: [Pools]
 *     summary: Delete a pool (owner only)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 *       400:
 *         description: Invalid id
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Pool not found (or not owned by user)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete('/pools/:id', authRequired, async (req, res) => {
  const poolId = req.params.id;
  const authUserId = (req as any).userId as string;
  if (!isObjectId(poolId)) return res.status(400).json({ message: 'Invalid id' });

  const deleted = await Pool.findOneAndDelete({
    _id: new Types.ObjectId(poolId),
    userId: new Types.ObjectId(authUserId)
  });

  if (!deleted) return res.status(404).json({ message: 'Pool not found' });
  return res.status(204).send();
});

export default router;

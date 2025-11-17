import { Router } from 'express';
import { Types } from 'mongoose';
import { Pool } from '../models/pool';
import { User } from '../models/user';
import { adminSecretRequired, authRequired } from '../helpers/authRequired';
import { verifyAccess } from '../config/auth';

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
 *     OwnerSummary:
 *       type: object
 *       properties:
 *         name:         { type: string, example: "Nedim Zolj" }
 *         avatarUrl:    { type: string, nullable: true, example: "https://cdn.example.com/u/123.jpg" }
 *         mobileNumber: { type: string, nullable: true, example: "062/614-300" }
 *
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
 *         owner:
 *           $ref: '#/components/schemas/OwnerSummary'
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
  const ownerIdQuery = typeof req.query.userId === 'string' ? req.query.userId.trim() : undefined;

  const filter = isObjectId(ownerIdQuery)
    ? { userId: new Types.ObjectId(ownerIdQuery) }
    : { isVisible: true, $or: [{ visibleUntil: null }, { visibleUntil: { $gte: new Date() } }] };

  const pools = await Pool.find(filter).sort({ createdAt: -1 });
  const ownerIds = [...new Set(pools.map((p) => String(p.userId)))];
  const ownerDocs = await User.find({ _id: { $in: ownerIds } })
    .select('firstName lastName avatarUrl mobileNumber')
    .lean();

  const ownersById = new Map(ownerDocs.map((o) => [String(o._id), o]));

  return res.json({
    pools: pools.map((p) => {
      const owner = ownersById.get(String(p.userId));
      const name =
        [owner?.firstName?.trim(), owner?.lastName?.trim()].filter(Boolean).join(' ') || 'Domaćin';
      const avatarUrl = owner?.avatarUrl || undefined;
      const mobileNumber = owner?.mobileNumber || undefined;

      const po = p.toObject();
      return { ...po, owner: { name, avatarUrl, mobileNumber } };
    })
  });
});

/**
 * @openapi
 * /pool:
 *   get:
 *     tags: [Pools]
 *     summary: Get a single pool (public or owner)
 *     description: |
 *       Returns the pool if:
 *       - it is public (isVisible = true and not expired), **or**
 *       - the authenticated user (Bearer token) is the owner.
 *     security:
 *       - {}
 *       - BearerAuth: []
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
 *       404:
 *         description: Pool not found (not public and not owner)
 */
router.get('/pool', async (req, res) => {
  const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const pool = await Pool.findById(id);
  if (!pool) return res.status(404).json({ message: 'Pool not found' });

  let isOwner = false;
  const token = req.headers.authorization?.replace(/^Bearer\s+/, '');
  if (token) {
    try {
      isOwner = String(verifyAccess(token).sub) === String(pool.userId);
    } catch {}
  }

  if (!isOwner) {
    const isPublic =
      pool.isVisible === true && (!pool.visibleUntil || pool.visibleUntil >= new Date());
    if (!isPublic) return res.status(404).json({ message: 'Pool not found' });
  }

  const u = await User.findById(pool.userId)
    .select('firstName lastName avatarUrl mobileNumber')
    .lean();

  const name = [u?.firstName?.trim(), u?.lastName?.trim()].filter(Boolean).join(' ') || 'Domaćin';

  return res.json({
    pool: {
      ...pool.toObject(),
      owner: {
        name,
        avatarUrl: u?.avatarUrl || undefined,
        mobileNumber: u?.mobileNumber || undefined
      }
    }
  });
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
  const authenticatedUserId = (req as any).userId as string;
  const input = req.body?.pool ?? {};

  const title = String(input.title ?? '').trim();
  const city = String(input.city ?? '').trim();
  const capacity = Number(input.capacity);
  const images: string[] = Array.isArray(input.images)
    ? input.images.filter((u: unknown): u is string => typeof u === 'string' && u.trim() !== '')
    : [];

  const pricePerDay = input.pricePerDay === undefined ? undefined : Number(input.pricePerDay);
  const description = typeof input.description === 'string' ? input.description.trim() : undefined;
  const filters = input?.filters
    ? { heated: !!input.filters.heated, petsAllowed: !!input.filters.petsAllowed }
    : undefined;
  const busyDays: string[] | undefined = Array.isArray(input.busyDays) ? input.busyDays : undefined;

  const isValid =
    title.length >= 3 &&
    title.length <= 40 &&
    city.length > 0 &&
    Number.isInteger(capacity) &&
    capacity >= 1 &&
    capacity <= 100 &&
    images.length >= 1 &&
    images.length <= 7;

  if (!isValid) return res.status(400).json({ message: 'Invalid pool data' });

  const created = await Pool.create({
    userId: new Types.ObjectId(authenticatedUserId),
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
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const isVisible = !!req.body?.isVisible;
  const rawUntil = req.body?.visibleUntil as string | undefined;
  const visibleUntil = rawUntil ? new Date(rawUntil) : null;
  if (rawUntil && Number.isNaN(visibleUntil?.getTime())) {
    return res.status(400).json({ message: 'Invalid visibleUntil' });
  }

  const pool = await Pool.findByIdAndUpdate(
    id,
    { $set: { isVisible, visibleUntil: isVisible ? visibleUntil : null } },
    { new: true }
  );
  if (!pool) return res.status(404).json({ message: 'Pool not found' });

  return res.json({ pool: pool.toObject() });
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
  const { id } = req.params;
  const userId = (req as any).userId as string;

  if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const deleted = await Pool.findOneAndDelete({
    _id: new Types.ObjectId(id),
    userId: new Types.ObjectId(userId)
  });

  if (!deleted) return res.status(404).json({ message: 'Pool not found' });
  return res.sendStatus(204);
});

/**
 * @openapi
 * /pools/{id}:
 *   put:
 *     tags: [Pools]
 *     summary: Update a pool (owner only)
 *     security: [{ BearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CreatePoolRequest' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pool: { $ref: '#/components/schemas/Pool' }
 *       400: { description: Invalid payload }
 *       401: { description: Unauthorized }
 *       404: { description: Pool not found or not owned by user }
 */
router.put('/pools/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  if (!isObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

  const userId = (req as any).userId as string;
  const input = req.body?.pool ?? {};

  const title = String(input.title ?? '').trim();
  const city = String(input.city ?? '').trim();
  const capacity = Number(input.capacity);
  const images: string[] = Array.isArray(input.images) ? input.images : [];
  const pricePerDay = input.pricePerDay === undefined ? undefined : Number(input.pricePerDay);
  const description = typeof input.description === 'string' ? input.description.trim() : undefined;
  const filters =
    input && typeof input.filters === 'object'
      ? { heated: !!input.filters.heated, petsAllowed: !!input.filters.petsAllowed }
      : undefined;
  const busyDays: string[] | undefined = Array.isArray(input.busyDays) ? input.busyDays : undefined;

  const isValid =
    title.length >= 3 &&
    title.length <= 40 &&
    !!city &&
    inRange(capacity, 1, 100) &&
    inRange(images.length, 1, 7) &&
    (pricePerDay === undefined || inRange(pricePerDay, 1, 10000)) &&
    (description === undefined || inRange(description.length, 1, 300));

  if (!isValid) return res.status(400).json({ message: 'Invalid pool data' });

  const $set: any = { title, city, capacity, images, filters };
  const $unset: any = {};

  if (pricePerDay !== undefined) {
    $set.pricePerDay = pricePerDay;
  } else {
    $unset.pricePerDay = '';
  }

  if (description !== undefined) {
    $set.description = description;
  } else {
    $unset.description = '';
  }

  if (Array.isArray(busyDays)) {
    $set.busyDays = busyDays;
  } else {
    $unset.busyDays = '';
  }

  const update: any = { $set };
  if (Object.keys($unset).length > 0) {
    update.$unset = $unset;
  }

  const updated = await Pool.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
    update,
    { new: true }
  );

  if (!updated) return res.status(404).json({ message: 'Pool not found' });
  return res.json({ pool: updated.toObject() });
});

export default router;

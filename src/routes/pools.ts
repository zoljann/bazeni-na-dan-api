import { Router } from 'express';
import { Types } from 'mongoose';
import { Pool } from '../models/pool';
import { adminSecretRequired, authRequired } from '../helpers/authRequired';

const router = Router();
const isObjectId = (v: unknown): v is string => typeof v === 'string' && Types.ObjectId.isValid(v);
const inRange = (n: number, min: number, max: number) => Number.isFinite(n) && n >= min && n <= max;

/**
 * GET /pools?userId=optional
 * - With userId (valid ObjectId): return ALL pools for that owner (ignore visibility)
 * - Without userId: return only visible & not-expired pools
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
 * GET /pool?id=required
 * Public detail → only visible & not-expired.
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
 * POST /pools (create)
 * Auth: Bearer <token>
 * Body: { pool: { title, city, capacity, images, pricePerDay?, description?, filters?, busyDays? } }
 */
router.post('/pools', authRequired, async (req, res) => {
  const authUserId = (req as any).userId as string;
  const bodyPool = req.body?.pool || {};

  const title       = (bodyPool.title ?? '').trim();
  const city        = (bodyPool.city ?? '').trim();
  const capacity    = Number(bodyPool.capacity);
  const images: string[] = Array.isArray(bodyPool.images) ? bodyPool.images : [];
  const pricePerDay = bodyPool.pricePerDay === undefined ? undefined : Number(bodyPool.pricePerDay);
  const description = typeof bodyPool.description === 'string' ? bodyPool.description.trim() : undefined;
  const filters = bodyPool.filters && typeof bodyPool.filters === 'object'
    ? { heated: !!bodyPool.filters.heated, petsAllowed: !!bodyPool.filters.petsAllowed }
    : undefined;
  const busyDays: string[] | undefined = Array.isArray(bodyPool.busyDays) ? bodyPool.busyDays : undefined;

  const titleOk   = title.length >= 3 && title.length <= 40;
  const cityOk    = !!city;
  const capOk     = inRange(capacity, 1, 100);
  const imagesOk  = inRange(images.length, 1, 7);
  const priceOk   = pricePerDay === undefined || inRange(pricePerDay, 1, 10000);
  const descOk    = description === undefined || inRange(description.length, 1, 300);

  if (!titleOk || !cityOk || !capOk || !imagesOk || !priceOk || !descOk) {
    return res.status(400).json({ message: 'Invalid pool data' });
  }

  const created = await Pool.create({
    userId: new Types.ObjectId(authUserId),
    title, city, capacity, images, pricePerDay, description, filters, busyDays
    // visibility defaults: isVisible: false, visibleUntil: null
  });

  return res.status(201).json({ pool: created.toObject() });
});

/**
 * PUT /pools/:id/visibility
 * Body: { isVisible: boolean, visibleUntil?: string(ISO) }
 * NOTE: protect it at least with auth; if you manage this only in DB/Compass, you can remove this route entirely.
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
 * DELETE /pools/:id  (owner-only)
 * Auth: Bearer <token>
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

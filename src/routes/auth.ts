import { Router } from 'express';
import { User } from '../models/user';
import { hashPassword, verifyPassword, signAccess } from '../config/auth';
import { authRequired } from '../helpers/authRequired';

const router = Router();

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 25;
const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isDigits = (value: string): boolean =>
  /^\d{9,15}$/.test(value);

/**
 * POST /auth/register
 * Body: { firstName, lastName, email, mobileNumber, password }
 * Returns: { user }
 */
router.post('/auth/register', async (req, res) => {
  const firstName = (req.body?.firstName ?? '').trim();
  const lastName = (req.body?.lastName ?? '').trim();
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const mobileNumber = (req.body?.mobileNumber ?? '').trim();
  const password = req.body?.password ?? '';

  const passLenOk = password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;

  if (!firstName || !lastName || !isEmail(email) || !isDigits(mobileNumber) || !passLenOk) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'Email already used' });
  }

  const passwordHash = await hashPassword(password);

  try {
    const createdUser = await User.create({
      firstName,
      lastName,
      email,
      mobileNumber,
      passwordHash
    });
    // schema transform maps to { id, ... } and strips passwordHash
    return res.status(201).json({ user: createdUser.toObject() });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Email already used' });
    throw error;
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns: { user, accessToken }
 */
router.post('/auth/login', async (req, res) => {
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const password = req.body?.password ?? '';

  const passLenOk = password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
  if (!isEmail(email) || !passLenOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const accessToken = signAccess(user.id);
  return res.json({ user: user.toObject(), accessToken });
});

/**
 * PUT /user (self-update)
 * Auth: Bearer <accessToken>
 * Body: { firstName, lastName, email, mobileNumber, avatarUrl?, passwordChange? }
 * Returns: { user }
 */
router.put('/user', authRequired, async (req, res) => {
  const userId = (req as any).userId as string;

  const firstName = (req.body?.firstName ?? '').trim();
  const lastName = (req.body?.lastName ?? '').trim();
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const mobileNumber = (req.body?.mobileNumber ?? '').trim();
  const avatarUrl = typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl.trim() : undefined;
  const passwordChange = req.body?.passwordChange as
    | { currentPassword?: string; newPassword?: string }
    | undefined;

  if (!firstName || !lastName || !isEmail(email) || !isDigits(mobileNumber)) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already used' });
  }

  if (passwordChange) {
    const currentPassword = passwordChange.currentPassword ?? '';
    const newPassword = passwordChange.newPassword ?? '';
    const newLenOk = newPassword.length >= PASSWORD_MIN && newPassword.length <= PASSWORD_MAX;

    if (!currentPassword || !newPassword || !newLenOk) {
      return res.status(400).json({ message: 'Invalid password change' });
    }

    const currentOk = await verifyPassword(currentPassword, user.passwordHash);
    if (!currentOk) return res.status(401).json({ message: 'Current password incorrect' });

    user.passwordHash = await hashPassword(newPassword);
  }

  user.firstName = firstName;
  user.lastName = lastName;
  user.email = email;
  user.mobileNumber = mobileNumber;
  if (avatarUrl) user.avatarUrl = avatarUrl;

  try {
    await user.save();
    return res.json({ user: user.toObject() });
  } catch (error: any) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Email already used' });
    throw error;
  }
});

export default router;

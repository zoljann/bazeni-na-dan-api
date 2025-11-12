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
const toClientUser = (userDoc: any) => {
  const src = userDoc?.toObject ? userDoc.toObject() : userDoc;
  const { _id, passwordHash, __v, ...rest } = src || {};
  return { id: String(_id ?? rest?.id), ...rest };
};

/**
 * POST /auth/register
 * Body: { firstName, lastName, email, mobileNumber, password }
 * Returns: { user }
 */
router.post('/auth/register', async (req, res) => {
  const rawFirstName = (req.body?.firstName ?? '').trim();
  const rawLastName = (req.body?.lastName ?? '').trim();
  const rawEmail = (req.body?.email ?? '').trim().toLowerCase();
  const rawMobileNumber = (req.body?.mobileNumber ?? '').trim();
  const rawPassword = req.body?.password ?? '';

  const passwordLengthOk =
    rawPassword.length >= PASSWORD_MIN && rawPassword.length <= PASSWORD_MAX;

  if (
    !rawFirstName ||
    !rawLastName ||
    !isEmail(rawEmail) ||
    !isDigits(rawMobileNumber) ||
    !passwordLengthOk
  ) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  if (await User.findOne({ email: rawEmail })) {
    return res.status(409).json({ message: 'Email already used' });
  }

  const passwordHash = await hashPassword(rawPassword);

  try {
    const createdUser = await User.create({
      firstName: rawFirstName,
      lastName: rawLastName,
      email: rawEmail,
      mobileNumber: rawMobileNumber,
      passwordHash
    });
    return res.status(201).json({ user: toClientUser(createdUser) });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Email already used' });
    }
    throw error;
  }
});

/**
 * POST /auth/login
 * Body: { email, password }
 * Returns: { user, accessToken }
 */
router.post('/auth/login', async (req, res) => {
  const rawEmail = (req.body?.email ?? '').trim().toLowerCase();
  const rawPassword = req.body?.password ?? '';

  const passwordLengthOk =
    rawPassword.length >= PASSWORD_MIN && rawPassword.length <= PASSWORD_MAX;

  if (!isEmail(rawEmail) || !passwordLengthOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = await User.findOne({ email: rawEmail });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const passwordOk = await verifyPassword(rawPassword, user.passwordHash);
  if (!passwordOk) return res.status(401).json({ message: 'Invalid credentials' });

  const accessToken = signAccess(user.id);
  return res.json({ user: toClientUser(user), accessToken });
});

/**
 * PUT /user  (self-update)
 * Auth: Bearer <accessToken>
 * Body: {
 *  firstName, lastName, email, mobileNumber, avatarUrl?,
 *  passwordChange?: { currentPassword, newPassword }
 * }
 * Returns: { user }
 */
router.put('/user', authRequired, async (req, res) => {
  const userId = (req as any).userId as string;

  const firstName = (req.body?.firstName ?? '').trim();
  const lastName = (req.body?.lastName ?? '').trim();
  const email = (req.body?.email ?? '').trim().toLowerCase();
  const mobileNumber = (req.body?.mobileNumber ?? '').trim();
  const avatarUrl =
    typeof req.body?.avatarUrl === 'string' ? req.body.avatarUrl.trim() : undefined;
  const passwordChange = req.body?.passwordChange as
    | { currentPassword?: string; newPassword?: string }
    | undefined;

  if (!firstName || !lastName || !isEmail(email) || !isDigits(mobileNumber)) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  // If email changed, ensure uniqueness
  if (email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already used' });
  }

  // Optional password change
  if (passwordChange) {
    const currentPassword = passwordChange.currentPassword ?? '';
    const newPassword = passwordChange.newPassword ?? '';
    const newPassLenOk =
      newPassword.length >= PASSWORD_MIN && newPassword.length <= PASSWORD_MAX;

    if (!currentPassword || !newPassword || !newPassLenOk) {
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
    return res.json({ user: toClientUser(user) });
  } catch (error: any) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Email already used' });
    }
    throw error;
  }
});

export default router;

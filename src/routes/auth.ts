import { Router } from 'express';
import { randomBytes } from 'crypto';
import { User } from '../models/user';
import { hashPassword, verifyPassword, signAccess } from '../config/auth';
import { adminSecretRequired, authRequired } from '../helpers/authRequired';
import { Pool } from '../models/pool';
import { sendPasswordResetEmail } from '../config/email';

const router = Router();

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 25;
const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isDigits = (v: string): boolean => /^\d{9,15}$/.test(v);

/**
 * @openapi
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       required: [id, firstName, lastName, email, mobileNumber]
 *       properties:
 *         id: { type: string, example: "665c1a2f7a2f0a3f9b6d1a10" }
 *         firstName: { type: string, example: "Nedim" }
 *         lastName: { type: string, example: "Zolj" }
 *         email: { type: string, format: email, example: "nedim@example.com" }
 *         mobileNumber: { type: string, example: "061234567" }
 *         avatarUrl: { type: string, nullable: true, example: "https://example.com/a.jpg" }
 *         publishedPoolsCount:
 *           type: integer
 *           description: "Broj objavljenih bazena za korisnika"
 *           example: 3
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     RegisterRequest:
 *       type: object
 *       required: [firstName, lastName, email, mobileNumber, password]
 *       properties:
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         email: { type: string, format: email }
 *         mobileNumber: { type: string, description: "digits only, 9..15" }
 *         password: { type: string, minLength: 6, maxLength: 25 }
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email }
 *         password: { type: string, minLength: 6, maxLength: 25 }
 *     ForgotPasswordRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email: { type: string, format: email }
 *     ResetPasswordRequest:
 *       type: object
 *       required: [token, newPassword]
 *       properties:
 *         token: { type: string, description: "Reset token poslan mailom" }
 *         newPassword: { type: string, minLength: 6, maxLength: 25 }
 *     PasswordChange:
 *       type: object
 *       required: [currentPassword, newPassword]
 *       properties:
 *         currentPassword: { type: string }
 *         newPassword: { type: string, minLength: 6, maxLength: 25 }
 *     UpdateUserRequest:
 *       type: object
 *       required: [firstName, lastName, email, mobileNumber]
 *       properties:
 *         firstName: { type: string }
 *         lastName: { type: string }
 *         email: { type: string, format: email }
 *         mobileNumber: { type: string }
 *         avatarUrl: { type: string, nullable: true }
 *         passwordChange:
 *           $ref: '#/components/schemas/PasswordChange'
 *     AuthSuccess:
 *       type: object
 *       properties:
 *         user:
 *           $ref: '#/components/schemas/User'
 *         accessToken:
 *           type: string
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message: { type: string }
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *       400:
 *         description: Invalid data
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email already used
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/auth/register', async (req, res) => {
  const firstName = String(req.body?.firstName ?? '').trim();
  const lastName = String(req.body?.lastName ?? '').trim();
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const mobileNumber = String(req.body?.mobileNumber ?? '').trim();
  const password = String(req.body?.password ?? '');

  const passOk = password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
  if (!firstName || !lastName || !isEmail(email) || !isDigits(mobileNumber) || !passOk) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  if (await User.findOne({ email })) {
    return res.status(409).json({ message: 'Email' });
  }

  const passwordHash = await hashPassword(password);

  try {
    const created = await User.create({ firstName, lastName, email, mobileNumber, passwordHash });
    const accessToken = signAccess(created.id);

    const userObj = created.toObject();
    const publishedPoolsCount = await Pool.countDocuments({ userId: created._id });
    (userObj as any).publishedPoolsCount = publishedPoolsCount;

    return res.status(201).json({
      user: userObj,
      accessToken
    });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Email already used' });
    throw e;
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginRequest' }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const password = String(req.body?.password ?? '');
  const passOk = password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;

  if (!isEmail(email) || !passOk) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const accessToken = signAccess(user.id);

  const userObj = user.toObject();
  const publishedPoolsCount = await Pool.countDocuments({ userId: user._id });
  (userObj as any).publishedPoolsCount = publishedPoolsCount;

  return res.json({ user: userObj, accessToken });
});

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset link
 *     description: |
 *       Ako nalog postoji za dati email, generiše se token za reset lozinke i šalje se email.
 *       Odgovor je uvijek 200 za validan email format (bez otkrivanja da li nalog postoji).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ForgotPasswordRequest' }
 *     responses:
 *       200:
 *         description: Reset request accepted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "OK" }
 *       400:
 *         description: Invalid email format
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/auth/forgot-password', async (req, res) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();

  if (!isEmail(email)) {
    return res.status(400).json({ message: 'Invalid email' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ message: 'OK' });
  }

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 2);

  (user as any).resetPasswordToken = token;
  (user as any).resetPasswordExpires = expires;
  await user.save();

  res.json({ message: 'OK' });

  void sendPasswordResetEmail(user.email, token).catch((e) => {
    console.error('Failed to send reset password email', e);
  });
});

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password using token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ResetPasswordRequest' }
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: "Password updated" }
 *       400:
 *         description: Invalid data or invalid/expired token
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/auth/reset-password', async (req, res) => {
  const token = String(req.body?.token ?? '').trim();
  const newPassword = String(req.body?.password ?? '');

  const newLenOk = newPassword.length >= PASSWORD_MIN && newPassword.length <= PASSWORD_MAX;
  if (!token || !newLenOk) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  const now = new Date();
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: now }
  } as any);

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }

  user.passwordHash = await hashPassword(newPassword);
  (user as any).resetPasswordToken = undefined;
  (user as any).resetPasswordExpires = undefined;
  await user.save();

  return res.json({ message: 'Password updated' });
});

/**
 * @openapi
 * /user:
 *   put:
 *     tags: [Auth]
 *     summary: Update current user (self)
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/UpdateUserRequest' }
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid data / Invalid password change
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized / Current password incorrect
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       409:
 *         description: Email already used
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/user', authRequired, async (req, res) => {
  const userId = (req as any).userId as string;

  const firstName = String(req.body?.firstName ?? '').trim();
  const lastName = String(req.body?.lastName ?? '').trim();
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  const mobileNumber = String(req.body?.mobileNumber ?? '').trim();
  const avatarUrl =
    typeof req.body?.avatarUrl === 'string'
      ? req.body?.avatarUrl.trim()
      : req.body?.avatarUrl === null
        ? null
        : undefined;
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
    if (exists) return res.status(409).json({ message: 'Email' });
  }

  if (passwordChange) {
    const currentPassword = String(passwordChange.currentPassword ?? '');
    const newPassword = String(passwordChange.newPassword ?? '');
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
  if (avatarUrl !== undefined) {
    user.avatarUrl = avatarUrl || undefined;
  }

  try {
    await user.save();
    return res.json({ user: user.toObject() });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Email' });
    throw e;
  }
});

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Auth]
 *     summary: List all users (admin)
 *     description: |
 *       Returns **all** users from database, bez filtera.
 *       Za pristup je potreban `x-admin-secret` header.
 *     security: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       401:
 *         description: Admin secret missing or invalid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/admin/users', adminSecretRequired, async (_req, res) => {
  const users = await User.find({}).sort({ createdAt: -1 });

  return res.json({
    users: users.map((u) => u.toObject())
  });
});

export default router;

import { Router } from 'express';
import { User } from '../models/user';
import { hashPassword, verifyPassword, signAccess } from '../config/auth';
import { authRequired } from '../helpers/authRequired';

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
 *           schema: { $ref: '#/components/schemas/RegisterRequest' }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
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
    return res.status(409).json({ message: 'Email already used' });
  }

  const passwordHash = await hashPassword(password);

  try {
    const created = await User.create({ firstName, lastName, email, mobileNumber, passwordHash });
    return res.status(201).json({ user: created.toObject() });
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
  return res.json({ user: user.toObject(), accessToken });
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
  if (avatarUrl) user.avatarUrl = avatarUrl;

  try {
    await user.save();
    return res.json({ user: user.toObject() });
  } catch (e: any) {
    if (e?.code === 11000) return res.status(409).json({ message: 'Email already used' });
    throw e;
  }
});

export default router;

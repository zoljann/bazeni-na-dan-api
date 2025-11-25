import { Router } from 'express';
import { imagekit } from '../config/imagekit';
import { authRequired } from '../helpers/authRequired';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     SingleUploadRequest:
 *       type: object
 *       required: [file]
 *       properties:
 *         file:
 *           type: string
 *           description: Base64 string or data URL of the image
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
 *         folder:
 *           type: string
 *           description: Optional folder in ImageKit
 *           example: "/avatars"
 *     MultipleUploadRequest:
 *       type: object
 *       required: [files]
 *       properties:
 *         files:
 *           type: array
 *           items:
 *             type: string
 *             description: Base64 string or data URL of the image
 *         folder:
 *           type: string
 *           description: Optional folder in ImageKit
 *           example: "/pools"
 *     UploadSuccess:
 *       type: object
 *       properties:
 *         url:
 *           type: string
 *           example: "https://ik.imagekit.io/5ufwgpl3j/avatars/avatar_123.jpg"
 *     UploadMultipleSuccess:
 *       type: object
 *       properties:
 *         urls:
 *           type: array
 *           items:
 *             type: string
 *             example: "https://ik.imagekit.io/5ufwgpl3j/pools/pool_1.jpg"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 */

/**
 * @openapi
 * /upload/image:
 *   post:
 *     tags: [Upload]
 *     summary: Upload a single image
 *     description: Upload a single image to ImageKit and return the public URL.
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SingleUploadRequest'
 *     responses:
 *       200:
 *         description: Uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadSuccess'
 *       400:
 *         description: Invalid payload or upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload/image', authRequired, async (req, res) => {
  const file = typeof req.body?.file === 'string' ? req.body.file : '';
  const folder = typeof req.body?.folder === 'string' ? req.body.folder : undefined;

  if (!file) {
    return res.status(400).json({ message: 'File is required' });
  }

  try {
    const uploadResult = await imagekit.upload({
      file,
      fileName: `img_${Date.now()}.jpg`,
      folder
    });

    return res.json({ url: uploadResult.url });
  } catch (e) {
    console.error('ImageKit upload error', e);
    return res.status(400).json({ message: 'Upload failed' });
  }
});

/**
 * @openapi
 * /upload/images:
 *   post:
 *     tags: [Upload]
 *     summary: Upload multiple images
 *     description: Upload multiple images to ImageKit and return public URLs.
 *     security: [{ BearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MultipleUploadRequest'
 *     responses:
 *       200:
 *         description: Uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UploadMultipleSuccess'
 *       400:
 *         description: Invalid payload or upload failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/upload/images', authRequired, async (req, res) => {
  const files = Array.isArray(req.body?.files) ? req.body.files : [];
  const folder = typeof req.body?.folder === 'string' ? req.body.folder : undefined;

  if (!files.length) {
    return res.status(400).json({ message: 'Files are required' });
  }

  try {
    const uploads = await Promise.all(
      files.map((file: unknown, index: number) => {
        if (typeof file !== 'string' || !file) {
          throw new Error(`Invalid file at index ${index}`);
        }

        return imagekit.upload({
          file,
          fileName: `img_${Date.now()}_${index}.jpg`,
          folder
        });
      })
    );

    return res.json({ urls: uploads.map((u) => u.url) });
  } catch (e) {
    console.error('ImageKit multiple upload error', e);
    return res.status(400).json({ message: 'Upload failed' });
  }
});

export default router;

import { Router } from 'express';
import health from './health';
import pools from './pools';
import auth from './auth';
import upload from './upload';

const router = Router();

router.use(health);
router.use(auth);
router.use(pools);
router.use(upload);

export default router;

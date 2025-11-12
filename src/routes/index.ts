import { Router } from 'express';
import health from './health';
import pools from './pools';
import auth from './auth';

const router = Router();

router.use(health);
router.use(auth);
router.use(pools);

export default router;

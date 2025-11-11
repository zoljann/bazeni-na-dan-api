import { Router } from 'express';
import health from './health';
import pools from './pools';

const router = Router();

router.use(health);
router.use(pools);

export default router;

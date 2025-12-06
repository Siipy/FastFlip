import { Router } from 'express';

import { analyseProductHandler } from '../controllers/productsController';

export const productsRouter = Router();

productsRouter.post('/analyse', analyseProductHandler);

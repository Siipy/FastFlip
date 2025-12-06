import { Request, Response } from 'express';
import { z } from 'zod';

import { analyseProduct } from '../services/productService';

const analyseSchema = z.object({
  sourceUrl: z.string().url(),
  buyPrice: z.number().nonnegative(),
  currency: z.string().length(3),
  keywordOverride: z.string().optional(),
});

export async function analyseProductHandler(req: Request, res: Response) {
  const parseResult = analyseSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parseResult.error.flatten() });
  }

  try {
    const analysis = await analyseProduct(parseResult.data);
    return res.status(201).json(analysis);
  } catch (error) {
    console.error('Failed to analyse product', error);
    return res.status(500).json({ error: 'Failed to analyse product' });
  }
}

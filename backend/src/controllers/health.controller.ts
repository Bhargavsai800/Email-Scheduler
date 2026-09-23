import { Request, Response, NextFunction } from 'express';
import { getSystemHealth } from '../services/health.service';

export async function getHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const health = await getSystemHealth();
    // Return HTTP 200 with the health status payload
    res.status(200).json(health);
  } catch (error) {
    next(error);
  }
}

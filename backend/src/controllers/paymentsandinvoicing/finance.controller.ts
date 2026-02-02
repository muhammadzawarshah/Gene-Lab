// src/controllers/finance.controller.ts
import { Request, Response, NextFunction } from 'express';
import { FinanceService } from '../../services/finance.service.js';

export const postInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await FinanceService.createInvoice(Number(req.params.deliveryId));
    res.status(201).json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

export const postPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await FinanceService.processPayment(req.body);
    res.status(201).json({ success: true, data: payment });
  } catch (err) { next(err); }
};
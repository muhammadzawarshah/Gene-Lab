// src/controllers/report.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../../services/report.service.js';

export const getInventoryDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await ReportService.getStockSummary();
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};

export const getFinancialReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { start, end } = req.query;
    const data = await ReportService.getSalesReport(new Date(start as string), new Date(end as string));
    res.status(200).json({ success: true, data });
  } catch (err) { next(err); }
};
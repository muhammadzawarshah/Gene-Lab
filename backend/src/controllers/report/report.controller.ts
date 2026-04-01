// src/controllers/report.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../../services/report.service.js';

export class ReportController {
  static async getInventoryDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stockSummary = await ReportService.getStockSummary();
      res.status(200).json({ success: true, timestamp: new Date(), data: stockSummary });
    } catch (error) {
      next(error);
    }
  }

  static async getFinancialReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ success: false, message: "Please provide start and end dates." });
      }
      const salesData = await ReportService.getSalesReport(new Date(start as string), new Date(end as string));
      res.status(200).json({ success: true, period: { start, end }, count: salesData.length, data: salesData });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ReportService.getDashboardStats();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

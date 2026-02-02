
// src/controllers/report.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../../services/report.service.js';

export class ReportController {
  /**
   * Dashboard ke liye Inventory Summary (Real-time availability)
   */
  static async getInventoryDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const stockSummary = await ReportService.getStockSummary();
      
      res.status(200).json({
        success: true,
        timestamp: new Date(),
        data: stockSummary
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Finance team ke liye Sales Performance Report
   */
  static async getFinancialReport(req: Request, res: Response, next: NextFunction) {
    try {
      // Query parameters se date range uthana (e.g. ?start=2024-01-01&end=2024-12-31)
      const { start, end } = req.query;

      if (!start || !end) {
        return res.status(400).json({
          success: false,
          message: "Please provide start and end dates for the report."
        });
      }

      const salesData = await ReportService.getSalesReport(
        new Date(start as string),
        new Date(end as string)
      );

      res.status(200).json({
        success: true,
        period: { start, end },
        count: salesData.length,
        data: salesData
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Daily Movement Log (Audit ke liye)
   */
  static async getMovementLogs(req: Request, res: Response, next: NextFunction) {
    try {
      // Logic for fetching latest stock movements
      // In production: isme pagination (limit/offset) lazmi hona chahiye
      res.status(501).json({ message: "Stock movement log reporting coming soon." });
    } catch (error) {
      next(error);
    }
  }
}
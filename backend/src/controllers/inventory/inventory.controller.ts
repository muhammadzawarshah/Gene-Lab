import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../../services/inventory.service.js';

export class InventoryController {
  static async getLedger(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await InventoryService.getStockLedger();
      // Seedhi array bhejo kyunki frontend 'res.data' (axios) se uthata hai
      res.status(200).json(data);
    } catch (error) {
      console.error("Ledger Error:", error);
      res.status(500).json({ success: false, message: "Handshake Failed" });
    }
  }

  static async deleteEntry(req: Request, res: Response) {
    // Audit trails delete nahi hoti normally, par UI button ke liye:
    res.status(200).json({ success: true, message: "Entry Purged from UI" });
  }
}
import { Request, Response } from 'express';
import { PartyService } from '../../services/party.service.js';

export class PartyController {
  static async addParty(req: Request, res: Response) {
    try {
      const party = await PartyService.createParty(req.body);
      res.status(201).json({ success: true, data: party });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async listCustomers(req: Request, res: Response) {
    try {
      const customers = await PartyService.getPartiesByType('CUSTOMER');
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async listSuppliers(req: Request, res: Response) {
    try {
      const suppliers = await PartyService.getPartiesByType('SUPPLIER');
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
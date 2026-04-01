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

  static async listCustomers(_req: Request, res: Response) {
    try {
      const customers = await PartyService.getPartiesByType('CUSTOMER');
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async listSuppliers(_req: Request, res: Response) {
    try {
      const suppliers = await PartyService.getPartiesByType('SUPPLIER');
      res.json(suppliers);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async updateParty(req: Request, res: Response) {
    try {
      const id = req.params['id'] as string;
      const party = await PartyService.updateParty(id, req.body);
      res.json({ success: true, data: party });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async deleteParty(req: Request, res: Response) {
    try {
      await PartyService.deleteParty(req.params['id'] as string);
      res.json({ success: true, message: 'Distributor deleted.' });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}
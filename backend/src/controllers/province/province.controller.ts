import { Request, Response } from 'express';
import { ProvinceService } from '../../services/province.service.js';

export const addProvince = async (req: Request, res: Response) => {
  try {
    const { id, name } = req.body;
    const result = await ProvinceService.createProvince({ id, name });
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getProvinces = async (_req: Request, res: Response) => {
  try {
    const result = await ProvinceService.listProvinces();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
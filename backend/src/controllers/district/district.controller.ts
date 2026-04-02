import { Request, Response } from 'express';
import { DistrictService } from '../../services/district.service.js';

export const getDistrictsByProvince = async (req: Request, res: Response) => {
  try {
    const provinceId = parseInt(req.query.provinceId as string);
    if (isNaN(provinceId)) {
      res.status(400).json({ success: false, message: 'provinceId is required and must be a number' });
      return;
    }
    const data = await DistrictService.getByProvince(provinceId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllDistricts = async (_req: Request, res: Response) => {
  try {
    const data = await DistrictService.listAll();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

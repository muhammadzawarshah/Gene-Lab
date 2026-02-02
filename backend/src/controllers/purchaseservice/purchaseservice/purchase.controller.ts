// src/controllers/purchase.controller.ts
import { Request, Response, NextFunction } from 'express';
import { GrnService } from '../../../services/grn.service.js';
import { PurchaseService } from '../../../services/purchase.service.js';
import mqEmitter from '../../../utils/eventEmitter.js';

export const receiveGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { poId, warehouseId, items } = req.body;
    const grn = await GrnService.processGRN(poId, warehouseId, items);
    
    // Emit Event for MQ
    mqEmitter.emit('GRN_COMPLETED', { grnId: grn.grn_id, timestamp: new Date() });

    res.status(201).json({ success: true, data: grn });
  } catch (error) {
    console.log(error)
    next(error);
  }
};

export const listPurchase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    
    const po = await PurchaseService.purchaselist();

    if(!po){
      res.status(400).send("no po found")
    }
    res.status(201).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
};


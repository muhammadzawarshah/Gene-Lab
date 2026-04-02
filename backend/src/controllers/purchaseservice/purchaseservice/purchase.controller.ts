// src/controllers/purchase.controller.ts
import { Request, Response, NextFunction } from 'express';
import { GrnService } from '../../../services/grn.service.js';
import { PurchaseService } from '../../../services/purchase.service.js';
import mqEmitter from '../../../utils/eventEmitter.js';

export const receiveGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { poId, warehouseId, items ,discount ,transportCharges , netTotal  } = req.body;
    const grn = await GrnService.processGRN(poId, warehouseId, items,discount ,transportCharges , netTotal );
    
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
}

export const purchaseorderlistonpoid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id= req.params.poId
    const po = await PurchaseService.purchaseonpoid(id as any);

    if(!po){
      res.status(400).send("no po found")
    }
    res.status(201).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
}

export const updatepurchasepo = async (req:Request,res:Response , next: NextFunction)=>{
  try {
    const id= req.params.id;
    const data = req.body;
    console.log(req.params);
    console.log(req.body);
    const po = await PurchaseService.updatePO(id as any,data);

    if(!po){
      res.status(400).send("no po found")
    }
    res.status(201).json({ success: true, data: po });
  } catch (error) {
    next(error);
  }
}

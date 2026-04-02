// src/controllers/purchaseservice/RecievedGoods/receiveGoods.controller.ts
import { Request, Response, NextFunction } from 'express';
import { GrnService } from '../../../services/grn.service.js';
import mqEmitter from '../../../utils/eventEmitter.js';

export const receiveGoods = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(req.body)
    const { poId, warehouseId, items , discount ,transportCharges , netTotal  } = req.body;

    // 1. Basic Validation
    if (!poId || !warehouseId || !items || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "PO ID, Warehouse ID, and Items list are required." 
      });
    }

    // 2. Call Service to handle GRN, Batch creation, and Inventory update
    const grn = await GrnService.processGRN(poId, warehouseId, items ,discount ,transportCharges , netTotal );

    // 3. Emit Event for MQ (Asynchronous Reporting update)
    mqEmitter.emit('GRN_COMPLETED', { 
      grnId: grn.grn_id, 
      timestamp: new Date() 
    });

    // 4. Send Success Response
    res.status(201).json({
      success: true,
      message: "Goods Received Note (GRN) created successfully. Inventory updated.",
      data: grn
    });

  } catch (error: any) {
    console.log(error)
    // Transaction fail hone par error yahan aayega
    next(error); 
  }};

export const listgrn = async (req:Request,res:Response,next:NextFunction)=>{
  try {
    const grn = await GrnService.listgrn();
    res.status(200).send(grn);
  } catch (error) {
    next(error)
  }


};

export const getSingleGRN = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // Yahan 'id' string format mein milegi (e.g., "123" or "GRN-123")

    // Direct 'id' pass karein, Service khud handle kar legi
    const grn = await GrnService.getGRNById(id as any);

    if (!grn) {
      return res.status(404).json({ 
        success: false,
        message: "GRN not found!" 
      });
    }

    res.status(200).json({
      success: true,
      data: grn
    });
  } catch (error) {
    next(error);
  }
};
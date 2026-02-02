// src/controllers/delivery.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from '../../services/delivery.service.js';

export const postDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { soId } = req.params;
    const { warehouseId } = req.body;

    // Validation: Check if IDs are provided
    if (!soId || !warehouseId) {
      return res.status(400).json({ 
        success: false, 
        message: "Sales Order ID and Warehouse ID are required." 
      });
    }

    // Service Call: Logic handles stock decrement and movement records
    const deliveryNote = await DeliveryService.shipOrder(Number(soId), Number(warehouseId));

    res.status(201).json({
      success: true,
      message: "Delivery processed successfully and stock updated.",
      data: deliveryNote
    });
  } catch (error: any) {
    // Error handling (Insufficient stock or database issues)
    next(error); 
  }
};

export const listDelivery = async(req: Request, res: Response, next: NextFunction)=>{
  try {
    const disl=await DeliveryService.deliverylist();

    res.status(200).json({data:disl})
  } catch (error) {
    console.log(error)
    next(error);
  }
}

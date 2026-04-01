// src/controllers/delivery.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DeliveryService } from '../../services/delivery.service.js';

export const postDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { soId } = req.params;
    // Request body se correct casing ke saath data nikaalein
    const { warehouse_id, discount, transportCharges, totalAmount, products } = req.body;
    console.log(req.body);
    // Validation
    if (!soId || !warehouse_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Sales Order ID and Warehouse ID are required." 
      });
    }

    // Service Call (products array pass kar rahe hain)
    const deliveryNote = await DeliveryService.shipOrder(
      Number(soId), 
      Number(warehouse_id), 
      discount, 
      transportCharges, 
      totalAmount, 
      products
    );

    res.status(201).json({
      success: true,
      message: "Delivery processed successfully and stock updated.",
      data: deliveryNote
    });
  } catch (error: any) {
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

// src/controllers/delivery.controller.ts

export const updateDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Frontend se data destructure karein
    const { delv_note_id, lines, status, remarks } = req.body;

    // Validation check (optional but recommended)
    if (!delv_note_id || !lines) {
       return res.status(400).json({ message: "Delivery Note ID and Lines are required" });
    }

    // Service ko data pass karein
    const disl = await DeliveryService.updateDelivery(
      Number(delv_note_id), 
      lines, 
      remarks
    );

    // Success response
    res.status(200).json({
      success: true,
      message: "Delivery updated and synchronized successfully",
      data: disl
    });

  } catch (error) {
    console.error("Error in updateDelivery Controller:", error);
    next(error);
  }
}

export const getspecificDelivery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Frontend se data destructure karein
    const { id } = req.params;
    console.log(req.params);
    // Service ko data pass karein
    const disl = await DeliveryService.getDeliveryDetails(id as any);
    console.log(disl)
    // Success response
    res.status(200).json({
      success: true,
      message: "Delivery updated and synchronized successfully",
      data: disl
    });

  } catch (error) {
    console.error("Error in updateDelivery Controller:", error);
    next(error);
  }
}





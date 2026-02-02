// src/controllers/sales.controller.ts
import { Request, Response, NextFunction } from 'express';
import { SalesService } from '../../services/sales.service.js';

export const createSalesOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await SalesService.createOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const createCusOrder = async (req:Request,res:Response ,next: NextFunction)=>{
  try {
    const order = await SalesService.createCusOrder(req.body);
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
}

export const listsales=async  (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await SalesService.listorder();
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const listcustsales=async  (req: Request, res: Response, next: NextFunction) => {
  try {
    const id =req.params.id;
    const order = await SalesService.listcustorder(String(id));
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const stats = await SalesService.getDashboardOverview(id);
    res.status(200).json(stats);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getFinancialLedger = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const ledger = await SalesService.getFinancialLedger(id);
    return res.status(200).json(ledger);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getBillingSyncStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // [cite: 33, 87]

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "Secure Node ID (User ID) is required." 
      });
    }

    // Service call to fetch deliveries and invoices [cite: 326, 369]
    const data = await SalesService.getBillingSyncStatus(String(id));

    return res.status(200).json({
      success: true,
      ...data
    });

  } catch (error: any) {
    console.error("Billing Sync Controller Error:", error);
    
    if (error.message === "PARTY_NOT_FOUND") {
      return res.status(404).json({ message: "Identity verification failed for this node." });
    }

    return res.status(500).json({ 
      success: false,
      message: "Internal Encryption Error", 
      error: error.message 
    });
  }
};


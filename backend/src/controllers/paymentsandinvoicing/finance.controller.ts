// src/controllers/finance.controller.ts
import { Request, Response, NextFunction } from 'express';
import { FinanceService } from '../../services/finance.service.js';

export const postInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log(req.params)
    const invoice = await FinanceService.createInvoice(req.params.deliveryId as any);
    res.status(201).json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

export const postPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payment = await FinanceService.processPayment(req.body);
    res.status(201).json({ success: true, data: payment });
  } catch (err) { next(err); }
};

export const grnInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await FinanceService.createInvoiceFromGRN(Number(req.params.id));
    res.status(201).json({ success: true, data: invoice });
  } catch (err) { next(err); }
};

export const getinvoice = async (req:Request,res:Response,next:NextFunction)=>{
  try {
    const invoice = await FinanceService.getinvoice();
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const getspecificinvoice = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoice = await FinanceService.specificinvoice(Number(req.params.id));
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const getpayments = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoice = await FinanceService.payments();
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const getpurchaseinvoices = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoice = await FinanceService.purchaseInvoiceList();
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const createpurchasepayment = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoice = await FinanceService.processPurchasePayment(req.body);
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const specificpurchaseinvoice = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoice = await FinanceService.specificPurchaseInvoice(Number(req.params));
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}


export const specificcustomerinvoice = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    console.log(req.params);
    const invoice = await FinanceService.custinvoice(Number(req.params.id));
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const specificcustomerpayment = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    console.log(req.params);
    const invoice = await FinanceService.custpayment(Number(req.params.id));
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}


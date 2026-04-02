// src/controllers/finance.controller.ts
import { Request, Response, NextFunction } from 'express';
import { FinanceService } from '../../services/finance.service.js';

export const postInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deliveryId = req.params['deliveryId'] as string;
    const { narration, userId } = req.body;
    const invoice = await FinanceService.createInvoice(deliveryId, narration, userId);
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
    const { id } = req.params;
    const { narration, userId } = req.body;
    const invoice = await FinanceService.createInvoiceFromGRN(Number(id), narration, userId);
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
    const invoice = await FinanceService.specificPurchaseInvoice(Number(req.params.id));
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}


export const specificcustomerinvoice = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoice = await FinanceService.specificinvoice(Number(req.params.id));
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    next(error)
  }
}

export const getcustomerinvoices = async (req:Request,res:Response,next: NextFunction)=>{
  try {
    const invoices = await FinanceService.custinvoice(Number(req.params.id));
    res.status(200).json({ success: true, data: invoices });
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

export const getLedger = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await FinanceService.getLedger();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const getLedgerLines = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await FinanceService.getLedgerLines(Number(req.params['id']));
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const getAccountBalances = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await FinanceService.getAccountBalances();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const getPaymentAllocations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await FinanceService.getPaymentAllocations();
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const getAccountsDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await FinanceService.getAccountsDashboard();
    res.json({ success: true, ...data });
  } catch (e) { next(e); }
};

export const getPartySummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const summary = await FinanceService.getPartyLedgerSummary(type as any);
    res.status(200).json(summary);
  } catch (err) { next(err); }
};

export const getPartyLedger = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partyId = req.params['partyId'] as string;
    const ledger = await FinanceService.getPartyLedgerDetails(partyId);
    res.status(200).json(ledger);
  } catch (err) { next(err); }
};


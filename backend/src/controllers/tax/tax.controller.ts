import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';

const MAX_FIXED_RATE = 200000000;
const MAX_PERCENTAGE_RATE = 100;

type TaxPayload = {
  name: string;
  rate: number;
  type: string;
  context: string;
  gl_account_id: number | null;
};

export class TaxController {
  private static buildTaxPayload(body: any): TaxPayload {
    const name = String(body.name || '').trim();
    const type = String(body.type || 'percentage').trim().toLowerCase();
    const context = String(body.context || 'sale').trim().toLowerCase();
    const rawRate = Number.parseFloat(String(body.rate ?? '').trim());

    if (!name || Number.isNaN(rawRate)) {
      throw Object.assign(new Error("Name and valid Rate are required."), { statusCode: 400 });
    }

    if (rawRate < 0) {
      throw Object.assign(new Error("Rate negative nahi ho sakta."), { statusCode: 400 });
    }

    let normalizedRate = rawRate;

    if (type === 'percentage') {
      if (rawRate > MAX_PERCENTAGE_RATE) {
        throw Object.assign(new Error("Percentage rate 0 se 100 ke darmiyan hona chahiye."), { statusCode: 400 });
      }

      // UI mein user 17 enter kare to DB mein 0.1700 store ho.
      normalizedRate = rawRate > 1 ? rawRate / 100 : rawRate;
    } else if (rawRate > MAX_FIXED_RATE) {
      throw Object.assign(
        new Error(`Fixed tax rate bohat bara hai. Maximum allowed value ${MAX_FIXED_RATE} hai.`),
        { statusCode: 400 }
      );
    }

    return {
      name,
      rate: Number(normalizedRate.toFixed(4)),
      type,
      context,
      gl_account_id: body.gl_account_id ? Number(body.gl_account_id) : null
    };
  }

  private static handleTaxError(error: any, res: Response) {
    const statusCode = error.statusCode || (error.code === 'P2020' ? 400 : 500);
    const message =
      error.code === 'P2020'
        ? `Rate database range se bahar hai. Fixed tax ke liye maximum ${MAX_FIXED_RATE} aur percentage ke liye 100 tak value use karein.`
        : error.message || 'Tax operation failed.';

    return res.status(statusCode).json({ success: false, message });
  }

  // --- 1. GET ALL TAXES ---
  static async getTaxes(req: Request, res: Response) {
    try {
      const taxes = await prisma.tax.findMany({
        orderBy: { tax_id: 'desc' },
        include: { glaccount: true } // Relationship data
      });

      return res.status(200).json({
        success: true,
        data: taxes,
      });
    } catch (error: any) {
      return TaxController.handleTaxError(error, res);
    }
  }

  // --- 2. CREATE NEW TAX ---
  static async createTax(req: Request, res: Response) {
    try {
      const payload = TaxController.buildTaxPayload(req.body);

      const newTax = await prisma.tax.create({
        data: payload as any
      });

      return res.status(201).json({
        success: true,
        data: newTax,
      });
    } catch (error: any) {
      return TaxController.handleTaxError(error, res);
    }
  }

  // --- 3. DELETE TAX ---
  static async deleteTax(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.tax.delete({
        where: { tax_id: Number(id) }
      });

      return res.status(200).json({
        success: true,
        message: "Tax record purged successfully."
      });
    } catch (error: any) {
      // Check if tax is being used in other tables (Foreign Key Constraint)
      if (error.code === 'P2003') {
        return res.status(400).json({ 
          success: false, 
          message: "Cannot delete. This tax is currently linked to orders or invoices." 
        });
      }
      return TaxController.handleTaxError(error, res);
    }
  }

  // --- 4. UPDATE TAX ---
  static async updateTax(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const payload = TaxController.buildTaxPayload(req.body);

      const updatedTax = await prisma.tax.update({
        where: { tax_id: Number(id) },
        data: payload as any
      });

      return res.status(200).json({
        success: true,
        data: updatedTax,
      });
    } catch (error: any) {
      return TaxController.handleTaxError(error, res);
    }
  }
}

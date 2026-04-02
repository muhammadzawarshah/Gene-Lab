import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';


export class TaxController {
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
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- 2. CREATE NEW TAX ---
  static async createTax(req: Request, res: Response) {
    try {
      const { name, rate, type, context, gl_account_id } = req.body;

      // Validation
      if (!name || rate === undefined) {
        return res.status(400).json({ success: false, message: "Name and Rate are required." });
      }

      const newTax = await prisma.tax.create({
        data: {
          name: name,
          rate: Number(rate), // Decimal convert ho jayega
          type: type || 'percentage',
          context: context || 'sale',
          // Agar frontend se gl_account_id nahi aa raha to null rahega
          gl_account_id: gl_account_id ? Number(gl_account_id) : null
        } as any
      });

      return res.status(201).json({
        success: true,
        data: newTax,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
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
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  // --- 4. UPDATE TAX ---
  static async updateTax(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, rate, type, context, gl_account_id } = req.body;

      if (!name || rate === undefined) {
        return res.status(400).json({ success: false, message: "Name and Rate are required." });
      }

      const updatedTax = await prisma.tax.update({
        where: { tax_id: Number(id) },
        data: {
          name: name,
          rate: Number(rate),
          type: type || 'percentage',
          context: context || 'sale',
          gl_account_id: gl_account_id ? Number(gl_account_id) : null
        } as any
      });

      return res.status(200).json({
        success: true,
        data: updatedTax,
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}
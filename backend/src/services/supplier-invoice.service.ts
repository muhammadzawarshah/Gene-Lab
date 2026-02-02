// src/services/supplier-invoice.service.ts
import { prisma } from '../lib/prisma.js';


export class SupplierInvoiceService {
  static async createInvoiceFromGRN(data: { grnId: number, invoiceNumber: string, amountUntaxed: number, taxAmount: number }) {
    return await prisma.$transaction(async (tx) => {
      const grn = await tx.grn.findUnique({
        where: { grn_id: data.grnId },
        include: { purchaseorder: true }
      });

      if (!grn) throw new Error("GRN not found");

      // 1. Create Supplier Invoice
      const invoice = await tx.supplierinvoice.create({
        data: {
          po_id: grn.po_id,
          suppl_invoice_number: data.invoiceNumber,
          party_id: grn.purchaseorder?.party_id_supplier!,
          suppl_invoice_date: new Date(),
          amount_untaxed: data.amountUntaxed,
          tax_amount: data.taxAmount,
          total_amount: data.amountUntaxed + data.taxAmount,
          status: 'POSTED'
        } as any
      });

      // 2. Finance: Create Journal Entry (Debit Inventory/Expense, Credit AP)
      await tx.journalentry.create({
        data: {
          journal_number: `SUP-INV-${invoice.suppl_inv_id}`,
          journal_type: 'PURCHASE',
          date: new Date(),
          source_type: 'SUPPLIER_INVOICE',
          source_id: invoice.suppl_inv_id,
          journalline: {
            create: [
              { gl_account_id: 5000, debit: data.amountUntaxed } as any, // Cost of Goods Sold / Inventory
              { gl_account_id: 2000, credit: invoice.total_amount } as any, // Accounts Payable (Liability)
              { gl_account_id: 1500, debit: data.taxAmount } as any, // Input VAT/Tax
            ]
          }
        } as any
      });

      return invoice;
    });
  }
}
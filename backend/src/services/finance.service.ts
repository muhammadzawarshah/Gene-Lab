import { prisma } from '../lib/prisma.js';

export class FinanceService {
  /**
   * FLOW C: Generate Invoice from Delivery Note
   */
  static async createInvoice(deliveryId: number) {
    return await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliverynote.findUnique({
        where: { delv_note_id: deliveryId },
        include: { salesorder: { include: { salesorderline: true } } }
      });

      if (!delivery || !delivery.salesorder) throw new Error("Delivery or SO not found");

      // 1. Create the Invoice Header
      const invoice = await tx.customerinvoice.create({
        data: {
          so_id: delivery.so_id,
          party_id_customer: delivery.salesorder.party_id_customer,
          cust_invoice_date: new Date(),
          total_amount: delivery.salesorder.total_amount,
          status: 'POSTED',
        } as any
      });

      // 2. Create Invoice Lines
      // FIX: cust_inv_line_id ko remove kiya kyunki wo autoincrement hai
      await tx.customerinvoiceline.createMany({
        data: delivery.salesorder.salesorderline.map((line) => ({
          cust_inv_id: invoice.cust_inv_id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_price: line.unit_price,
          line_total: line.line_total,
        })),
        skipDuplicates: true
      } as any);

      // 3. Accounting: Create Journal Entry
      // FIX: journal_line_id ko data se remove kiya hai
      await tx.journalentry.create({
        data: {
          journal_number: `INV-${invoice.cust_inv_id}`,
          journal_type: 'SALES',
          date: new Date(),
          source_type: 'INVOICE', 
          source_id: invoice.cust_inv_id,
          journalline: {
            create: [
              { gl_account_id: 1200, debit: invoice.total_amount, credit: 0 } as any, 
              { gl_account_id: 4000, debit: 0, credit: invoice.total_amount } as any, 
            ]
          }
        } as any
      });

      return invoice;
    });
  }

  /**
   * FLOW D: Payment & Allocation
   */
  static async processPayment(data: { partyId: string, amount: number, method: any, invoiceId: number }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Record the Payment
      const payment = await tx.payment.create({
        data: {
          party_id: data.partyId,
          payment_date: new Date(),
          payment_type: 'RECEIPT',
          method: data.method,
          amount: data.amount
        } as any
      });

      // 2. Allocate to Invoice
      // FIX: payment_allocation_id ko remove kiya
      await tx.paymentallocation.create({
        data: {
          payment_id: payment.payment_id,
          cust_inv_id: data.invoiceId,
          allocated_amount: data.amount
        } as any
      });

      // 3. Update Invoice Status
      await tx.customerinvoice.update({
        where: { cust_inv_id: data.invoiceId },
        data: { status: 'PAID' }
      });

      return payment;
    });
  }
//   static async getInvoices(userId: string, statusFilter: string, search: string) {
//   // 1. ERD: User -> Party mapping
//   const party = await prisma.party.findFirst({
//     where: { user_id: userId } as any
//   });

//   if (!party) throw new Error("PARTY_NOT_FOUND");

//   // 2. Query Builder - Following the ERD: CustomerInvoice -> SalesOrder -> Party
//   const whereClause: any = {
//     salesorder: {
//       party_id_customer: party.party_id
//     }
//   };

//   // Status Filter Logic (ERD typically uses UPPERCASE for status enums)
//   if (statusFilter && statusFilter !== 'All') {
//     whereClause.status = statusFilter.toUpperCase(); 
//   }

//   // Search Logic (Searching Invoice Number or PO Reference from SalesOrder)
//   if (search) {
//     whereClause.OR = [
//       { cust_invoice_number: { contains: search, mode: 'insensitive' } },
//       { salesorder: { po_reference: { contains: search, mode: 'insensitive' } } }
//     ];
//   }

//   const dbInvoices = await prisma.customerinvoice.findMany({
//     where: whereClause,
//     include: {
//       salesorder: true,
//       // ERD Relation: CustomerInvoice has many PaymentLines
//       payment: true 
//     },
//     orderBy: { inv_date: 'desc' }
//   });

//   // 3. Transformation to match your Frontend Interface
//   return dbInvoices.map((inv: any) => {
//     const total = Number(inv.total_amount) || 0;
    
//     // PaymentLine table (Page 9 ERD) uses 'allocated_amount'
//     const paid = inv.paymentline?.reduce((sum: number, p: any) => 
//       sum + Number(p.allocated_amount), 0) || 0;
    
//     const balance = total - paid;

//     // Logic for Dynamic Status
//     let displayStatus = inv.status; // Default from DB
//     if (balance <= 0 && total > 0) displayStatus = 'Paid';
//     else if (paid > 0 && balance > 0) displayStatus = 'Partially Paid';
//     else displayStatus = 'Unpaid';

//     return {
//       id: inv.cust_invoice_number,
//       poRef: inv.salesorder?.po_reference || "N/A",
//       dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : "N/A",
//       totalAmount: total.toLocaleString(undefined, { minimumFractionDigits: 2 }),
//       paidAmount: paid.toLocaleString(undefined, { minimumFractionDigits: 2 }),
//       balance: balance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
//       status: displayStatus
//     };
//   });
// }
}
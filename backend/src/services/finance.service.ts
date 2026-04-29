import { prisma } from '../lib/prisma.js';

export class FinanceService {
  /**
   * FLOW C: Generate Invoice from Delivery Note
   * Creates Customer Invoice + 4-line Journal Entry:
   *   DR 1.3 Accounts Receivable  (invoice amount)
   *   CR 4.1 Sales Revenue        (invoice amount)
   *   DR 5.1 Cost of Goods Sold   (at purchase/cost price)
   *   CR 1.4 Inventory            (at purchase/cost price)
   */
  static async createInvoice(deliveryId: string, narration?: string, userId?: string) {
    return await prisma.$transaction(async (tx) => {

      // ── 1. Fetch Delivery Note with all related data ──────────────────────
      const delivery = await tx.deliverynote.findUnique({
        where: { delivery_number: deliveryId },
        include: {
          salesorder: {
            include: { salesorderline: true }
          },
          deliverynoteline: true   // Actual delivered quantities for COGS
        }
      });

      if (!delivery || !delivery.salesorder) {
        throw new Error('Delivery Note or Sales Order not found.');
      }

      // ── 2. Guard: Prevent duplicate invoice for same Sales Order ──────────
      const existingInvoice = await tx.customerinvoice.findFirst({
        where: { so_id: delivery.so_id }
      });
      if (existingInvoice) {
        throw new Error(
          `Invoice already exists for this Delivery Note (Invoice ID: ${existingInvoice.cust_inv_id}).`
        );
      }

      // ── 3. Resolve GL Accounts dynamically from DB by account code ────────
      const glAccounts = await tx.glaccount.findMany({
        where: { gl_account_code: { in: ['1.3', '4.1', '5.1', '1.4'] } },
        select: { gl_account_id: true, gl_account_code: true }
      });
      const glMap: Record<string, number> = {};
      for (const acc of glAccounts) {
        glMap[acc.gl_account_code] = acc.gl_account_id;
      }
      // Validate all required GL accounts exist
      for (const code of ['1.3', '4.1', '5.1', '1.4']) {
        if (!glMap[code]) {
          throw new Error(`GL Account ${code} not found. Please run the database seed script.`);
        }
      }

      // ── 4. Create Customer Invoice Header ─────────────────────────────────
      // total_amount: DN ka nettotal use karo (transport + discount included)
      // salesorder.total_amount mein transport nahi hoti
      const dnNetTotal   = Number(delivery.nettotal        || delivery.salesorder.total_amount || 0);
      const dnTransport  = Number(delivery.transportcharges || 0);
      const dnDiscount   = Number(delivery.discount          || 0);

      const invoice = await tx.customerinvoice.create({
        data: {
          so_id:             delivery.so_id,
          party_id_customer: delivery.salesorder.party_id_customer,
          cust_invoice_date: new Date(),
          total_amount:      dnNetTotal,       // ← DN nettotal (with transport)
          discount:          String(dnDiscount),
          transportcharges:  String(dnTransport),
          nettotal:          String(dnNetTotal),
          status:            'POSTED',
        } as any
      });

      // ── 5. Create Invoice Lines (from Sales Order Lines) ──────────────────
      await tx.customerinvoiceline.createMany({
        data: delivery.salesorder.salesorderline.map((line) => ({
          cust_inv_id: invoice.cust_inv_id,
          product_id:  line.product_id,
          quantity:    line.quantity,
          unit_price:  line.unit_price,
          line_total:  line.line_total,
          tax_id:      line.tax_id,
        })),
        skipDuplicates: true,
      } as any);

      // ── 6. Calculate COGS using ACTUAL DELIVERED quantities ───────────────
      //    Price source priority:
      //      (a) GRN Line purchase_price  ← PRIMARY (entered at time of receiving)
      //      (b) Product Price table      ← FALLBACK if no GRN price found
      const deliveredProductIds = [
        ...new Set(delivery.deliverynoteline.map((l) => l.product_id))
      ];

      // (a) PRIMARY: Latest purchase_price from GRN lines
      const latestGrnCostLines = await tx.grnline.findMany({
        where: {
          product_id: { in: deliveredProductIds },
          purchase_price: { not: null }
        },
        orderBy: { grn_line_id: 'desc' },
        select: { product_id: true, purchase_price: true },
      });
      const costMap = new Map<string, number>();
      for (const gl of latestGrnCostLines) {
        if (gl.product_id && !costMap.has(gl.product_id) && gl.purchase_price !== null) {
          costMap.set(gl.product_id, Number(gl.purchase_price));
        }
      }

      // (b) FALLBACK: productprice table for products with no GRN purchase price yet
      const missingIds = deliveredProductIds.filter((id) => !costMap.has(id));
      if (missingIds.length > 0) {
        const fallbackPrices = await tx.productprice.findMany({
          where: {
            product_id:   { in: missingIds },
            effective_to: null,
          },
          orderBy: { effective_from: 'desc' },
          select:  { product_id: true, unit_price: true },
        });
        for (const fp of fallbackPrices) {
          if (!costMap.has(fp.product_id)) {
            costMap.set(fp.product_id, Number(fp.unit_price));
          }
        }
      }

      // COGS = Σ (delivered_qty × unit_cost) per delivery line
      let cogsTotal = 0;
      for (const dnLine of delivery.deliverynoteline) {
        const unitCost = costMap.get(dnLine.product_id) ?? 0;
        cogsTotal += Number(dnLine.delivered_qty) * unitCost;
      }
      cogsTotal = Math.round(cogsTotal * 100) / 100;

      const salesAmount = Number(invoice.total_amount) || 0;
      const customerId  = delivery.salesorder.party_id_customer;
      const journalNum  = `SINV-${invoice.cust_inv_id}`;

      // ── 7. Create Journal Entry — 4 lines ────────────────────────────────
      /*
      ====================================================
      ACCOUNTING ENTRIES — Delivery Note Invoice
        DR  1.3  Accounts Receivable  (customer owes us)   ← invoice total
        CR  4.1  Sales Revenue        (income recognised)  ← invoice total
        DR  5.1  Cost of Goods Sold   (at cost price)      ← COGS total
        CR  1.4  Inventory            (stock out at cost)  ← COGS total
      ====================================================
      */
      await tx.journalentry.create({
        data: {
          journal_number: journalNum,
          journal_type:   'SALES',
          date:           new Date(),
          narration:      narration || `Sales Invoice — Delivery Note #${deliveryId}`,
          posted_by:      userId ? String(userId) : null,
          posted_at:      new Date(),
          source_type:    'CUSTOMER_INVOICE',
          source_id:      invoice.cust_inv_id,
          journalline: {
            create: [
              {
                // DR 1.3 Accounts Receivable — customer owes us
                gl_account_id:       glMap['1.3'],
                debit:               salesAmount,
                credit:              0,
                party_id_sub_ledger: customerId,
              },
              {
                // CR 4.1 Sales Revenue — income recognised
                gl_account_id:       glMap['4.1'],
                debit:               0,
                credit:              salesAmount,
                party_id_sub_ledger: customerId,
              },
              {
                // DR 5.1 Cost of Goods Sold — at purchase/cost price
                gl_account_id:       glMap['5.1'],
                debit:               cogsTotal,
                credit:              0,
                party_id_sub_ledger: customerId,
              },
              {
                // CR 1.4 Inventory — stock leaves at cost price
                gl_account_id:       glMap['1.4'],
                debit:               0,
                credit:              cogsTotal,
                party_id_sub_ledger: customerId,
              },
            ]
          }
        }
      } as any);

      // ── 8. Update Account Balances (Trial Balance / Balance Sheet) ────────
      await FinanceService.updateAccountBalances(tx, [
        { gl_account_id: glMap['1.3'], debit: salesAmount, credit: 0           },
        { gl_account_id: glMap['4.1'], debit: 0,           credit: salesAmount },
        { gl_account_id: glMap['5.1'], debit: cogsTotal,   credit: 0           },
        { gl_account_id: glMap['1.4'], debit: 0,           credit: cogsTotal   },
      ]);

      return {
        ...invoice,
        journal_number: journalNum,
        cogs_total:     cogsTotal,
        sales_amount:   salesAmount,
      };
    });
  }

  static async createInvoiceFromGRN(grnId: number, narration?: string, userId?: string) {

    return prisma.$transaction(async (tx) => {

      const grn = await tx.grn.findUnique({
        where: { grn_id: grnId },
        include: {
          purchaseorder: {
            include: {
              purchaseorderline: true
            }
          },
          grnline: true
        }
      });

      if (!grn || !grn.purchaseorder) {
        throw new Error("GRN_OR_PO_NOT_FOUND");
      }

      if (!grn.po_id) {
        throw new Error("GRN_PO_LINK_REQUIRED");
      }

      const existingInvoice = await tx.supplierinvoice.findFirst({
        where: { po_id: grn.po_id },
        select: {
          suppl_inv_id: true,
          suppl_invoice_number: true
        }
      });

      if (existingInvoice) {
        throw new Error(
          `Purchase invoice already exists for this GRN (${existingInvoice.suppl_invoice_number || `PINV-${existingInvoice.suppl_inv_id}`}).`
        );
      }

      /*
      ==========================
      CREATE SUPPLIER INVOICE
      ==========================
      Total amount: GRN lines ki actual purchase_price × received_qty se calculate karo
      (PO ka total_amount rely mat karo — wo 0 ho sakta hai agar frontend ne nahi bheja)
      ==========================
      */

      // ── Calculate actual invoice total from GRN lines ──────────────────────
      let grnInvoiceTotal = 0;
      for (const line of grn.grnline) {
        const poLine = grn.purchaseorder.purchaseorderline.find(
          (p) => p.po_line_id === line.po_line_id
        );
        // Priority: GRN line ki purchase_price → phir PO line unit_price
        const unitCost = line.purchase_price !== null && line.purchase_price !== undefined
          ? Number(line.purchase_price)
          : Number(poLine?.unit_price || 0);
        grnInvoiceTotal += Number(line.received_qty) * unitCost;
      }
      grnInvoiceTotal = Math.round(grnInvoiceTotal * 100) / 100;

      // GRN ka discount aur transport charges bhi invoice mein store karo
      const grnDiscount   = Number(grn.discount         || 0);
      const grnTransport  = Number(grn.transportcharges || 0);
      // Nettotal = subtotal + transport - discount (agar GRN mein saved hai to use karo, warna calculate)
      const grnNettotal   = grn.nettotal
        ? Number(grn.nettotal)
        : Math.round((grnInvoiceTotal + grnTransport - grnDiscount) * 100) / 100;

      const invoice = await tx.supplierinvoice.create({
        data: {
          po_id:              grn.po_id,
          party_id:           grn.purchaseorder.party_id_supplier,
          suppl_invoice_date: new Date(),
          total_amount:       grnNettotal,          // ← nettotal with transport
          discount:           String(grnDiscount),
          transportcharges:   String(grnTransport),
          nettotal:           String(grnNettotal),
          status:             "POSTED"
        } as any
      });

      /*
      ==========================
      CREATE INVOICE LINES
      ==========================
      */

      await tx.supplierinvoiceline.createMany({
        data: grn.grnline.map((line) => {

          const poLine = grn.purchaseorder?.purchaseorderline.find(
            (p) => p.po_line_id === line.po_line_id
          );

          // Priority: GRN line ki purchase_price → phir PO unit_price
          const unitCost = line.purchase_price !== null && line.purchase_price !== undefined
            ? Number(line.purchase_price)
            : Number(poLine?.unit_price || 0);

          return {
            suppl_inv_id: invoice.suppl_inv_id,
            product_id: line.product_id,
            quantity: line.received_qty,
            unit_price: unitCost,
            line_total: Number(line.received_qty) * unitCost,
            tax_id: poLine?.tax_id
          };

        }) as any
      });

      /*
      ==========================
      ACCOUNTING ENTRY
      Double Entry: Purchase Invoice
        DR  1.4  Inventory          (Asset increases)
        CR  2.1  Accounts Payable   (Liability increases)
      ==========================
      */

      await tx.journalentry.create({
        data: {
          journal_number: `PINV-${invoice.suppl_inv_id}`,
          journal_type: "PURCHASE",
          date: new Date(),
          narration: narration || `Purchase Invoice from ${grn.purchaseorder.party_id_supplier} — GRN #${grn.grn_number || grn.grn_id}`,
          posted_by: userId ? String(userId) : null,
          posted_at: new Date(),
          source_type: "SUPPLIER_INVOICE",
          source_id: invoice.suppl_inv_id,
          journalline: {
            create: [
              {
                // DR: Inventory (Asset 1.4) — stock value increases
                gl_account_id: 14,
                debit:  Number(invoice.total_amount),
                credit: 0,
                party_id_sub_ledger: grn.purchaseorder.party_id_supplier,
              },
              {
                // CR: Accounts Payable (Liability 2.1) — we owe the supplier
                gl_account_id: 21,
                debit:  0,
                credit: Number(invoice.total_amount),
                party_id_sub_ledger: grn.purchaseorder.party_id_supplier,
              }
            ]
          }
        }
      } as any);

      await FinanceService.updateAccountBalances(tx, [
        { gl_account_id: 14, debit: Number(invoice.total_amount), credit: 0 },
        { gl_account_id: 21, debit: 0, credit: Number(invoice.total_amount) },
      ]);

      return invoice;

    });

  }

  static async getAvailableDeliveryNotesForInvoice() {
    const invoicedSoIds = await prisma.customerinvoice.findMany({
      where: { so_id: { not: null } },
      select: { so_id: true }
    });

    const excludedSoIds = invoicedSoIds
      .map((inv) => inv.so_id)
      .filter((id): id is number => id !== null);

    return prisma.deliverynote.findMany({
      where: {
        so_id: {
          not: null,
          ...(excludedSoIds.length ? { notIn: excludedSoIds } : {})
        }
      },
      select: {
        delv_note_id: true,
        delivery_number: true,
        delv_date: true,
        salesorder: {
          select: {
            total_amount: true,
            party: { select: { name: true } }
          }
        }
      },
      orderBy: { delv_date: 'desc' }
    });
  }

  static async getAvailableGRNsForPurchaseInvoice() {
    const invoicedPurchaseOrders = await prisma.supplierinvoice.findMany({
      where: {
        po_id: {
          not: null
        }
      },
      select: {
        po_id: true
      }
    });

    const excludedPoIds = invoicedPurchaseOrders
      .map((invoice) => invoice.po_id)
      .filter((poId): poId is number => poId !== null);

    return prisma.grn.findMany({
      where: {
        po_id: {
          not: null,
          ...(excludedPoIds.length ? { notIn: excludedPoIds } : {})
        }
      },
      select: {
        grn_id: true,
        grn_number: true,
        received_date: true
      },
      orderBy: {
        received_date: 'desc'
      }
    });
  }


  /**
   * FLOW D: Payment & Allocation
   */
static async processPayment(data: { 
    amount: number, 
    method: any, 
    invoiceId: number, 
    remarks?: string,
    narration?: string,
    userId?: string,
    payment_date?: string // Date frontend se aayegi
  }) {
    const { amount, method, invoiceId, remarks, narration, userId, payment_date } = data;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch Invoice aur check karna ke wo exist karti hai
        const invoice = await tx.customerinvoice.findUnique({
          where: { cust_inv_id: Number(invoiceId) },
          select: {
            party_id_customer: true,
            total_amount: true,
            paymentallocation: {
              select: { allocated_amount: true }
            }
          }
        });

        if (!invoice) {
          throw new Error("Invoice reference not found in database.");
        }

        const invoiceTotal = Number(invoice.total_amount || 0);
        const alreadyPaid = (invoice.paymentallocation || []).reduce(
          (sum: number, allocation: any) => sum + Number(allocation.allocated_amount || 0),
          0
        );
        const remainingBalance = Math.max(invoiceTotal - alreadyPaid, 0);
        const paymentAmount = Number(amount);

        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
          throw new Error("Please enter a valid payment amount.");
        }

        if (remainingBalance <= 0) {
          throw new Error("This invoice is already fully paid.");
        }

        if (paymentAmount > remainingBalance) {
          throw new Error(`Payment amount exceeds remaining balance (${remainingBalance}).`);
        }

        // 2. Create Payment Record (RECEIPT)
        const payment = await tx.payment.create({
          data: {
            party_id: invoice.party_id_customer,
            payment_date: payment_date ? new Date(payment_date) : new Date(),
            payment_type: 'RECEIPT',
            method: method || 'CASH', 
            amount: paymentAmount,
            reference_number: `INV-${invoiceId}`,
            created_at: new Date(),
            created_by: userId ? String(userId) : null
          }
        });

        // 3. Allocate Payment to Invoice
        await tx.paymentallocation.create({
          data: {
            payment_id: payment.payment_id,
            cust_inv_id: Number(invoiceId),
            allocated_amount: paymentAmount,
            remarks: remarks || ""
          }
        });

        // 4. Update Invoice Status using cumulative allocations
        const allocationSummary = await tx.paymentallocation.aggregate({
          where: { cust_inv_id: Number(invoiceId) },
          _sum: { allocated_amount: true }
        });
        const totalPaid = Number(allocationSummary._sum.allocated_amount || 0);
        const newStatus = totalPaid >= invoiceTotal ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'POSTED';

        await tx.customerinvoice.update({
          where: { cust_inv_id: Number(invoiceId) },
          data: { status: newStatus as any }
        });

        /*
        ==========================
        ACCOUNTING ENTRY — Payment Received
          DR  1.1/1.2  Cash or Bank         (asset increases)
          CR  1.3      Accounts Receivable  (customer's debt cleared)
        ==========================
        */
        const cashGlId = ['BANK', 'CHEQUE', 'ONLINE'].includes(String(method).toUpperCase()) ? 12 : 11;
        await tx.journalentry.create({
          data: {
            journal_number: `RCPT-${payment.payment_id}`,
            journal_type:   "RECEIPT",
            date:           new Date(),
            narration:      narration || remarks || `Payment received for Invoice #${invoiceId}`,
            posted_by:      userId ? String(userId) : null,
            posted_at:      new Date(),
            source_type:    "PAYMENT",
            source_id:      payment.payment_id,
            journalline: {
              create: [
                {
                  // DR Cash(11) or Bank(12)
                  gl_account_id: cashGlId,
                  debit:  Number(amount),
                  credit: 0,
                  party_id_sub_ledger: invoice.party_id_customer,
                },
                {
                  // CR 1.3 Accounts Receivable
                  gl_account_id:      13,
                  debit:  0,
                  credit: Number(amount),
                  party_id_sub_ledger: invoice.party_id_customer,
                },
              ]
            }
          }
        } as any);

        await FinanceService.updateAccountBalances(tx, [
          { gl_account_id: cashGlId, debit: Number(amount), credit: 0 },
          { gl_account_id: 13, debit: 0, credit: Number(amount) },
        ]);

        return payment;
      });

      return {
        success: true,
        message: "Payment posted to ledger successfully",
        data: result
      };

    } catch (error: any) {
      console.error("Payment Error:", error);
      throw new Error(error.message || "Internal Server Error");
    }
  }

  static async getInvoices(userId: string, statusFilter: string, search: string) {
  // 1. ERD: User -> Party mapping
  const party = await prisma.party.findFirst({
    where: { user_id: userId } as any
  });

  if (!party) throw new Error("PARTY_NOT_FOUND");

  // 2. Query Builder - Following the ERD: CustomerInvoice -> SalesOrder -> Party
  const whereClause: any = {
    salesorder: {
      party_id_customer: party.party_id
    }
  };

  // Status Filter Logic (ERD typically uses UPPERCASE for status enums)
  if (statusFilter && statusFilter !== 'All') {
    whereClause.status = statusFilter.toUpperCase(); 
  }

  // Search Logic (Searching Invoice Number or PO Reference from SalesOrder)
  if (search) {
    whereClause.OR = [
      { cust_invoice_number: { contains: search, mode: 'insensitive' } },
      { salesorder: { po_reference: { contains: search, mode: 'insensitive' } } }
    ];
  }

  const dbInvoices = await prisma.customerinvoice.findMany({
    where: whereClause,
    include: {
      salesorder: true,
      // ERD Relation: CustomerInvoice has many PaymentAllocations
      paymentallocation: true 
    },
    orderBy: { cust_invoice_date: 'desc' }
  });

  // 3. Transformation to match your Frontend Interface
  return dbInvoices.map((inv: any) => {
    const total = Number(inv.total_amount) || 0;
    
    // PaymentAllocation table (Page 9 ERD) uses 'allocated_amount'
    const paid = inv.paymentallocation?.reduce((sum: number, p: any) => 
      sum + Number(p.allocated_amount), 0) || 0;
    
    const balance = total - paid;

    // Logic for Dynamic Status
    let displayStatus = inv.status; // Default from DB
    if (balance <= 0 && total > 0) displayStatus = 'Paid';
    else if (paid > 0 && balance > 0) displayStatus = 'Partially Paid';
    else displayStatus = 'Unpaid';

    return {
      id: inv.cust_invoice_number,
      poRef: inv.salesorder?.po_reference || "N/A",
      dueDate: inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-GB') : "N/A",
      totalAmount: total.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      paidAmount: paid.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      balance: balance.toLocaleString(undefined, { minimumFractionDigits: 2 }),
      status: displayStatus
    };
  });
}

static async getinvoice(){
  const invoices = await prisma.customerinvoice.findMany({
    include: {
      party: { select: { name: true, phone: true, email: true } },
      customerinvoiceline: { select: { cust_inv_line_id: true } },
      paymentallocation: { select: { allocated_amount: true } }
    },
    orderBy: { cust_invoice_date: 'desc' }
  });

  return invoices.map((invoice: any) => {
    const totalAmount = Number(invoice.total_amount || 0);
    const paidAmount = (invoice.paymentallocation || []).reduce(
      (sum: number, allocation: any) => sum + Number(allocation.allocated_amount || 0),
      0
    );
    const balanceAmount = totalAmount - paidAmount;
    const computedStatus =
      balanceAmount <= 0 && totalAmount > 0
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : (invoice.status || 'POSTED');

    return {
      ...invoice,
      paidAmount,
      balanceAmount,
      status: computedStatus
    };
  });
}

static async specificinvoice(id: number) {
  try {
    const invoice = await prisma.customerinvoice.findUnique({
      where: {
        cust_inv_id: id
      },
      include: {
        // Customer ki details (optional but useful)
        party: true,
        
        // Invoice ki lines load ho rahi hain
        customerinvoiceline: {
          include: {
            // Har line ke andar uska product load hoga
            product: {
              include: {
                // Agar product ke andar category ya UOM bhi chahiye
                uom: true, 
                productcategory: true
              }
            },
            // Agar line ke sath tax details bhi chahiye
            tax: true 
          }
        },
        paymentallocation: {
          select: {
            allocated_amount: true
          }
        }
      }
    });

    if (!invoice) return null;

    const allocationSummary = await prisma.paymentallocation.aggregate({
      where: { cust_inv_id: id },
      _sum: { allocated_amount: true }
    });

    const totalAmount = Number(invoice.total_amount || 0);
    const paidAmount = Number(allocationSummary._sum.allocated_amount || 0);
    const balanceAmount = Math.max(totalAmount - paidAmount, 0);
    const computedStatus =
      balanceAmount <= 0 && totalAmount > 0
        ? 'PAID'
        : paidAmount > 0
          ? 'PARTIAL'
          : (invoice.status || 'POSTED');

    return {
      ...invoice,
      paidAmount,
      balanceAmount,
      status: computedStatus
    };
  } catch (error) {
    console.error("Error fetching specific invoice:", error);
    throw error;
  }
}

static async payments(){
  return prisma.payment.findMany({
    include:{
      party:true,

    }
  });
}

static async processPurchasePayment(data: { 
    amount: number, 
    method: any, 
    invoiceId: number, 
    remarks?: string,
    narration?: string,
    userId?: string,
    payment_date?: string 
  }) {
    const { amount, method, invoiceId, remarks, narration, userId, payment_date } = data;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch Supplier Invoice (Aapke schema mein 'supplierinvoice' hai)
        const invoice = await tx.supplierinvoice.findUnique({
          where: { suppl_inv_id: Number(invoiceId) },
          select: { 
            party_id: true, // Schema mein 'party_id' hai, 'party_id_customer' nahi
            total_amount: true 
          }
        });

        if (!invoice) {
          throw new Error("Supplier Invoice not found.");
        }

        // 2. Create Payment Record (PAYMENT type for suppliers)
        const payment = await tx.payment.create({
          data: {
            party_id: invoice.party_id,
            payment_date: payment_date ? new Date(payment_date) : new Date(),
            payment_type: 'PAYMENT', // Supplier ko paise de rahe hain to 'PAYMENT' hoga
            method: method || 'CASH', 
            amount: Number(amount),
            reference_number: `SUPP-INV-${invoiceId}`,
            created_at: new Date(),
            created_by: userId ? String(userId) : null
          }
        });

        // 3. Allocate Payment to Supplier Invoice
        await tx.paymentallocation.create({
          data: {
            payment_id: payment.payment_id,
            suppl_inv_id: Number(invoiceId), // Corrected: suppl_inv_id use karein
            allocated_amount: Number(amount),
            remarks: remarks || "Supplier Payment"
          }
        });

        // 4. Update Supplier Invoice Status using cumulative allocations
        const allocationSummary = await tx.paymentallocation.aggregate({
          where: { suppl_inv_id: Number(invoiceId) },
          _sum: { allocated_amount: true }
        });
        const totalPaid = Number(allocationSummary._sum.allocated_amount || 0);
        const invoiceTotal = Number(invoice.total_amount || 0);
        const newStatus = totalPaid >= invoiceTotal ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'POSTED';
        await tx.supplierinvoice.update({
          where: { suppl_inv_id: Number(invoiceId) },
          data: { status: newStatus as any }
        });

        /*
        ==========================
        ACCOUNTING ENTRY — Purchase Payment (paid to supplier)
          DR  2.1      Accounts Payable  (liability decreases — debt cleared)
          CR  1.1/1.2  Cash or Bank      (asset decreases — money goes out)
        ==========================
        */
        const cashGlId = ['BANK', 'CHEQUE', 'ONLINE'].includes(String(method).toUpperCase()) ? 12 : 11;
        await tx.journalentry.create({
          data: {
            journal_number: `PYMT-${payment.payment_id}`,
            journal_type:   "PAYMENT",
            date:           new Date(),
            narration:      narration || remarks || `Supplier payment for Invoice #${invoiceId}`,
            posted_by:      userId ? String(userId) : null,
            posted_at:      new Date(),
            source_type:    "PAYMENT",
            source_id:      payment.payment_id,
            journalline: {
              create: [
                {
                  // DR 2.1 Accounts Payable — supplier debt cleared
                  gl_account_id:      21,
                  debit:  Number(amount),
                  credit: 0,
                  party_id_sub_ledger: invoice.party_id,
                },
                {
                  // CR Cash(11) or Bank(12) — money goes out
                  gl_account_id: cashGlId,
                  debit:  0,
                  credit: Number(amount),
                  party_id_sub_ledger: invoice.party_id,
                },
              ]
            }
          }
        } as any);

        await FinanceService.updateAccountBalances(tx, [
          { gl_account_id: 21, debit: Number(amount), credit: 0 },
          { gl_account_id: cashGlId, debit: 0, credit: Number(amount) },
        ]);

        return payment;
      });

      return {
        success: true,
        message: "Supplier payment processed successfully",
        data: result
      };

    } catch (error: any) {
      console.error("Purchase Payment Error:", error);
      throw new Error(error.message || "Internal Server Error");
    }
  }

static async purchaseInvoiceList() {
  try {
    const invoices = await prisma.supplierinvoice.findMany({
      include: {
      
        party: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
       
        purchaseorder: {
          select: {
            po_id: true,
            order_date: true
          }
        },
       
        paymentallocation: {
          select: {
            allocated_amount: true
          }
        }
      },
      orderBy: {
        suppl_invoice_date: 'desc'
      }
    });

    // Data ko thoda clean karke return karte hain
    const formattedInvoices = invoices.map(inv => {
      // Total paid amount calculate kar rahe hain paymentallocation se
      const totalPaid = inv.paymentallocation.reduce((sum, alloc) => 
        sum + Number(alloc.allocated_amount), 0
      );

      return {
        id: inv.suppl_inv_id,
        invoiceNumber: inv.suppl_invoice_number,
        supplierName: inv.party.name,
        date: inv.suppl_invoice_date,
        dueDate: inv.suppl_inv_due_date,
        totalAmount: inv.total_amount,
        paidAmount: totalPaid,
        balanceAmount: Number(inv.total_amount) - totalPaid,
        status: inv.status,
        poReference: inv.po_id ? `PO-${inv.po_id}` : 'N/A'
      };
    });

    return formattedInvoices;


  } catch (error: any) {
    console.error("Fetch Purchase Invoice Error:", error);
    throw new Error(error.message || "Failed to fetch purchase invoices");
  }
}

static async specificPurchaseInvoice(invoiceId: number) {
  try {
    const invoice = await prisma.supplierinvoice.findUnique({
      where: {
        suppl_inv_id: Number(invoiceId),
      },
      include: {
        // 1. Supplier ki details
        party: {
          select: {
            party_id: true,
            name: true,
            email: true,
            phone: true,
            addresses: {
              select: { line1: true, line2: true, city: true, postal_code: true, country: true }
            },
          },
        },
        // 2. Invoice line items
        supplierinvoiceline: {
          include: {
            product: {
              select: { name: true, sku_code: true },
            },
            tax: true,
          },
        },
        // 3. Payments made so far
        paymentallocation: {
          include: { payment: true },
        },
        // 4. Purchase Order + GRN (to fetch transportcharges for older invoices)
        purchaseorder: {
          include: {
            grn: {
              select: {
                grn_id: true,
                discount: true,
                transportcharges: true,
                nettotal: true,
              },
              orderBy: { grn_id: 'desc' },
              take: 1,
            }
          }
        },
      },
    });

    if (!invoice) {
      throw new Error("Purchase Invoice not found.");
    }

    // Calculations
    const totalPaid = invoice.paymentallocation.reduce(
      (sum, alloc) => sum + Number(alloc.allocated_amount),
      0
    );
    const balanceDue_old = Number(invoice.total_amount) - totalPaid; // kept for reference

    // Transport/Discount: invoice mein saved values prefer karo —
    // agar invoice purana hai (columns nahi the), GRN se fallback lo
    const linkedGRN = invoice.purchaseorder?.grn?.[0];
    const resolvedTransport = Number(invoice.transportcharges || 0) > 0
      ? Number(invoice.transportcharges)
      : Number(linkedGRN?.transportcharges || 0);

    const resolvedDiscount = Number(invoice.discount || 0) > 0
      ? Number(invoice.discount)
      : Number(linkedGRN?.discount || 0);

    // Subtotal = line items sum
    const lineSubtotal = (invoice.supplierinvoiceline as any[]).reduce(
      (sum: number, line: any) => sum + Number(line.line_total || 0),
      0
    );

    // True total = lineSubtotal + transport - discount
    // (invoice.total_amount on old invoices didn't include transport)
    const trueTotal = Math.round((lineSubtotal + resolvedTransport - resolvedDiscount) * 100) / 100;
    const balanceDue = Math.round((trueTotal - totalPaid) * 100) / 100;

    // Debug — remove after verification
    console.log(`[PINV-${invoice.suppl_inv_id}] sub=${lineSubtotal} transport=${resolvedTransport} discount=${resolvedDiscount} trueTotal=${trueTotal} paid=${totalPaid} balance=${balanceDue} | GRN.transport=${linkedGRN?.transportcharges}`);

    return {
      ...invoice,
      totalPaid,
      balanceDue,
      trueTotal,
      resolvedTransport,
      resolvedDiscount,
      lineSubtotal,
    };

  } catch (error: any) {
    console.error("Fetch Specific Invoice Error:", error);
    throw new Error(error.message || "Failed to fetch invoice details");
  }
}

static async custinvoice(userid:number){
  const parties = await prisma.party.findMany({
    where:{
      user_id:userid
    },
  })

  const invoice = await prisma.customerinvoice.findMany({
    where:{
      party_id_customer: {
        in: parties.map(p => p.party_id)
      }
    },
    include:{
      customerinvoiceline:{
        include: {
          product: true
        }
      }
    }
  })

  return invoice;
}

static async custpayment(userid:number){
  const parties = await prisma.party.findMany({
    where:{
      user_id:userid
    },
  })

  const invoice = await prisma.payment.findMany({
    where:{
      party_id: {
        in: parties.map(p => p.party_id)
      }
    },
    include:{
      paymentallocation:true,
    }
  })

  return invoice;
}

// ─────────────────────────────────────────────
// ACCOUNT BALANCE UPDATER (called inside every tx after journalentry.create)
// ─────────────────────────────────────────────
private static async updateAccountBalances(
  tx: any,
  lines: { gl_account_id: number; debit: number; credit: number }[]
) {
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  for (const line of lines) {
    const dr = Number(line.debit) || 0;
    const cr = Number(line.credit) || 0;
    const existing = await tx.accountbalance.findFirst({
      where: { gl_account_id: line.gl_account_id, period }
    });
    if (existing) {
      const newDr = Number(existing.debit_total) + dr;
      const newCr = Number(existing.credit_total) + cr;
      await tx.accountbalance.update({
        where: { acc_bal_id: existing.acc_bal_id },
        data: {
          debit_total: newDr,
          credit_total: newCr,
          closing_balance: Number(existing.opening_balance) + newDr - newCr,
        }
      });
    } else {
      // NEW PERIOD SETUP
      // 1. Calculate Previous Period
      const date = new Date();
      date.setMonth(date.getMonth() - 1);
      const prevPeriod = date.toISOString().slice(0, 7);

      // 2. Fetch Previous Period Closing Balance
      const prevBalance = await tx.accountbalance.findFirst({
        where: { gl_account_id: line.gl_account_id, period: prevPeriod }
      });

      const openingBal = prevBalance ? Number(prevBalance.closing_balance) : 0;

      // 3. Create New Period Record
      await tx.accountbalance.create({
        data: {
          gl_account_id: line.gl_account_id,
          period,
          opening_balance: openingBal,
          debit_total: dr,
          credit_total: cr,
          closing_balance: openingBal + dr - cr,
        }
      });
    }
  }
}

// ─────────────────────────────────────────────
// GENERAL LEDGER — all accounts with current balance
// ─────────────────────────────────────────────
static async getLedger() {
  const period = new Date().toISOString().slice(0, 7);
  const accounts = await prisma.glaccount.findMany({
    include: {
      accountbalance: { where: { period } },
      glaccount:      { select: { name: true, gl_account_code: true } }, // parent
    },
    orderBy: { gl_account_code: 'asc' }
  });
  return accounts.map(acc => ({
    gl_account_id:     acc.gl_account_id,
    gl_account_code:   acc.gl_account_code,
    name:              acc.name,
    type:              acc.type,
    parent_account_id: acc.parent_account_id,
    is_control_account: acc.is_control_account,
    parent_name:       (acc as any).glaccount?.name || null,
    balance: acc.accountbalance[0] ?? {
      opening_balance: 0, debit_total: 0, credit_total: 0, closing_balance: 0
    }
  }));
}

// ─────────────────────────────────────────────
// LEDGER LINES — journal lines for one GL account
// ─────────────────────────────────────────────
static async getLedgerLines(glAccountId: number) {
  const account = await prisma.glaccount.findUnique({ where: { gl_account_id: glAccountId } });
  const lines = await prisma.journalline.findMany({
    where: { gl_account_id: glAccountId },
    include: {
      journalentry: true,
      party: { select: { name: true } }
    },
    orderBy: { journalentry: { date: 'asc' } }
  });
  let runningBalance = 0;
  const linesWithBalance = lines.map(l => {
    runningBalance += Number(l.debit) - Number(l.credit);
    return {
      journal_line_id:  l.journal_line_id,
      date:             l.journalentry.date,
      journal_number:   l.journalentry.journal_number,
      journal_type:     l.journalentry.journal_type,
      narration:        l.journalentry.narration,
      party:            l.party?.name || null,
      debit:            Number(l.debit),
      credit:           Number(l.credit),
      running_balance:  runningBalance,
    };
  });
  return { account, lines: linesWithBalance };
}

// ─────────────────────────────────────────────
// ACCOUNT BALANCES — trial balance / balance sheet
// ─────────────────────────────────────────────
static async getAccountBalances() {
  const period = new Date().toISOString().slice(0, 7);
  const balances = await prisma.accountbalance.findMany({
    where: { period },
    include: {
      glaccount: {
        select: { name: true, gl_account_code: true, type: true, parent_account_id: true }
      }
    },
    orderBy: { glaccount: { gl_account_code: 'asc' } }
  });
  return balances.map(b => ({
    gl_account_id:   b.gl_account_id,
    code:            b.glaccount.gl_account_code,
    name:            b.glaccount.name,
    type:            b.glaccount.type,
    opening_balance: Number(b.opening_balance),
    debit_total:     Number(b.debit_total),
    credit_total:    Number(b.credit_total),
    closing_balance: Number(b.closing_balance),
    period:          b.period,
  }));
}

// ─────────────────────────────────────────────
// PAYMENT ALLOCATIONS
// ─────────────────────────────────────────────
static async getPaymentAllocations() {
  const allocs = await prisma.paymentallocation.findMany({
    include: {
      payment: { include: { party: { select: { name: true } } } },
      customerinvoice: { select: { cust_invoice_number: true, cust_inv_id: true, total_amount: true } },
      supplierinvoice: { select: { suppl_invoice_number: true, suppl_inv_id: true, total_amount: true } }
    },
    orderBy: { payment_allocation_id: 'desc' }
  });
  return allocs.map(a => ({
    allocation_id:     a.payment_allocation_id,
    payment_id:        a.payment_id,
    payment_number:    (a.payment as any).payment_number || `PMT-${a.payment_id}`,
    payment_type:      a.payment.payment_type,
    payment_method:    a.payment.method,
    payment_date:      a.payment.payment_date,
    party:             a.payment.party?.name || 'Unknown',
    allocated_amount:  Number(a.allocated_amount),
    remarks:           a.remarks,
    invoice_ref:       a.customerinvoice
      ? (a.customerinvoice.cust_invoice_number || `INV-${a.customerinvoice.cust_inv_id}`)
      : a.supplierinvoice
        ? (a.supplierinvoice.suppl_invoice_number || `SINV-${a.supplierinvoice.suppl_inv_id}`)
        : 'N/A',
    invoice_total:     a.customerinvoice
      ? Number(a.customerinvoice.total_amount)
      : a.supplierinvoice ? Number(a.supplierinvoice.total_amount) : 0,
  }));
}

// ─────────────────────────────────────────────
// ACCOUNTS DASHBOARD
// ─────────────────────────────────────────────
static async getAccountsDashboard() {
  const period = new Date().toISOString().slice(0, 7);

  const [arBal, apBal, cashBal, bankBal, recentJournals, pendingDeliveries, recentPayments] =
    await Promise.all([
      prisma.accountbalance.findFirst({ where: { gl_account_id: 13, period } }),
      prisma.accountbalance.findFirst({ where: { gl_account_id: 21, period } }),
      prisma.accountbalance.findFirst({ where: { gl_account_id: 11, period } }),
      prisma.accountbalance.findFirst({ where: { gl_account_id: 12, period } }),
      prisma.journalentry.findMany({
        take: 8, orderBy: { date: 'desc' },
        include: { journalline: { include: { glaccount: { select: { name: true } } } } }
      }),
      prisma.deliverynote.count({ where: { status: 'POSTED' } as any }),
      prisma.payment.findMany({
        take: 5, orderBy: { payment_date: 'desc' },
        include: { party: { select: { name: true } } }
      }),
    ]);

  const ar   = Number(arBal?.closing_balance   || 0);
  const ap   = Number(apBal?.closing_balance   || 0);
  const cash = Number(cashBal?.closing_balance || 0);
  const bank = Number(bankBal?.closing_balance || 0);

  return {
    stats: [
      { label: 'Accounts Receivable', value: `PKR ${ar.toLocaleString()}`,          change: 'This Month', trend: 'up'   },
      { label: 'Accounts Payable',    value: `PKR ${Math.abs(ap).toLocaleString()}`, change: 'This Month', trend: 'down' },
      { label: 'Cash Balance',        value: `PKR ${cash.toLocaleString()}`,         change: 'Available',  trend: 'up'   },
      { label: 'Bank Balance',        value: `PKR ${bank.toLocaleString()}`,         change: 'Available',  trend: 'up'   },
    ],
    transactions: recentJournals.map(j => ({
      id:     j.journal_number,
      party:  j.narration || j.journal_type,
      type:   j.journal_type,
      amount: j.journalline.reduce((s, l) => s + Number(l.debit), 0),
      status: 'POSTED',
    })),
    accounts: [
      { name: '1.1 Cash', type: 'Cash', balance: cash },
      { name: '1.2 Bank', type: 'Bank', balance: bank },
      { name: '1.3 AR',   type: 'Other', balance: ar  },
    ],
    urgentPayables:    Math.abs(ap),
    pendingDeliveries,
    recentPayments: recentPayments.map(p => ({
      id:     `PMT-${p.payment_id}`,
      party:  (p as any).party?.name || 'Unknown',
      type:   p.payment_type,
      amount: Number(p.amount),
      method: p.method,
      date:   p.payment_date,
    })),
  };
}

  // ─────────────────────────────────────────────
  // PARTY LEDGER SUMMARY
  // ─────────────────────────────────────────────
  static async getPartyLedgerSummary(type: 'CUSTOMER' | 'SUPPLIER') {
    const parties = await prisma.party.findMany({
      where: { type: type as any },
      include: {
        journalline: {
          select: { debit: true, credit: true }
        }
      }
    });

    return parties.map(p => {
      const balance = p.journalline.reduce((sum, l) => sum + (Number(l.debit) - Number(l.credit)), 0);
      return {
        id: p.party_id,
        name: p.name,
        email: p.email || "N/A",
        phone: p.phone || "N/A",
        totalBalance: balance, // For Customer
        totalDue: Math.abs(balance), // For Vendor
        lastActive: new Date().toLocaleDateString()
      };
    });
  }

  // ─────────────────────────────────────────────
  // PARTY LEDGER DETAILS
  // ─────────────────────────────────────────────
  static async getPartyLedgerDetails(partyId: string) {
    const lines = await prisma.journalline.findMany({
      where: { party_id_sub_ledger: partyId },
      include: { journalentry: true },
      orderBy: { journalentry: { date: 'asc' } }
    });

    // Batch-fetch invoice & payment refs for display
    const custInvIds  = lines.filter(l => l.journalentry.source_type === 'CUSTOMER_INVOICE').map(l => l.journalentry.source_id!);
    const supplInvIds = lines.filter(l => l.journalentry.source_type === 'SUPPLIER_INVOICE').map(l => l.journalentry.source_id!);
    const paymentIds  = lines.filter(l => l.journalentry.source_type === 'PAYMENT').map(l => l.journalentry.source_id!);

    const [custInvoices, supplInvoices, payments] = await Promise.all([
      custInvIds.length  ? prisma.customerinvoice.findMany({ where: { cust_inv_id:  { in: custInvIds  } }, select: { cust_inv_id: true, cust_invoice_number: true } }) : [],
      supplInvIds.length ? prisma.supplierinvoice.findMany({ where: { suppl_inv_id: { in: supplInvIds } }, select: { suppl_inv_id: true, suppl_invoice_number: true } }) : [],
      paymentIds.length  ? prisma.payment.findMany        ({ where: { payment_id:   { in: paymentIds  } }, select: { payment_id:  true, payment_number: true        } }) : [],
    ]);

    const custInvMap:  Record<number, string> = Object.fromEntries(custInvoices.map(i  => [i.cust_inv_id,  i.cust_invoice_number  || `INV-${i.cust_inv_id}`]));
    const supplInvMap: Record<number, string> = Object.fromEntries(supplInvoices.map(i => [i.suppl_inv_id, i.suppl_invoice_number || `SINV-${i.suppl_inv_id}`]));
    const paymentMap:  Record<number, string> = Object.fromEntries(payments.map(p      => [p.payment_id,  p.payment_number       || `PAY-${p.payment_id}`]));

    let runningBalance = 0;
    return lines.map(l => {
      const dr  = Number(l.debit)  || 0;
      const cr  = Number(l.credit) || 0;
      runningBalance += dr - cr;

      const src    = l.journalentry.source_type;
      const srcId  = l.journalentry.source_id!;
      const invRef = src === 'CUSTOMER_INVOICE' ? custInvMap[srcId]
                   : src === 'SUPPLIER_INVOICE' ? supplInvMap[srcId]
                   : src === 'PAYMENT'          ? paymentMap[srcId]
                   : null;

      return {
        id:          l.journalentry.journal_number,
        invoice_ref: invRef || null,
        date:        new Date(l.journalentry.date).toLocaleDateString('en-GB'),
        type:        l.journalentry.journal_type,
        description: l.journalentry.narration || l.journalentry.journal_type,
        debit:       dr,
        credit:      cr,
        balance:     runningBalance
      };
    });
  }
  // ─────────────────────────────────────────────
  // DASHBOARD MODULES (RECEIVABLES, PENDING, HISTORY)
  // ─────────────────────────────────────────────

  static async getReceivables() {
    const invoices = await prisma.customerinvoice.findMany({
      where: { status: 'POSTED' },
      include: { party: { select: { name: true } } },
      orderBy: { cust_inv_due_date: 'asc' }
    });

    const now = new Date();
    return invoices.map(inv => {
      const dueDate = inv.cust_inv_due_date ? new Date(inv.cust_inv_due_date) : now;
      const diffTime = now.getTime() - dueDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return {
        id: inv.cust_invoice_number || `INV-${inv.cust_inv_id}`,
        customer: inv.party?.name || 'Unknown',
        amount: Number(inv.total_amount || 0),
        dueDate: inv.cust_inv_due_date ? inv.cust_inv_due_date.toISOString().split('T')[0] : 'N/A',
        daysOverdue: diffDays > 0 ? diffDays : 0,
        status: diffDays > 15 ? 'Critical' : diffDays > 0 ? 'Pending' : 'Near Due'
      };
    });
  }

  static async getPendingPayments() {
    const payments = await prisma.payment.findMany({
      where: { payment_type: 'RECEIPT' },
      include: { 
        party: { select: { name: true } },
        paymentallocation: true
      },
      orderBy: { payment_date: 'desc' }
    });

    return payments
      .filter(p => (p.paymentallocation || []).length === 0)
      .map(p => ({
        id: p.payment_number || `PMT-${p.payment_id}`,
        customer: p.party?.name || 'Unknown',
        amount: Number(p.amount),
        method: p.method === 'CASH' ? 'Cash' : 'Bank Transfer',
        submittedDate: p.payment_date.toISOString().split('T')[0],
        referenceNo: p.reference_number || 'N/A',
        attachment: false
      }));
  }

  static async getPaymentHistory() {
    const payments = await prisma.payment.findMany({
      take: 50,
      orderBy: { payment_date: 'desc' },
      include: { party: { select: { name: true } } }
    });

    return payments.map(p => ({
      id: p.payment_number || `PMT-${p.payment_id}`,
      customer: p.party?.name || 'Unknown',
      amount: Number(p.amount),
      method: p.method === 'CASH' ? 'Cash' : 'Bank',
      date: p.payment_date.toISOString().split('T')[0],
      time: '12:00 PM', 
      status: 'Completed',
      ledgerImpact: p.payment_type === 'RECEIPT' ? 'Debit Cash/Bank' : 'Credit Cash/Bank'
    }));
  }
}

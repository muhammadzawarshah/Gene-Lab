import { prisma } from '../lib/prisma.js';

export class FinanceService {
  /**
   * FLOW C: Generate Invoice from Delivery Note
   */
  static async createInvoice(deliveryId: string) {
    return await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliverynote.findUnique({
        where: { delivery_number: deliveryId },
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

      return invoice;
    });
  }

    static async createInvoiceFromGRN(grnId: number) {

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

      /*
      ==========================
      CREATE SUPPLIER INVOICE
      ==========================
      */

      const invoice = await tx.supplierinvoice.create({
        data: {
          po_id: grn.po_id,
          party_id: grn.purchaseorder.party_id_supplier,
          suppl_invoice_date: new Date(),
          total_amount: grn.purchaseorder.total_amount,
          status: "POSTED"
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
            p => p.po_line_id === line.po_line_id
          );

          return {
            suppl_inv_id: invoice.suppl_inv_id,
            product_id: line.product_id,
            quantity: line.received_qty,
            unit_price: poLine?.unit_price || 0,
            line_total: Number(line.received_qty) * Number(poLine?.unit_price || 0)
          };

        }) as any
      });

      /*
      ==========================
      ACCOUNTING ENTRY
      ==========================
      */

      await tx.journalentry.create({
        data: {
          journal_number: `PINV-${invoice.suppl_inv_id}`,
          journal_type: "PURCHASE",
          date: new Date(),
          source_type: "INVOICE",
          source_id: invoice.suppl_inv_id,
          journalline: {
            create: [
              {
                gl_account_id: 5000,
                debit: invoice.total_amount,
                credit: 0
              },
              {
                gl_account_id: 2100,
                debit: 0,
                credit: invoice.total_amount
              }
            ]
          }
        }
      });

      return invoice;

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
    payment_date?: string // Date frontend se aayegi
  }) {
    const { amount, method, invoiceId, remarks, payment_date } = data;

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Fetch Invoice aur check karna ke wo exist karti hai
        const invoice = await tx.customerinvoice.findUnique({
          where: { cust_inv_id: Number(invoiceId) },
          select: { party_id_customer: true, total_amount: true }
        });

        if (!invoice) {
          throw new Error("Invoice reference not found in database.");
        }

        // 2. Create Payment Record (RECEIPT)
        const payment = await tx.payment.create({
          data: {
            party_id: invoice.party_id_customer,
            payment_date: payment_date ? new Date(payment_date) : new Date(),
            payment_type: 'RECEIPT',
            method: method || 'CASH', 
            amount: Number(amount),
            reference_number: `INV-${invoiceId}`,
            created_at: new Date(),
          }
        });

        // 3. Allocate Payment to Invoice
        await tx.paymentallocation.create({
          data: {
            payment_id: payment.payment_id,
            cust_inv_id: Number(invoiceId),
            allocated_amount: Number(amount),
            remarks: remarks || ""
          }
        });

        // 4. Update Invoice Status
        // Note: Yahan logic laga sakte hain ke agar partial payment hai to 'PARTIAL' status ho
        await tx.customerinvoice.update({
          where: { cust_inv_id: Number(invoiceId) },
          data: { status: 'PAID' }
        });

        return payment;
      });

      // Response hamesha controller handle karta hai, 
      // magar agar aap yahi se bhejna chahte hain to success return karein
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
  return prisma.customerinvoice.findMany();
}

static async specificinvoice(id: number) {
  try {
    return await prisma.customerinvoice.findUnique({
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
        }
      }
    });
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
    payment_date?: string 
  }) {
    const { amount, method, invoiceId, remarks, payment_date } = data;

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

        // 4. Update Supplier Invoice Status
        // Aapke enum mein 'PAID' aur 'PARTIAL' dono hain
        const newStatus = Number(amount) >= Number(invoice.total_amount) ? 'PAID' : 'PARTIAL';

        await tx.supplierinvoice.update({
          where: { suppl_inv_id: Number(invoiceId) },
          data: { status: newStatus as any } // Cast to any to match enum
        });

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

    return {
      success: true,
      data: formattedInvoices
    };

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
            addresses: true, // Supplier ka pata
          },
        },
        // 2. Invoice ke andar kaunse products hain (Line Items)
        supplierinvoiceline: {
          include: {
            product: {
              select: {
                name: true,
                sku_code: true,
              },
            },
            tax: true, // Tax details per line
          },
        },
        // 3. Is invoice par ab tak kitni payments hui hain
        paymentallocation: {
          include: {
            payment: true, // Payment method, date, aur ref number ke liye
          },
        },
        // 4. Purchase Order ki reference
        purchaseorder: true,
      },
    });

    if (!invoice) {
      throw new Error("Purchase Invoice not found.");
    }

    // Calculation for Total Paid and Balance
    const totalPaid = invoice.paymentallocation.reduce(
      (sum, alloc) => sum + Number(alloc.allocated_amount),
      0
    );

    const balanceDue = Number(invoice.total_amount) - totalPaid;

    return {
      success: true,
      data: {
        ...invoice,
        totalPaid,
        balanceDue,
      },
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
}
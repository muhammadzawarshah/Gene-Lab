// src/services/sales.service.ts
import { prisma } from '../lib/prisma.js';
import { ProductPriceService } from './productprice.service.js';


export class SalesService {
  static async createOrder(data: any) {
    // Validate effective dates for items that have price_type
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.price_type && item.product_id) {
          await ProductPriceService.getActivePrice(item.product_id, item.price_type);
        }
      }
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.salesorder.create({
        data: {
          party_id_customer: data.customerId,
          order_date: new Date(),
          status: 'DRAFT',
          total_amount: data.financials.netTotal
        } as any
      });

      // 2. Loop through lines and reserve stock
      for (const item of data.items) {
        // Atomic update with check: quantity_on_hand - reserved >= requested
        const stock = await tx.stockitem.findFirst({
          where: { product_id: item.product_id }
        });

        if (!stock || (Number(stock.quantity_on_hand) - Number(stock.reserved_quantity) < item.qty)) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        await tx.salesorderline.create({
          data: {
            so_id: order.so_id,
            product_id: item.product_id,
            quantity: item.total_unit,
            uom_id: Number(item.uomId) || 1,
            unit_price: item.approved_rate,
            line_total: item.amount,
            tax_id: data.financials?.taxId ? Number(data.financials.taxId) : null
          } as any
        });

        await tx.stockitem.update({
          where: { stock_item_id: stock.stock_item_id },
          data: { reserved_quantity: { increment: item.total_unit } }
        });
      }
      return order;
    });
  }

  static async createCusOrder(data: any) {
    return await prisma.$transaction(async (tx) => {

      const party = await tx.party.findFirst({
        where: {
          user_id: data.createdBy
        } as any
      });

      console.log(party);

      if (!party) {
        throw new Error(`Party not found for id ${data.createdBy}`);
      }

      const order = await tx.salesorder.create({
        data: {
          party_id_customer: party.party_id,
          order_date: new Date(),
          status: 'DRAFT',
          total_amount: data.totalAmount
        } as any
      });

      // 2. Loop through lines and reserve stock
      for (const item of data.items) {
        // Atomic update with check: quantity_on_hand - reserved >= requested
        const stock = await tx.stockitem.findFirst({
          where: { product_id: item.productId }
        });

        if (!stock || (Number(stock.quantity_on_hand) - Number(stock.reserved_quantity) < item.qty)) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }

        await tx.salesorderline.create({
          data: {
            so_id: order.so_id,
            product_id: item.productId,
            quantity: item.qty,
            uom_id: Number(item.uomId),
            unit_price: item.price,
            line_total: item.qty * item.price
          } as any
        });

        await tx.stockitem.update({
          where: { stock_item_id: stock.stock_item_id },
          data: { reserved_quantity: { increment: item.qty } }
        });
      }
      return order;
    });
  }

  static async listorder() {
    const orders = await prisma.salesorder.findMany({
      include: {

        party: {
          select: {
            name: true,
          }
        },

        salesorderline: {
          include: {
            product: { select: { name: true } },
            tax: { select: { name: true, rate: true, type: true } }
          }
        }
      },
      orderBy: { so_id: 'desc' }
    });

    return orders;
  }

  static async listcustorder(id: string) {

    const party = await prisma.party.findFirst({
      where: {
        user_id: Number(id)
      } as any
    })
    const orders = await prisma.salesorder.findMany({
      where: {
        party_id_customer: party?.party_id
      },
      include: {

        party: {
          select: {
            name: true,
          }
        },

        salesorderline: {
          include: {
            product: { select: { name: true } },
            tax: { select: { name: true, rate: true, type: true } }
          }
        }
      },
      orderBy: { so_id: 'desc' }
    });

    return orders;
  }

  static async getDashboardOverview(userId: string) {
    // 1. Find the Party ID associated with the User
    const party = await prisma.party.findFirst({
      where: { user_id: Number(userId) }
    } as any);

    if (!party) throw new Error(`Party not found for User ID ${userId}`);

    // 2. Parallel queries for efficiency
    const [activeOrdersCount, totalSpent, orders] = await Promise.all([
      // Count Draft/Pending orders
      prisma.salesorder.count({
        where: { party_id_customer: party.party_id, status: 'DRAFT' }
      }),
      // Sum of all orders for credit calculation
      prisma.salesorder.aggregate({
        where: { party_id_customer: party.party_id },
        _sum: { total_amount: true }
      }),
      // Last 7 days trend
      prisma.salesorder.findMany({
        where: { party_id_customer: party.party_id },
        select: { total_amount: true, order_date: true },
        orderBy: { order_date: 'desc' },
        take: 7
      })
    ]);

    // 3. Mock data mapping to match your UI structure
    // In a real app, you'd calculate growth and credit from actual payment/limit tables
    return {
      stats: {
        activeOrders: activeOrdersCount.toString(),
        pendingInvoices: "2",
        creditUsedPercentage: 35,
        monthlyGrowth: "+12.5%"
      },
      procurementTrend: orders.length > 0 ? orders.map(o => Number(o.total_amount) / 1000).reverse() : [0, 0, 0, 0, 0, 0, 0],
      recentShipments: [
        { id: "SHP-1092", status: "In Transit", eta: "Tomorrow" },
        { id: "SHP-1088", status: "Processing", eta: "3 Days" }
      ],
      alerts: [
        { id: "AL-1", message: "CREDIT UTILIZATION AT 35%", subtext: "Safe zone active" }
      ],
      creditDetails: {
        used: (totalSpent._sum.total_amount || 0).toLocaleString(),
        total: "1,000,000"
      }
    };
  }

  // Add this to your SalesService class
  static async getFinancialLedger(userId: string) {
    const party = await prisma.party.findFirst({
      where: { user_id: Number(userId) }
    } as any);

    if (!party) throw new Error("Financial identity not found");

    // Get all orders for this customer to calculate balances
    const orders = await prisma.salesorder.findMany({
      where: { party_id_customer: party.party_id },
      orderBy: { order_date: 'desc' },
      take: 10
    });

    const totalOutstanding = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    // Example mapping for the UI
    return {
      summary: {
        total: totalOutstanding.toLocaleString(),
        invoiced: (totalOutstanding * 0.7).toLocaleString(), // Logic based on your Invoice table
        delivered: (totalOutstanding * 0.3).toLocaleString(), // Logic based on Delivery status
        growth: "+4.2%"
      },
      history: orders.map(o => ({
        id: `TXN-${o.so_id}`,
        date: new Date(o.order_date).toLocaleDateString(),
        amount: `PKR ${Number(o.total_amount).toLocaleString()}`,
        status: o.status === 'DRAFT' ? "Pending Invoice" : "Invoiced",
        type: "Sale"
      }))
    };
  }

  static async getBillingSyncStatus(userId: string) {

    const party = await prisma.party.findFirst({
      where: { user_id: Number(userId) } as any
    });

    if (!party) throw new Error("PARTY_NOT_FOUND");


    const deliveries = await prisma.deliverynote.findMany({
      where: {
        salesorder: {
          party_id_customer: party.party_id
        }
      } as any,
      include: {
        salesorder: {
          include: {
            customerinvoice: true,
            salesorderline: true
          }
        },
        deliverynoteline: {
          include: {
            product: true
          }
        }
      },
      orderBy: { delv_date: 'desc' }
    });


    const logs = deliveries.map((dn: any) => {
      const invoices = dn.salesorder?.customerinvoice || [];
      const linkedInvoice = invoices.length > 0 ? invoices[0] : null;

      const valuation = dn.deliverynoteline?.reduce((total: number, line: any) => {
        const soLine = dn.salesorder?.salesorderline?.find(
          (sol: any) => sol.product_id === line.product_id
        );
        const price = soLine ? Number(soLine.unit_price) : 0;
        return total + (Number(line.delivered_qty) * price);
      }, 0) || 0;

      return {
        deliveryId: dn.delivery_number,
        id: linkedInvoice ? linkedInvoice.cust_invoice_number : "PENDING",
        items: dn.deliverynoteline?.[0]?.product?.name || "General Material",
        date: dn.delv_date ? new Date(dn.delv_date).toISOString().split('T')[0] : "N/A",
        amount: `PKR ${valuation.toLocaleString()}`,
        status: linkedInvoice ? "Invoiced" : "Pending Sync"
      };
    });

    return {
      logs,
      metrics: {
        fullyInvoiced: logs.filter(l => l.id !== "PENDING").length,
        pending: logs.filter(l => l.id === "PENDING").length,
        disputed: 0
      }
    };
  }

  static async updateOrder(orderId: number, data: any) {
    return await prisma.$transaction(async (tx) => {

      // 1. Check if Order exists
      const existingOrder = await tx.salesorder.findUnique({
        where: { so_id: Number(orderId) },
        include: { salesorderline: true }
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }


      await tx.salesorder.update({
        where: { so_id: Number(orderId) },
        data: {
          status: data.status ?? existingOrder.status,
          total_amount: data.financials?.netTotal ? parseFloat(data.financials.netTotal) : existingOrder.total_amount
        }
      });


      if (data.items && Array.isArray(data.items)) {

        for (const item of data.items) {

          // Mapping frontend keys to database fields
          const currentProductId = item.product_id;
          const newQty = Number(item.total_unit);
          const newPrice = Number(item.approved_rate);

          const existingLine = existingOrder.salesorderline.find(
            (l) => l.product_id === currentProductId
          );

          // Stock check logic
          const stock = await tx.stockitem.findFirst({
            where: { product_id: currentProductId }
          });

          if (!stock) {
            throw new Error(`Stock not found for product ${currentProductId}`);
          }

          const oldQty = existingLine ? Number(existingLine.quantity) : 0;
          const qtyDiff = newQty - oldQty;

          // Agar quantity barh rahi hai to stock check karo
          if (qtyDiff > 0) {
            const available = Number(stock.quantity_on_hand) - Number(stock.reserved_quantity);
            if (available < qtyDiff) {
              throw new Error(`Insufficient stock for product ${currentProductId}. Available: ${available}, Required additional: ${qtyDiff}`);
            }
          }

          // Update or Create Line
          if (existingLine) {
            await tx.salesorderline.update({
              where: { so_line_id: existingLine.so_line_id },
              data: {
                quantity: newQty,
                unit_price: newPrice,
                line_total: newQty * newPrice
              }
            });
          } else {
            await tx.salesorderline.create({
              data: {
                so_id: Number(orderId),
                product_id: currentProductId,
                quantity: newQty,
                uom_id: Number(item.uom_id) || 1,
                unit_price: newPrice,
                line_total: newQty * newPrice
              }
            });
          }

          // 4. Update Reserved Stock
          if (qtyDiff !== 0) {
            await tx.stockitem.update({
              where: { stock_item_id: stock.stock_item_id },
              data: {
                reserved_quantity: {
                  increment: qtyDiff
                }
              }
            });
          }
        }
      }

      return { success: true, message: "Order updated successfully" };
    });
  }

  // Specific Sales Order Detail fetch karne ke liye function
  static async getSalesOrderById(id: string) {
    try {
      const order = await prisma.salesorder.findUnique({
        where: {
          so_id: Number(id)
        },
        include: {
          // 1. Customer (Party) details
          party: {
            select: {
              party_id: true,
              name: true,
              phone: true
            }
          },
          // 2. Order Lines (Items) details
          salesorderline: {
            include: {
              product: {
                select: {
                  name: true,
                  uom: true // Agar product ke saath UOM linked hai
                }
              }
            }
          }
        }
      });

      if (!order) {
        throw new Error(`Sales Order with ID ${id} not found.`);
      }

      return order;
    } catch (error: any) {
      console.error("Error in getSalesOrderById:", error.message);
      throw error;
    }
  }

}
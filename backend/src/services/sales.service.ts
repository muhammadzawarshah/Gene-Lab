// src/services/sales.service.ts
import { prisma } from '../lib/prisma.js';
import { ProductPriceService } from './productprice.service.js';


export class SalesService {
  private static parseOptionalNumber(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private static async getOrderProductDefaults(
    tx: any,
    productIds: string[]
  ): Promise<Map<string, { uom_id: number; sale_price: number; purchase_price: number }>> {
    if (!productIds.length) {
      return new Map<string, { uom_id: number; sale_price: number; purchase_price: number }>();
    }

    const products = await tx.product.findMany({
      where: {
        product_id: { in: productIds }
      },
      select: {
        product_id: true,
        uom_id: true,
        productprice: {
          where: { effective_to: null },
          orderBy: { effective_from: 'desc' },
          take: 1,
          select: { unit_price: true }
        },
        grnline: {
          where: {
            OR: [
              { sale_price: { not: null } },
              { purchase_price: { not: null } }
            ]
          },
          orderBy: { grn_line_id: 'desc' },
          take: 1,
          select: {
            sale_price: true,
            purchase_price: true
          }
        }
      }
    });

    return new Map<string, { uom_id: number; sale_price: number; purchase_price: number }>(
      products.map((product: any) => {
        const latestGrnLine = product.grnline?.[0];
        const activePrice = product.productprice?.[0];

        return [
          product.product_id,
          {
            uom_id: Number(product.uom_id),
            sale_price: latestGrnLine?.sale_price !== null && latestGrnLine?.sale_price !== undefined
              ? Number(latestGrnLine.sale_price)
              : Number(activePrice?.unit_price || 0),
            purchase_price: latestGrnLine?.purchase_price !== null && latestGrnLine?.purchase_price !== undefined
              ? Number(latestGrnLine.purchase_price)
              : 0
          }
        ];
      })
    );
  }

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
      const itemProductIds = Array.from(
        new Set(
          (data.items || [])
            .map((item: any) => item.product_id || item.productId)
            .filter(Boolean)
        )
      ) as string[];
      const productDefaults = await SalesService.getOrderProductDefaults(tx, itemProductIds);

      // 1. Create Order
      const order = await tx.salesorder.create({
        data: {
          party_id_customer: data.customerId,
          order_date: new Date(),
          status: 'DRAFT',
          total_amount: data.financials.netTotal
        } as any
      });

      // 2. Loop through lines
      for (const item of data.items) {
        const productId = item.product_id || item.productId;
        const quantity = Number(item.total_unit || item.qty || item.quantity || 0);
        const defaults = productDefaults.get(productId);
        const salePrice = SalesService.parseOptionalNumber(item.sale_price ?? item.approved_rate) ?? defaults?.sale_price ?? 0;
        const purchasePrice = SalesService.parseOptionalNumber(item.purchase_price);
        const lineTotal = SalesService.parseOptionalNumber(item.amount) ?? (quantity * salePrice);

        await tx.salesorderline.create({
          data: {
            so_id: order.so_id,
            product_id: productId,
            quantity: quantity,
            uom_id: Number(item.uomId || item.uom_id || defaults?.uom_id) || 1,
            unit_price: salePrice,
            line_total: lineTotal,
            tax_id: data.financials?.taxId ? Number(data.financials.taxId) : null,
            sale_price: salePrice,
            purchase_price: purchasePrice,
            batch_id: null,
          } as any
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

      // 2. Loop through lines
      for (const item of data.items) {
        const quantity = Number(item.qty || item.quantity || 0);

        await tx.salesorderline.create({
          data: {
            so_id: order.so_id,
            product_id: item.productId,
            quantity: quantity,
            uom_id: Number(item.uomId),
            unit_price: item.price,
            line_total: quantity * item.price,
            batch_id: null
          } as any
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
    });

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

  // ─── Distribution Manager Dashboard ────────────────────────────────────────
  // Yeh function Distribution Manager ke main dashboard ke liye real DB data
  // return karta hai - koi bhi static/mock values nahi hain.
  static async getDistributorManagerDashboard() {

    const [
      totalOrdersCount,
      revenueAggregate,
      pendingInvoicesCount,
      allStockItems,
      recentSalesOrders,
      recentDeliveries,
    ] = await Promise.all([
      // Total active orders (DRAFT + APPROVED + PARTIAL)
      prisma.salesorder.count({
        where: { status: { in: ['DRAFT', 'APPROVED', 'PARTIAL'] } },
      }),

      // Total revenue: sum of all sales orders
      prisma.salesorder.aggregate({
        _sum: { total_amount: true },
      }),

      // Pending invoices: DRAFT or POSTED (not yet fully PAID)
      prisma.customerinvoice.count({
        where: { status: { in: ['DRAFT', 'POSTED'] } },
      }),

      // Stock items with reorder_point set (to compute low stock in JS)
      prisma.stockitem.findMany({
        where: {
          AND: [
            { reorder_point: { not: null } },
            { quantity_on_hand: { not: null } },
          ],
        },
        select: { quantity_on_hand: true, reorder_point: true },
      }),

      // Recent 5 sales orders for activity feed
      prisma.salesorder.findMany({
        take: 5,
        orderBy: { so_id: 'desc' },
        include: {
          party: { select: { name: true } },
        },
      }),

      // Recent 3 deliveries for activity feed
      prisma.deliverynote.findMany({
        take: 3,
        orderBy: { delv_note_id: 'desc' },
        select: {
          delivery_number: true,
          delv_date: true,
          status: true,
        },
      }),
    ]);

    // Low stock count: qty_on_hand <= reorder_point
    // Prisma doesn't support column-to-column comparisons so we do it in JS
    const lowStockCount = allStockItems.filter(
      (item) =>
        item.quantity_on_hand !== null &&
        item.reorder_point !== null &&
        Number(item.quantity_on_hand) <= Number(item.reorder_point)
    ).length;

    // Build activity feed
    const activityFeed: { action: string; timestamp: string; refId: string }[] = [];

    for (const order of recentSalesOrders) {
      activityFeed.push({
        action: `Sales Order — ${order.party?.name || 'Customer'}`,
        timestamp: new Date(order.order_date).toLocaleDateString('en-PK'),
        refId: `SO-${order.so_id}`,
      });
    }

    for (const delivery of recentDeliveries) {
      activityFeed.push({
        action: `Delivery ${delivery.status || 'Processed'} — ${delivery.delivery_number || ''}`,
        timestamp: new Date(delivery.delv_date).toLocaleDateString('en-PK'),
        refId: delivery.delivery_number || `DN-unknown`,
      });
    }

    // Sort newest first (by refId descending as a simple proxy)
    activityFeed.sort((a, b) => b.refId.localeCompare(a.refId));

    return {
      revenue: Number(revenueAggregate._sum.total_amount || 0),
      totalOrders: totalOrdersCount,
      pendingInvoices: pendingInvoicesCount,
      lowStock: lowStockCount,
      recentActivity: activityFeed.slice(0, 6),
    };
  }

  // ─── Customer / Distributor Party-Level Dashboard ──────────────────────────
  static async getDashboardOverview(userId: string) {
    const party = await prisma.party.findFirst({
      where: { user_id: Number(userId) }
    } as any);

    if (!party) throw new Error(`Party not found for User ID ${userId}`);

    const [activeOrdersCount, totalSpent, orders] = await Promise.all([
      prisma.salesorder.count({
        where: { party_id_customer: party.party_id, status: 'DRAFT' }
      }),
      prisma.salesorder.aggregate({
        where: { party_id_customer: party.party_id },
        _sum: { total_amount: true }
      }),
      prisma.salesorder.findMany({
        where: { party_id_customer: party.party_id },
        select: { total_amount: true, order_date: true },
        orderBy: { order_date: 'desc' },
        take: 7
      })
    ]);

    return {
      stats: {
        activeOrders: activeOrdersCount.toString(),
        pendingInvoices: "2",
        creditUsedPercentage: 35,
        monthlyGrowth: "+12.5%"
      },
      procurementTrend: orders.length > 0
        ? orders.map(o => Number(o.total_amount) / 1000).reverse()
        : [0, 0, 0, 0, 0, 0, 0],
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

  // ─── Financial Ledger ───────────────────────────────────────────────────────
  static async getFinancialLedger(userId: string) {
    const party = await prisma.party.findFirst({
      where: { user_id: Number(userId) }
    } as any);

    if (!party) throw new Error("Financial identity not found");

    const orders = await prisma.salesorder.findMany({
      where: { party_id_customer: party.party_id },
      orderBy: { order_date: 'desc' },
      take: 10
    });

    const totalOutstanding = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    return {
      summary: {
        total: totalOutstanding.toLocaleString(),
        invoiced: (totalOutstanding * 0.7).toLocaleString(),
        delivered: (totalOutstanding * 0.3).toLocaleString(),
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

  // ─── Billing Sync Status ────────────────────────────────────────────────────
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

  // ─── Update Order ───────────────────────────────────────────────────────────
  static async updateOrder(orderId: number, data: any) {
    return await prisma.$transaction(async (tx) => {
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
          total_amount: data.financials?.netTotal
            ? parseFloat(data.financials.netTotal)
            : existingOrder.total_amount
        }
      });

      if (data.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const currentProductId = item.product_id || item.productId;
          const newQty = Number(item.total_unit);
          const newPrice = Number(item.approved_rate);

          const existingLine = existingOrder.salesorderline.find(
            (l) => l.product_id === currentProductId
          );

          if (existingLine) {
            await tx.salesorderline.update({
              where: { so_line_id: existingLine.so_line_id },
              data: {
                quantity: newQty,
                unit_price: newPrice,
                line_total: newQty * newPrice,
                batch_id: null
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
                line_total: newQty * newPrice,
                batch_id: null
              }
            });
          }
        }
      }

      return { success: true, message: "Order updated successfully" };
    });
  }

  // ─── Get Specific Sales Order ───────────────────────────────────────────────
  static async getSalesOrderById(id: string) {
    try {
      const order = await prisma.salesorder.findUnique({
        where: {
          so_id: Number(id)
        },
        include: {
          party: {
            select: {
              party_id: true,
              name: true,
              phone: true
            }
          },
          salesorderline: {
            include: {
              product: {
                select: {
                  name: true,
                  uom: true
                }
              },
              batch: {
                select: {
                  batch_id: true,
                  batch_number: true
                }
              },
              deliverynoteline: {
                select: {
                  delivered_qty: true
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

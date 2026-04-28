import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid'; // UUID generate karne ke liye

const HSN_PREFIXES = ['R', 'P', 'A', 'N', 'C'] as const;
const CODE_DIGITS = 4;
type ProductDbClient = typeof prisma | any;

export class ProductService {
  private static async attachLatestPricingDefaults<T extends { product_id: string; productprice?: Array<{ unit_price: any }> }>(
    products: T[]
  ) {
    if (!products.length) {
      return products;
    }

    const productIds = products.map((product) => product.product_id);
    const latestGrnLines = await prisma.grnline.findMany({
      where: {
        product_id: { in: productIds },
        OR: [
          { sale_price: { not: null } },
          { purchase_price: { not: null } }
        ]
      },
      orderBy: { grn_line_id: 'desc' },
      select: {
        product_id: true,
        sale_price: true,
        purchase_price: true
      }
    });

    const latestPriceMap = new Map<string, { sale_price: number | null; purchase_price: number | null }>();
    for (const line of latestGrnLines) {
      if (!latestPriceMap.has(line.product_id)) {
        latestPriceMap.set(line.product_id, {
          sale_price: line.sale_price !== null ? Number(line.sale_price) : null,
          purchase_price: line.purchase_price !== null ? Number(line.purchase_price) : null
        });
      }
    }

    return products.map((product) => {
      const latestPricing = latestPriceMap.get(product.product_id);
      const fallbackSalePrice = Array.isArray(product.productprice) && product.productprice.length > 0
        ? Number(product.productprice[0]?.unit_price || 0)
        : 0;

      return {
        ...product,
        default_sale_price: latestPricing?.sale_price ?? fallbackSalePrice,
        default_purchase_price: latestPricing?.purchase_price ?? 0,
        latest_grn_sale_price: latestPricing?.sale_price ?? null,
        latest_grn_purchase_price: latestPricing?.purchase_price ?? null
      };
    });
  }

  private static async generateNextSkuCode(db: ProductDbClient) {
    const products = await db.product.findMany({
      select: { sku_code: true }
    });

    const maxSku = products.reduce((max, product) => {
      const value = Number.parseInt(product.sku_code || '', 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    return String(maxSku + 1).padStart(CODE_DIGITS, '0');
  }

  private static normalizeHsnPrefix(rawValue: unknown) {
    const value = String(rawValue || '').trim().toUpperCase();
    return HSN_PREFIXES.includes(value as typeof HSN_PREFIXES[number]) ? value : null;
  }

  private static async generateNextHsnCode(prefix: string, db: ProductDbClient) {
    const products = await db.product.findMany({
      where: {
        hsn_code: {
          startsWith: `${prefix}-`
        }
      },
      select: { hsn_code: true }
    });

    const maxCode = products.reduce((max, product) => {
      const numericPart = Number.parseInt((product.hsn_code || '').split('-')[1] || '', 10);
      return Number.isFinite(numericPart) ? Math.max(max, numericPart) : max;
    }, 0);

    return `${prefix}-${String(maxCode + 1).padStart(CODE_DIGITS, '0')}`;
  }

  static async getNextCodes(rawPrefix: unknown) {
    const hsnPrefix = ProductService.normalizeHsnPrefix(rawPrefix);

    if (!hsnPrefix) {
      throw new Error('Valid HSN prefix is required');
    }

    const [skuCode, hsnCode] = await Promise.all([
      ProductService.generateNextSkuCode(prisma),
      ProductService.generateNextHsnCode(hsnPrefix, prisma)
    ]);

    return { skuCode, hsnCode };
  }

  // 1. Create Product
  static async createProduct(data: any) {
    const hsnPrefix = ProductService.normalizeHsnPrefix(data.hsn_prefix || data.hsnCode || data.hsn_code);

    if (!data.name?.trim()) {
      throw new Error('Product name is required');
    }

    if (!data.unit_id) {
      throw new Error('UOM is required');
    }

    if (!hsnPrefix) {
      throw new Error('Valid HSN prefix is required');
    }

    return await prisma.$transaction(async (tx) => {
      const finalProductId = data.productId || uuidv4();
      const skuCode = await ProductService.generateNextSkuCode(tx);
      const hsnCode = await ProductService.generateNextHsnCode(hsnPrefix, tx);

      return await tx.product.create({
        data: {
          product_id: finalProductId,
          sku_code: skuCode,
          name: data.name.trim(),
          description: data.description || null,
          product_cat_id: data.category_id ? parseInt(data.category_id, 10) : null,
          uom_id: parseInt(data.unit_id, 10),
          hsn_code: hsnCode,
          brand: data.brand_name || data.brand || null,
          mode_id: data.mode_id ? parseInt(data.mode_id, 10) : null,
          min_stock: data.min_stock ? Number(data.min_stock) : null,
          max_stock: data.max_stock ? Number(data.max_stock) : null,
          productprice: {
            create: [
              {
                price_type: 'RETAIL',
                unit_price: Number(data.product_price || 0),
                currency: 'PKR',
                uom_id: parseInt(data.unit_id, 10),
                effective_from: new Date(),
              } as any
            ]
          }
        }
      });
    });
  }

  // 2. Get All Products with Details
  static async getAllProducts() {
    const products = await prisma.product.findMany({
      include: {
        uom: true,
        productcategory: true,
        productmode: true,
        productprice: true, // Yeh automatically saari prices le ayega har product ke liye
        _count: {
          select: { stockitem: true }
        }
      }
    });

    return ProductService.attachLatestPricingDefaults(products as any);
  }

  // 3. Get Product by ID
  static async getProductById(id: string) {
    const product = await prisma.product.findUnique({
      where: { product_id: id },
      include: {
        uom: true,
        productcategory: true,
        productmode: true,
        productprice: {
          where: { effective_to: null }
        },
        batchitem: { include: { batch: true } }
      }
    });

    if (!product) {
      return null;
    }

    const [enrichedProduct] = await ProductService.attachLatestPricingDefaults([product as any]);
    return enrichedProduct;
  }

  static async getProductcategory(id: string) {
    const products = await prisma.product.findMany(
      {
        where: {
          product_cat_id: Number(id)
        },
        include: {
          uom: true,
          productcategory: true,
          productprice: {
            where: { effective_to: null }
          },
          batchitem: { include: { batch: true } },
          stockitem: { select: { quantity_on_hand: true } }
        }
      }
    );

    const enrichedProducts = await ProductService.attachLatestPricingDefaults(products as any);
    return enrichedProducts.map((p: any) => ({
      ...p,
      current_stock: p.stockitem?.reduce((sum: number, s: any) => sum + Number(s.quantity_on_hand || 0), 0) || 0
    }));
  }

  // 4. Update Product
  static async updateProduct(id: string, data: any) {
    return await prisma.$transaction(async (tx) => {
      const existingProduct = await tx.product.findUnique({
        where: { product_id: id }
      });

      if (!existingProduct) {
        throw new Error('Product not found');
      }

      const requestedPrefix = ProductService.normalizeHsnPrefix(
        data.hsnPrefix || data.hsnCode || data.hsn_code
      );
      const currentPrefix = ProductService.normalizeHsnPrefix(existingProduct.hsn_code);

      let hsnCode = existingProduct.hsn_code;
      if (requestedPrefix && requestedPrefix !== currentPrefix) {
        hsnCode = await ProductService.generateNextHsnCode(requestedPrefix, tx);
      }

      return await tx.product.update({
        where: { product_id: id },
        data: {
          name: data.name ?? existingProduct.name,
          description: data.description ?? existingProduct.description,
          product_cat_id: data.categoryId !== undefined && data.categoryId !== ''
            ? Number(data.categoryId)
            : null,
          uom_id: data.uomId ? Number(data.uomId) : existingProduct.uom_id,
          mode_id: data.modeId !== undefined
            ? (data.modeId !== '' ? Number(data.modeId) : null)
            : existingProduct.mode_id,
          hsn_code: hsnCode,
          brand: data.brand ?? existingProduct.brand,
        }
      });
    });
  }

  static async getExpiredStock() {
    const today = new Date();

    return await prisma.grnline.findMany({
      where: {
        expiry_date: {
          lt: today, // Less than today (Expired)
          not: null  // Unhein ignore karein jahan date nahi hai
        }
      },
      include: {
        product: {
          select: {
            name: true,
            sku_code: true,
            brand: true
          }
        },
        batch: {
          select: {
            batch_number: true, // Assuming batch_number field exists in your batch model
            manufacturing_date: true
          }
        },
        grn: {
          select: {
            grn_number: true,
            received_date: true
          }
        }
      },
      orderBy: {
        expiry_date: 'asc' // Sabse purani expiry pehle dikhayen
      }
    });
  }

  // Low Stock Products — stockitem.qty_on_hand <= product.min_stock
  static async getLowStockProducts() {
    const products = await prisma.product.findMany({
      where: {
        min_stock: { not: null },
      },
      include: {
        stockitem: {
          select: { quantity_on_hand: true },
        },
      },
    });

    return products
      .filter((p) => {
        const totalStock = p.stockitem.reduce(
          (sum, s) => sum + Number(s.quantity_on_hand || 0),
          0
        );
        return totalStock <= Number(p.min_stock);
      })
      .map((p) => ({
        product_id: p.product_id,
        name: p.name,
        sku_code: p.sku_code,
        min_stock: Number(p.min_stock),
        max_stock: p.max_stock !== null ? Number(p.max_stock) : null,
        current_stock: p.stockitem.reduce(
          (sum, s) => sum + Number(s.quantity_on_hand || 0),
          0
        ),
      }));
  }

  // 5. Delete Product (Check logic included)
  static async deleteProduct(id: string) {
    return await prisma.$transaction(async (tx) => {
      // Delete productprice first (NoAction FK)
      await tx.productprice.deleteMany({ where: { product_id: id } });
      return await tx.product.delete({ where: { product_id: id } });
    });
  }
}

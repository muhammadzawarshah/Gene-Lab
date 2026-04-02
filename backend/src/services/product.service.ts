import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid'; // UUID generate karne ke liye

export class ProductService {
  // 1. Create Product
  static async createProduct(data: any) {
    // Batch find karne ka logic
    const batchc = await prisma.batch.findFirst({
      where: {
        batch_number: data.batch_number
      }
    });

    // Product ID generate karna agar nahi hai
    const finalProductId = data.productId || uuidv4();

    return await prisma.product.create({
      data: {
        product_id: finalProductId,
        sku_code: data.sku,
        name: data.name,
        description: data.description,
        product_cat_id: data.category_id ? parseInt(data.category_id) : null,
        uom_id: parseInt(data.unit_id),
        hsn_code: data.hsn_code,
        brand: data.brand_name,

        // Nested Product Price Creation
        productprice: {
          create: [
            {
              price_type: 'RETAIL',
              unit_price: data.product_price,
              currency: 'PKR',
              uom_id: parseInt(data.unit_id),
              effective_from: new Date(),
            } as any
          ]
        }
      }
    });
  }

  // 2. Get All Products with Details
  static async getAllProducts() {
    const products = await prisma.product.findMany({
      include: {
        uom: true,
        productcategory: true,
        productprice: true, // Yeh automatically saari prices le ayega har product ke liye
        _count: {
          select: { stockitem: true }
        }
      }
    });

    return products;
  }

  // 3. Get Product by ID
  static async getProductById(id: string) {
    return await prisma.product.findUnique({
      where: { product_id: id },
      include: {
        uom: true,
        productcategory: true,
        productprice: {
          where: { effective_to: null }
        },
        batchitem: { include: { batch: true } }
      }
    });
  }

  static async getProductcategory(id: string) {
    return await prisma.product.findMany(
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
          batchitem: { include: { batch: true } }
        }
      }
    )
  }

  // 4. Update Product
  static async updateProduct(id: string, data: any) {
    return await prisma.product.update({
      where: { product_id: id },
      data: {
        sku_code: data.skuCode,
        name: data.name,
        description: data.description,
        product_cat_id: data.categoryId,
        uom_id: data.uomId,
        hsn_code: data.hsnCode,
        brand: data.brand,
      }
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

  // 5. Delete Product (Check logic included)
  static async deleteProduct(id: string) {
    return await prisma.$transaction(async (tx) => {
      // Delete productprice first (NoAction FK)
      await tx.productprice.deleteMany({ where: { product_id: id } });
      return await tx.product.delete({ where: { product_id: id } });
    });
  }
}
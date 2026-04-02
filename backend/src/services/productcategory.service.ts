import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid'; 

export class ProductCategoryService {
  
  static async createCategory(data: any) {
    console.log(data);
    return await prisma.productcategory.create({
      data: { 
        category: data.category,
        description: data.description
      } as any
    });
  }

  // 2. Get All Products with Details
    static async getAllProductcategory() {
    const prodcategory = await prisma.productcategory.findMany();

      return prodcategory;
    }


  static async getProductcategoryById(id: string) {
    return await prisma.productcategory.findUnique({
      where: { product_category_id: Number(id) }
    });
  }

 
  static async updateProductcategory(id: string, data: any) {
    return await prisma.productcategory.update({
      where: { product_category_id: Number(id)},
      data: {
        category: data.category,
        description: data.description
      }
    });
  }

  
  static async deleteProductcategory(id: string) {
  
    return await prisma.productcategory.delete({
      where: { product_category_id: Number(id) }
    });
  }
}
import { Request, Response } from 'express';
import { ProductService } from '../../services/product.service.js';

export class ProductController {
  static async create(req: Request, res: Response) {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  static async list(req: Request, res: Response) {
    try {
      const products = await ProductService.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getOne(req: Request, res: Response) {
    try {
      const product = await ProductService.getProductById(req.params.id as any);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getExpiredReport(req: Request, res: Response) {
    try {
        const data = await ProductService.getExpiredStock();
        
        const formatted = data.map(item => ({
            id: item.grn_line_id,
            productName: item.product.name,
            sku: item.product.sku_code,
            batch: item.batch?.batch_number || "No Batch",
            qty: item.received_qty,
            expiryDate: item.expiry_date,
            grnRef: item.grn.grn_number
        }));

        res.json({ success: true, data: formatted });
    } catch (e) {
        res.status(500).json({ success: false, error: "Report generation failed" });
    }
}

  static async getproductoncategory(req:Request,res:Response){
    try {
      console.log(req.params.id);
      const product = await ProductService.getProductcategory(req.params.id as any);
      if (!product) return res.status(404).json({ message: "Products not found on category" });
      res.status(200).json(product);
    } catch (error : any) {
      console.log(error)
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
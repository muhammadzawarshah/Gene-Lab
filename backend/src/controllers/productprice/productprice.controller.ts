import { Request, Response } from 'express';
import { ProductPriceService } from '../../services/productprice.service.js';

export class ProductPriceController {

    // GET /api/v1/productprice
    static async list(req: Request, res: Response) {
        try {
            const prices = await ProductPriceService.getAllProductPrices();
            res.status(200).json({ success: true, data: prices });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/v1/productprice/product/:productId
    static async listByProduct(req: Request, res: Response) {
        try {
            const prices = await ProductPriceService.getPricesByProductId(req.params.productId as string);
            res.status(200).json({ success: true, data: prices });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/v1/productprice/:id
    static async getOne(req: Request, res: Response) {
        try {
            const price = await ProductPriceService.getProductPriceById(parseInt(req.params.id as string));
            if (!price) return res.status(404).json({ success: false, message: 'Product price not found' });
            res.status(200).json({ success: true, data: price });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // POST /api/v1/productprice
    static async create(req: Request, res: Response) {
        try {
            const price = await ProductPriceService.createProductPrice(req.body);
            res.status(201).json({ success: true, data: price });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // PUT /api/v1/productprice/:id
    static async update(req: Request, res: Response) {
        try {
            const price = await ProductPriceService.updateProductPrice(parseInt(req.params.id as string), req.body);
            res.status(200).json({ success: true, data: price });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // GET /api/v1/productprice/lookup?product_id=xxx&price_type=RETAIL
    static async lookup(req: Request, res: Response) {
        try {
            const { product_id, price_type } = req.query;
            if (!product_id || !price_type) {
                return res.status(400).json({ success: false, message: 'product_id and price_type are required' });
            }
            const price = await ProductPriceService.getActivePrice(product_id as string, price_type as string);
            res.status(200).json({ success: true, data: price });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // DELETE /api/v1/productprice/:id
    static async remove(req: Request, res: Response) {
        try {
            await ProductPriceService.deleteProductPrice(parseInt(req.params.id as string));
            res.status(200).json({ success: true, message: 'Product price deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

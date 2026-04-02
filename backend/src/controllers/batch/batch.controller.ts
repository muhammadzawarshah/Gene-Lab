import { Request, Response } from 'express';
import { BatchService } from '../../services/batch.service.js';

export class BatchController {

    // GET /api/v1/batch
    static async list(req: Request, res: Response) {
        try {
            const batches = await BatchService.listBatches();
            res.status(200).json({ success: true, data: batches });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // GET /api/v1/batch/:id
    static async getOne(req: Request, res: Response) {
        try {
            const batch = await BatchService.getBatchById(parseInt(req.params.id as string));
            if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
            res.status(200).json({ success: true, data: batch });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // POST /api/v1/batch
    static async create(req: Request, res: Response) {
        try {
            const batch = await BatchService.createBatch(req.body);
            res.status(201).json({ success: true, data: batch });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // PUT /api/v1/batch/:id
    static async update(req: Request, res: Response) {
        try {
            const batch = await BatchService.updateBatch(parseInt(req.params.id as string), req.body);
            res.status(200).json({ success: true, data: batch });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }

    // DELETE /api/v1/batch/:id
    static async remove(req: Request, res: Response) {
        try {
            await BatchService.deleteBatch(parseInt(req.params.id as string));
            res.status(200).json({ success: true, message: 'Batch deleted successfully' });
        } catch (error: any) {
            res.status(400).json({ success: false, message: error.message });
        }
    }
}

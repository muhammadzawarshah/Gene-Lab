import { Request, Response } from 'express';
import { WarehouseService } from '../../services/warehouse.service.js';

export const createWarehouse = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    const { name, locationId, type } = req.body;
    const result = await WarehouseService.createWarehouse({ name, locationId, type });
    res.status(201).json({ success: true, data: result });
  } catch (error: any) {
    console.log(error)
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getWarehouses = async (_req: Request, res: Response) => {
  try {
    const result = await WarehouseService.listWarehouses();
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await WarehouseService.deleteWarehouse(Number(id));
    res.json({ success: true, message: "Warehouse purged successfully." });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateWarehouse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // URL se ID aye gi: /update/101
    const { name, locationId, type } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Warehouse ID is required" });
    }

    const updated = await WarehouseService.updateWarehouse(Number(id), { 
      name, 
      locationId, 
      type 
    });

    res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      data: updated
    });
  } catch (error: any) {
    console.error("Update Error:", error.message);
    res.status(400).json({ 
      success: false, 
      message: error.message || "Failed to update warehouse" 
    });
  }
};
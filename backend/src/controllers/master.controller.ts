import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

export class ERPController {

    private static buildUomPayload(body: any) {
        const name = String(body.name || '').trim().toUpperCase();
        const subUnitName = String(body.sub_unit_name || '').trim().toUpperCase();
        const rawConversion = body.conversion_to_base;
        const hasConversionValue = rawConversion !== undefined && rawConversion !== null && String(rawConversion).trim() !== '';
        const conversionToBase = hasConversionValue ? Number.parseFloat(String(rawConversion)) : null;

        if (!name) {
            throw Object.assign(new Error('UOM name is required.'), { statusCode: 400 });
        }

        if (subUnitName && !hasConversionValue) {
            throw Object.assign(new Error('Conversion value is required when sub unit is provided.'), { statusCode: 400 });
        }

        if (hasConversionValue && !subUnitName) {
            throw Object.assign(new Error('Sub unit is required when conversion value is provided.'), { statusCode: 400 });
        }

        if (hasConversionValue && (!Number.isFinite(conversionToBase as number) || (conversionToBase as number) <= 0)) {
            throw Object.assign(new Error('Conversion value must be greater than 0.'), { statusCode: 400 });
        }

        return {
            name,
            sub_unit_name: subUnitName || null,
            conversion_to_base: conversionToBase
        };
    }

    // ================= MASTER DATA =================

    static async createProduct(req: Request, res: Response, next: NextFunction) {
        try {
            // Destructure karein taake extra fields (jaise storage_temp) ignore ho jayein
            const { name, sku, uom_id, product_cat_id, brand } = req.body;

            const product = await prisma.product.create({
                data: {
                    product_id: uuidv4(),
                    name: name,
                    sku_code: sku, // Frontend ke 'sku' ko backend ke 'sku_code' mein map kiya
                    uom_id: Number(uom_id),
                    product_cat_id: product_cat_id ? Number(product_cat_id) : null,
                    brand: brand || null,
                    // Yahan 'storage_temp' ko humne ignore kar diya kyunki schema mein nahi hai
                }
            });

            res.status(201).json({ success: true, data: product });
        } catch (e) {
            console.error("Prisma Error:", e);
            next(e);
        }
    }

    static async addParty(req: Request, res: Response, next: NextFunction) {
        try {
            // Sirf wahi fields extract karein jo schema mein hain
            // 'organization' aur 'accessLevel' ko extract karke ignore kar diya
            const { name, email, phone, type, organization, accessLevel } = req.body;

            const party = await prisma.party.create({
                data: {
                    party_id: uuidv4(),
                    name: name,
                    email: email,
                    type: type || 'CUSTOMER', // Default to CUSTOMER if not provided
                    phone: phone || null
                }
            });

            res.status(201).json({ success: true, data: party });
        } catch (e) {
            console.error("Prisma Error Details:", e);
            next(e);
        }
    }

    static async createUOM(req: Request, res: Response, next: NextFunction) {
        try {
            const maxUOM = await prisma.uom.findFirst({ orderBy: { uom_id: 'desc' } });
            const nextId = (maxUOM?.uom_id || 0) + 1;
            const payload = ERPController.buildUomPayload(req.body);
            const uom = await prisma.uom.create({
                data: { uom_id: nextId, ...payload }
            });
            res.status(201).json({ success: true, data: uom });
        } catch (e) { next(e); }
    }

    static async getAllUOMs(req: Request, res: Response, next: NextFunction) {
        try {
            const uoms = await prisma.uom.findMany({
                orderBy: { uom_id: 'asc' },
                select: {
                    uom_id: true,
                    name: true,
                    sub_unit_name: true,
                    conversion_to_base: true
                }
            });
            res.json({ success: true, data: uoms });
        } catch (e) { next(e); }
    }

    static async updateUOM(req: Request, res: Response, next: NextFunction) {
        try {
            const payload = ERPController.buildUomPayload(req.body);
            const uom = await prisma.uom.update({
                where: { uom_id: parseInt(req.params.id as string) },
                data: payload
            });
            res.json({ success: true, data: uom });
        } catch (e) { next(e); }
    }

    static async deleteUOM(req: Request, res: Response, next: NextFunction) {
        try {
            await prisma.uom.delete({ where: { uom_id: parseInt(req.params.id as string) } });
            res.json({ success: true });
        } catch (e) { next(e); }
    }

    static async createMode(req: Request, res: Response, next: NextFunction) {
        try {
            const mode = await (prisma as any).productmode.create({ data: { name: req.body.name } });
            res.status(201).json({ success: true, data: mode });
        } catch (e) { next(e); }
    }

    static async getAllModes(req: Request, res: Response, next: NextFunction) {
        try {
            const modes = await (prisma as any).productmode.findMany({ orderBy: { mode_id: 'asc' } });
            res.json({ success: true, data: modes });
        } catch (e) { next(e); }
    }

    static async updateMode(req: Request, res: Response, next: NextFunction) {
        try {
            const mode = await (prisma as any).productmode.update({
                where: { mode_id: parseInt(req.params.id as string) },
                data: { name: req.body.name }
            });
            res.json({ success: true, data: mode });
        } catch (e) { next(e); }
    }

    static async deleteMode(req: Request, res: Response, next: NextFunction) {
        try {
            await (prisma as any).productmode.delete({ where: { mode_id: parseInt(req.params.id as string) } });
            res.json({ success: true });
        } catch (e) { next(e); }
    }


    static async createPurchaseOrder(req: Request, res: Response, next: NextFunction) {
        try {
            console.log(req.body);
            const { items, financials } = req.body;

            const productIds = (items || [])
                .map((item: any) => item.product_id)
                .filter(Boolean);

            const products = productIds.length
                ? await prisma.product.findMany({
                    where: {
                        product_id: {
                            in: productIds
                        }
                    },
                    select: {
                        product_id: true,
                        uom_id: true
                    }
                })
                : [];

            const productUomMap = new Map(products.map((product) => [product.product_id, product.uom_id]));

            const po = await prisma.purchaseorder.create({
                data: {
                    party: {
                        connect: { party_id: '11111111-1111-1111-1111-111111111111' }
                    },
                    order_date: new Date(),
                    status: 'APPROVED',

                    // PO table ka total amount (Frontend se aya hua netTotal)
                    total_amount: parseFloat(financials.netTotal),

                    purchaseorderline: {
                        create: items.map((item: any) => {
                            // Individual item ka logic
                            const qty = parseFloat(item.total_unit);
                            const rate = parseFloat(item.approved_rate);
                            const resolvedUomId = Number(item.uom_id) || productUomMap.get(item.product_id);

                            if (!resolvedUomId) {
                                throw new Error(`UOM not found for selected product ${item.product_id}.`);
                            }

                            // Item ka apna total (Quantity * Rate)
                            // Note: Agar tax/discount per-item hai toh yahan calculate hoga
                            const itemLineTotal = qty * rate;

                            return {
                                product_id: item.product_id,
                                quantity: qty,
                                uom_id: resolvedUomId,
                                tax_id: item.tax_id ? Number(item.tax_id) : null,
                                unit_price: rate,
                                line_total: itemLineTotal,
                                sale_price: item.sale_price ? parseFloat(item.sale_price) : null,
                                purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null,
                            };
                        })
                    }
                },
                include: {
                    purchaseorderline: true
                }
            });

            res.status(201).json({ success: true, data: po });
        } catch (e) {
            console.error("PO Creation Error:", e);
            next(e);
        }
    }
    // 4. Pick GRN: Get PO items to receive in warehouse
    static async pickGRN(req: Request, res: Response, next: NextFunction) {
        try {
            const po = await prisma.purchaseorder.findUnique({
                where: { po_id: Number(req.params.id) },
                include: { purchaseorderline: { include: { product: true } } }
            });
            res.json({ success: true, data: po });
        } catch (e) { next(e); }
    }

    static async getOpenPOs(req: Request, res: Response, next: NextFunction) {
        try {
            const openPOs = await prisma.purchaseorder.findMany({
                where: {
                    status: {
                        notIn: ['RECIEVED', 'CANCELLED']
                    }
                },
                include: {
                    party: {
                        select: { name: true }
                    }
                },
                orderBy: {
                    order_date: 'desc'
                }
            });

            // TypeScript ko batane ke liye ke humne 'party' include ki hai
            const formattedPOs = openPOs.map((po: any) => ({
                id: po.po_id,
                po_number: `PO-#${po.po_id}`,
                vendor_name: po.party?.name || "Unknown Supplier",
                date: po.order_date
            }));

            res.status(200).json({
                success: true,
                data: formattedPOs
            });
        } catch (error) {
            next(error);
        }
    }

    // 5. Stock: Receive Goods & Update Inventory
    static async receiveGoods(req: Request, res: Response, next: NextFunction) {
        try {
            const { po_id, warehouse_id, items } = req.body;

            // 1. Basic validation check
            if (!po_id || !warehouse_id || !items || !Array.isArray(items)) {
                return res.status(400).json({
                    success: false,
                    message: "Missing mandatory fields: po_id, warehouse_id, or items array."
                });
            }

            const result = await prisma.$transaction(async (tx) => {
                // 2. Create GRN Header
                const grn = await tx.grn.create({
                    data: {
                        po_id: Number(po_id),
                        received_date: new Date(),
                        status: 'RECEIVED'
                    }
                });

                // 3. Update Inventory for each item
                for (const item of items) {
                    const qty = parseFloat(item.received_qty);

                    if (isNaN(qty)) continue; // Skip invalid quantities

                    await tx.stockitem.upsert({
                        where: {
                            product_id_warehouse_id: {
                                product_id: String(item.product_id),
                                warehouse_id: Number(warehouse_id)
                            }
                        },
                        update: {
                            quantity_on_hand: { increment: qty }
                        },
                        create: {
                            product_id: String(item.product_id),
                            warehouse_id: Number(warehouse_id),
                            quantity_on_hand: qty,
                            uom_id: item.uom_id || 'PCS'
                        }
                    });
                }
                return grn;
            });

            return res.status(200).json({
                success: true,
                message: "Stock Updated Successfully",
                data: result
            });

        } catch (error: any) {
            console.error("GRN_TRANSACTION_ERROR:", error);
            // Pass error to global error handler
            next(error);
        }
    }

    static async getPOItems(req: Request, res: Response, next: NextFunction) {
        try {
            const { po_id } = req.params;

            const poDetails = await prisma.purchaseorder.findUnique({
                where: { po_id: Number(po_id) },
                include: {
                    // Model mein relation ka naam 'purchaseorderline' hai
                    purchaseorderline: {
                        include: {
                            product: {
                                select: {
                                    product_id: true,
                                    name: true, // Product ka naam lene ke liye
                                }
                            },
                            uom: {
                                select: {
                                    name: true // Unit ka naam (e.g., KG, PCS)
                                }
                            }
                        }
                    },
                    party: { // Supplier ka naam bhi le lete hain display ke liye
                        select: {
                            name: true
                        }
                    }
                }
            });

            if (!poDetails) {
                return res.status(404).json({ success: false, message: "PO Not Found" });
            }

            // Response structure ko thoda saaf kar dete hain frontend ke liye
            const responseData = {
                po_id: poDetails.po_id,
                supplier: poDetails.party.name,
                items: poDetails.purchaseorderline.map(line => ({
                    product_id: line.product_id,
                    product_name: line.product.name,
                    quantity: line.quantity,
                    uom_name: line.uom.name,
                    uom_id: line.uom_id
                }))
            };

            res.json({ success: true, data: responseData });
        } catch (e) {
            console.error(e);
            next(e);
        }
    }
    // ================= LISTING & DROPDOWNS =================

    // Is method ko apne ERPController mein update karein
    static async getDropdowns(req: Request, res: Response, next: NextFunction) {
        try {
            const [products, parties, uoms, categories, warehouses, provinces, tax, batch, modes] = await Promise.all([
                prisma.product.findMany({ select: { product_id: true, name: true, sku_code: true } }),
                prisma.party.findMany(),
                prisma.uom.findMany({
                    orderBy: { uom_id: 'asc' },
                    select: {
                        uom_id: true,
                        name: true,
                        sub_unit_name: true,
                        conversion_to_base: true
                    }
                }),
                prisma.productcategory.findMany(),
                prisma.warehouse.findMany(),
                prisma.province.findMany(),
                prisma.tax.findMany(),
                prisma.batch.findMany({
                    include: {
                        batchitem: { include: { product: { select: { product_id: true, name: true, sku_code: true } } } },
                        province: { select: { province_id: true, name: true } }
                    },
                    orderBy: { batch_id: 'desc' }
                }),
                (prisma as any).productmode.findMany({ orderBy: { mode_id: 'asc' } }),
            ]);

            res.json({
                success: true,
                data: {
                    products,
                    parties,
                    uoms,
                    categories,
                    warehouses,
                    provinces,
                    tax,
                    batch,
                    modes
                }
            });
        } catch (e) {
            console.error("Dropdown Fetch Error:", e);
            next(e);
        }
    }


}

// src/workers/reporting.worker.ts
import mqEmitter from '../utils/eventEmitter.js';
import { prisma } from '../lib/prisma.js';

// Background Consumer
mqEmitter.on('GRN_COMPLETED', async (payload) => {
  const { grnId } = payload;
  
  // Logic: Calculate daily stock levels and update summary table
  const grnLines = await prisma.grnline.findMany({ where: { grn_id: grnId } });
  
  for (const line of grnLines) {
    // Reporting Table: stock_summary_daily update logic
    await prisma.$executeRaw`
      INSERT INTO stock_summary_daily (product_id, date, total_received)
      VALUES (${line.product_id}, CURRENT_DATE, ${line.received_qty})
      ON CONFLICT (product_id, date) 
      DO UPDATE SET total_received = stock_summary_daily.total_received + ${line.received_qty}
    `;
  }
  console.log(`[REPORTING WORKER]: Stock Summary updated for GRN ${grnId}`);
});
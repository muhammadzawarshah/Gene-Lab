// src/lib/prisma.ts
import "dotenv/config";
import pg from '../../node_modules/@types/pg/index.js';
import { PrismaPg } from '../../node_modules/@prisma/adapter-pg/dist/index.js';
import { PrismaClient } from '@prisma/client';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Base client ko explicitly cast karein
const basePrisma = new PrismaClient({ adapter });

const restrictedModels = [
  'journalentry', 
  'journalline', 
  'stockitem', 
  'customerinvoice', 
  'supplierinvoice', 
  'payment',
  'user' // Security ke liye user ko bhi yahan add kar dena chahiye
];

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (
          restrictedModels.includes(model.toLowerCase()) && 
          (operation === 'delete' || operation === 'deleteMany')
        ) {
          throw new Error(`Hard delete is forbidden on model "${model}".`);
        }
        return query(args);
      },
    },
  },
});
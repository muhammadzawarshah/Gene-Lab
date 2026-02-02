import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';

export class PartyService {
  // 1. Party Create (Customer/Supplier)
  static async createParty(data: any) {
    return await prisma.party.create({
      data: {
        party_id: uuidv4(),
        name: data.name,
        type: data.type, // 'CUSTOMER', 'SUPPLIER', 'BOTH'
        email: data.email,
        phone: data.phone,
        tax_id: data.tax_id ? parseInt(data.tax_id) : null,
        // Address nested create kar rahe hain
        addresses: {
          create: {
            line1: data.address_line1,
            city: data.city,
            country: data.country,
            postal_code: data.postal_code
          } as any
        }
      },
      include: { addresses: true }
    });
  }

  // 2. List Parties by Type (e.g. Sirf Customers dikhane ke liye)
  static async getPartiesByType(type: 'CUSTOMER' | 'SUPPLIER' | 'BOTH') {
    return await prisma.party.findMany({
      where: {
        OR: [
          { type: type },
          { type: 'BOTH' }
        ]
      },
      include: {
        addresses: true,
        _count: {
          select: { 
            customerinvoice: type === 'CUSTOMER', 
            purchaseorder: type === 'SUPPLIER' 
          }
        }
      }
    });
  }

  // 3. Get Single Party Details
  static async getPartyById(id: string) {
    return await prisma.party.findUnique({
      where: { party_id: id },
      include: { addresses: true, tax: true }
    });
  }
}
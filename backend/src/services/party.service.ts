import { prisma } from '../lib/prisma.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

export class PartyService {
  static async createParty(data: any) {
    return await prisma.$transaction(async (tx) => {
      let createdUserId = null;

      // If password provided, create user login
      if (data.password) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const newUser = await tx.user.create({
          data: {
            username: data.email || data.name.replace(/\s+/g, '').toLowerCase(),
            email: data.email,
            password: hashedPassword,
            role: 'WAREHOUSE_CUSTOMER', // Default role for distributor logins
          }
        });
        createdUserId = newUser.user_id;
      }

      return await tx.party.create({
        data: {
          party_id: uuidv4(),
          name: data.name,
          type: data.type, // 'CUSTOMER', 'SUPPLIER', 'BOTH'
          email: data.email,
          phone: data.phone,
          tax_id: data.tax_id ? parseInt(data.tax_id) : null,
          user_id: createdUserId,
          // Address nested create kar rahe hain
          addresses: {
            create: {
              address_id: Math.floor(Math.random() * 2147483647), // Generate random Int ID for address
              line1: data.address_line1,
              city: data.city,
              country: data.country,
              postal_code: data.postal_code
            } as any
          }
        },
        include: { addresses: true }
      });
    });
  }


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

  // 4. Update Party
  static async updateParty(id: string, data: any) {
    return await prisma.$transaction(async (tx) => {
      const party = await tx.party.findUnique({ where: { party_id: id } });
      if (!party) throw new Error('Party not found');

      let currentUserId = party.user_id;

      // Update or create user if password provided
      if (data.password) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        if (currentUserId) {
          // Update existing user
          await tx.user.update({
            where: { user_id: currentUserId },
            data: { password: hashedPassword, email: data.email }
          });
        } else {
          // Create new user for existing party
          const newUser = await tx.user.create({
            data: {
              username: data.email || data.name.replace(/\s+/g, '').toLowerCase(),
              email: data.email,
              password: hashedPassword,
              role: 'WAREHOUSE_CUSTOMER',
            }
          });
          currentUserId = newUser.user_id;
        }
      } else if (currentUserId && data.email) {
        // Sync email if user exists
        await tx.user.update({
          where: { user_id: currentUserId },
          data: { email: data.email }
        });
      }

      return await tx.party.update({
        where: { party_id: id },
        data: {
          name:    data.name,
          email:   data.email,
          phone:   data.phone,
          tax_id:  data.tax_id ? parseInt(data.tax_id) : undefined,
          user_id: currentUserId,
          ...(data.address_line1 && {
            addresses: {
              updateMany: {
                where: { party_id: id },
                data: {
                  line1:       data.address_line1,
                  city:        data.city,
                  country:     data.country,
                  postal_code: data.postal_code
                }
              }
            }
          })
        },
        include: { addresses: true }
      });
    });
  }

  // 5. Delete Party
  static async deleteParty(id: string) {
    const linked = await prisma.salesorder.count({ where: { party_id_customer: id } });
    if (linked > 0) throw new Error('PARTY_HAS_ORDERS: Cannot delete a distributor with existing orders.');
    await prisma.addresses.deleteMany({ where: { party_id: id } });
    return await prisma.party.delete({ where: { party_id: id } });
  }
}